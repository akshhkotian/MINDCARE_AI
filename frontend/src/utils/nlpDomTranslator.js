/**
 * MindCare AI - API-Driven Language Translation Module
 * Translates UI text and dynamic content cleanly via Machine Translation API
 * without corrupting React DOM nodes or performing fragile regex replacements.
 */
import apiTranslations from '../context/api_translations.json';
import { fetchApiTranslation } from '../services/translateAPI';

export const NLP_LANGUAGES = ['en', 'hi', 'kn', 'ta', 'te', 'bn', 'mr', 'gu', 'ml'];

export const NLP_DICTIONARY = apiTranslations;

/**
 * Clean, safe translation lookup for a text string.
 */
export function translateText(rawText, targetLang) {
  if (!rawText || targetLang === 'en') return rawText;

  const trimmed = rawText.trim();
  if (!trimmed) return rawText;

  // 1. Look up exact phrase in API translations dictionary
  if (apiTranslations[targetLang]) {
    // Check if trimmed matches any value or key in dictionary
    for (const [key, enVal] of Object.entries(apiTranslations.en || {})) {
      if (enVal === trimmed || key === trimmed) {
        const translated = apiTranslations[targetLang][key];
        if (translated) {
          return rawText.replace(trimmed, translated);
        }
      }
    }
  }

  // 2. Check localStorage API cache
  try {
    const raw = localStorage.getItem(`mc_trans_${targetLang}`);
    if (raw) {
      const cache = JSON.parse(raw);
      if (cache[trimmed]) {
        return rawText.replace(trimmed, cache[trimmed]);
      }
    }
  } catch (e) {}

  // Trigger async fetch for next render if not in cache
  fetchApiTranslation(trimmed, targetLang);

  return rawText;
}

/**
 * Synchronize document language and metadata cleanly.
 */
export function syncDomLanguage(langCode) {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = langCode || 'en';
  }
}
