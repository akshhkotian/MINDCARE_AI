import api from './api';

// In-memory runtime cache for 0ms lookup
const memoryCache = new Map();

/**
 * Translates text into targetLang using the MindCare Translation API.
 * 1. Checks in-memory cache
 * 2. Checks localStorage cache
 * 3. Calls MindCare Backend API (/api/translate)
 * 4. Fallback: Direct Google Translate free endpoint
 */
export async function fetchApiTranslation(text, targetLang, sourceLang = 'en') {
  if (!text || !text.trim() || targetLang === 'en' || targetLang === sourceLang) {
    return text;
  }

  const trimmed = text.trim();
  const cacheKey = `${sourceLang}_${targetLang}_${trimmed}`;

  // 1. Memory Cache
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey);
  }

  // 2. LocalStorage Cache
  const lsKey = `mc_trans_${targetLang}`;
  let lsCache = {};
  try {
    const raw = localStorage.getItem(lsKey);
    if (raw) lsCache = JSON.parse(raw);
    if (lsCache[trimmed]) {
      memoryCache.set(cacheKey, lsCache[trimmed]);
      return lsCache[trimmed];
    }
  } catch (e) {
    // Ignore storage parse errors
  }

  // 3. Call MindCare Backend Translation API
  try {
    const res = await api.post('/translate', {
      text: trimmed,
      target_lang: targetLang,
      source_lang: sourceLang
    });
    if (res?.data?.translated) {
      const translated = res.data.translated;
      memoryCache.set(cacheKey, translated);
      lsCache[trimmed] = translated;
      try { localStorage.setItem(lsKey, JSON.stringify(lsCache)); } catch (e) {}
      return translated;
    }
  } catch (backendErr) {
    console.warn("Backend translation API offline or slow, attempting direct translation API...", backendErr);
  }

  // 4. Client-side Google Translate direct fallback
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(trimmed)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data && data[0]) {
        const translated = data[0].map(s => s ? s[0] : '').join('');
        if (translated) {
          memoryCache.set(cacheKey, translated);
          lsCache[trimmed] = translated;
          try { localStorage.setItem(lsKey, JSON.stringify(lsCache)); } catch (e) {}
          return translated;
        }
      }
    }
  } catch (clientErr) {
    console.warn("Client translation fallback warning:", clientErr);
  }

  return text;
}

/**
 * Translates an array of texts in batch
 */
export async function fetchApiTranslationBatch(texts, targetLang, sourceLang = 'en') {
  if (!texts || !texts.length || targetLang === 'en') {
    return texts;
  }

  const results = {};
  const missing = [];

  for (const text of texts) {
    const trimmed = text.trim();
    const cacheKey = `${sourceLang}_${targetLang}_${trimmed}`;
    if (memoryCache.has(cacheKey)) {
      results[trimmed] = memoryCache.get(cacheKey);
    } else {
      missing.push(trimmed);
    }
  }

  if (missing.length === 0) {
    return results;
  }

  try {
    const res = await api.post('/translate', {
      texts: missing,
      target_lang: targetLang,
      source_lang: sourceLang
    });
    if (res?.data?.translations) {
      const translations = res.data.translations;
      const lsKey = `mc_trans_${targetLang}`;
      let lsCache = {};
      try {
        const raw = localStorage.getItem(lsKey);
        if (raw) lsCache = JSON.parse(raw);
      } catch (e) {}

      for (const [orig, trans] of Object.entries(translations)) {
        memoryCache.set(`${sourceLang}_${targetLang}_${orig}`, trans);
        lsCache[orig] = trans;
        results[orig] = trans;
      }
      try { localStorage.setItem(lsKey, JSON.stringify(lsCache)); } catch (e) {}
    }
  } catch (err) {
    console.warn("Batch API translation warning:", err);
    // Fallback: translate individually
    await Promise.all(missing.map(async (item) => {
      results[item] = await fetchApiTranslation(item, targetLang, sourceLang);
    }));
  }

  return results;
}
