/**
 * MindCare AI - Google Neural Machine Translation (GNMT) DOM Engine
 * Translates complete sentences and phrases cleanly via GNMT API
 * without splitting words or breaking React DOM nodes.
 */
import apiTranslations from '../context/api_translations.json';
import { fetchApiTranslation } from '../services/translateAPI';

export const NLP_LANGUAGES = ['en', 'hi', 'kn', 'ta', 'te', 'bn', 'mr', 'gu', 'ml'];
export const NLP_DICTIONARY = apiTranslations;

let currentLang = 'en';
let observer = null;
let isTranslating = false;
let queuedNodes = new Set();
let debounceTimer = null;

// Build fast in-memory reverse lookup for instant 0ms full-phrase translation
const phraseMaps = {};
for (const lang of NLP_LANGUAGES) {
  if (lang === 'en') continue;
  phraseMaps[lang] = new Map();
  const langObj = apiTranslations[lang] || {};
  const enObj = apiTranslations.en || {};

  for (const [key, enVal] of Object.entries(enObj)) {
    if (langObj[key]) {
      const trimmedEn = String(enVal).trim();
      phraseMaps[lang].set(trimmedEn, langObj[key]);
      phraseMaps[lang].set(trimmedEn.toLowerCase(), langObj[key]);
    }
  }
}

/**
 * Checks if a string contains English/Latin characters to avoid re-translating Indic text.
 */
function hasLatinCharacters(str) {
  return /[a-zA-Z]/.test(str);
}

/**
 * Translates a clean text string using Google Neural Machine Translation lexicon and API.
 */
export function translateText(rawText, targetLang) {
  if (!rawText || targetLang === 'en' || !hasLatinCharacters(rawText)) {
    return rawText;
  }

  const trimmed = rawText.trim();
  if (trimmed.length < 2) return rawText;

  // 1. Instant check in pre-compiled GNMT dictionary
  const langMap = phraseMaps[targetLang];
  if (langMap) {
    if (langMap.has(trimmed)) {
      return rawText.replace(trimmed, langMap.get(trimmed));
    }
    if (langMap.has(trimmed.toLowerCase())) {
      return rawText.replace(trimmed, langMap.get(trimmed.toLowerCase()));
    }
  }

  // 2. Check localStorage GNMT cache
  try {
    const rawCache = localStorage.getItem(`mc_trans_${targetLang}`);
    if (rawCache) {
      const cache = JSON.parse(rawCache);
      if (cache[trimmed]) {
        return rawText.replace(trimmed, cache[trimmed]);
      }
    }
  } catch (e) {}

  // 3. Fallback: Trigger on-the-fly GNMT API fetch
  fetchApiTranslation(trimmed, targetLang);

  return rawText;
}

/**
 * Validates whether a DOM node is safe to translate
 */
function isNodeEligible(node) {
  if (!node || !node.parentElement) return false;
  const parent = node.parentElement;

  const tagName = parent.tagName ? parent.tagName.toLowerCase() : '';
  if (['script', 'style', 'code', 'pre', 'noscript', 'textarea'].includes(tagName)) {
    return false;
  }

  if (parent.closest('.notranslate, [translate="no"], select, option')) {
    return false;
  }

  const val = node.nodeValue;
  if (!val || val.trim().length < 2) return false;
  if (!hasLatinCharacters(val)) return false;

  return true;
}

/**
 * Translates a single DOM text node as a whole unit
 */
function translateNode(node, targetLang) {
  if (!node) return;

  if (node.__mc_orig === undefined) {
    node.__mc_orig = node.nodeValue;
  }

  if (targetLang === 'en') {
    if (node.nodeValue !== node.__mc_orig) {
      node.nodeValue = node.__mc_orig;
    }
    return;
  }

  const original = node.__mc_orig;
  const trimmed = original.trim();
  if (!trimmed || !hasLatinCharacters(trimmed)) return;

  // 1. Check in-memory GNMT dictionary
  const langMap = phraseMaps[targetLang];
  if (langMap && langMap.has(trimmed)) {
    const trans = langMap.get(trimmed);
    if (node.nodeValue !== trans) {
      node.nodeValue = original.replace(trimmed, trans);
    }
    return;
  }

  // 2. Check localStorage GNMT cache
  try {
    const rawCache = localStorage.getItem(`mc_trans_${targetLang}`);
    if (rawCache) {
      const cache = JSON.parse(rawCache);
      if (cache[trimmed]) {
        const trans = cache[trimmed];
        if (node.nodeValue !== trans) {
          node.nodeValue = original.replace(trimmed, trans);
        }
        return;
      }
    }
  } catch (e) {}

  // 3. Query GNMT API asynchronously and update node when ready
  fetchApiTranslation(trimmed, targetLang).then((translated) => {
    if (translated && translated !== trimmed && node.isConnected) {
      node.nodeValue = original.replace(trimmed, translated);
    }
  });
}

/**
 * Walk and translate all text nodes within root
 */
function processPendingNodes() {
  if (isTranslating) return;
  isTranslating = true;

  try {
    const root = document.getElementById('root') || document.body;
    if (!root) return;

    if (currentLang === 'en') {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        if (n.__mc_orig !== undefined && n.nodeValue !== n.__mc_orig) {
          n.nodeValue = n.__mc_orig;
        }
      }
      return;
    }

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        if (!isNodeEligible(n)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const list = [];
    let curr;
    while ((curr = walker.nextNode())) {
      list.push(curr);
    }

    for (const textNode of list) {
      translateNode(textNode, currentLang);
    }
  } finally {
    isTranslating = false;
  }
}

function scheduleTranslationPass() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(processPendingNodes);
    } else {
      setTimeout(processPendingNodes, 50);
    }
  }, 100);
}

/**
 * Synchronize document language and activate reactive GNMT observer
 */
export function syncDomLanguage(langCode) {
  currentLang = langCode || 'en';

  if (typeof document !== 'undefined') {
    document.documentElement.lang = currentLang;

    scheduleTranslationPass();

    if (!observer && typeof MutationObserver !== 'undefined') {
      observer = new MutationObserver((mutations) => {
        if (isTranslating || currentLang === 'en') return;

        let hasNewContent = false;
        for (const m of mutations) {
          if (m.type === 'childList' && m.addedNodes.length > 0) {
            hasNewContent = true;
            break;
          }
          if (m.type === 'characterData') {
            if (m.target && m.target.__mc_orig !== m.target.nodeValue) {
              m.target.__mc_orig = m.target.nodeValue;
              hasNewContent = true;
              break;
            }
          }
        }

        if (hasNewContent) {
          scheduleTranslationPass();
        }
      });

      const root = document.getElementById('root') || document.body;
      if (root) {
        observer.observe(root, {
          childList: true,
          subtree: true,
          characterData: true
        });
      }
    }
  }
}
