import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import apiTranslations from './api_translations.json';
import { fetchApiTranslation, fetchApiTranslationBatch } from '../services/translateAPI';
import { syncDomLanguage } from '../utils/nlpDomTranslator';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', voiceLang: 'en-IN', flag: '🇮🇳' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', voiceLang: 'hi-IN', flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', voiceLang: 'kn-IN', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', voiceLang: 'ta-IN', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', voiceLang: 'te-IN', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', voiceLang: 'bn-IN', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', voiceLang: 'mr-IN', flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', voiceLang: 'gu-IN', flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', voiceLang: 'ml-IN', flag: '🇮🇳' }
];

export const translations = apiTranslations;

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [currentLanguageCode, setCurrentLanguageCode] = useState(() => {
    return localStorage.getItem('mindcare_lang') || 'en';
  });

  // Dynamic on-demand translation cache for custom user-generated strings
  const [dynamicTranslations, setDynamicTranslations] = useState({});

  const currentLanguage = SUPPORTED_LANGUAGES.find(l => l.code === currentLanguageCode) || SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    syncDomLanguage(currentLanguageCode);
  }, [currentLanguageCode]);

  const changeLanguage = (code) => {
    if (SUPPORTED_LANGUAGES.some(l => l.code === code)) {
      setCurrentLanguageCode(code);
      localStorage.setItem('mindcare_lang', code);
      syncDomLanguage(code);
    }
  };

  /**
   * Translates a dictionary key or text string.
   * If not in pre-compiled API dictionary, requests it from Translation API on-the-fly.
   */
  const t = useCallback((key, fallback = '') => {
    if (currentLanguageCode === 'en') {
      return fallback || key;
    }

    // 1. Check official pre-compiled API dictionary
    const langDict = apiTranslations[currentLanguageCode];
    if (langDict && langDict[key] !== undefined) {
      return langDict[key];
    }

    // 2. Check if reverse lookup matches an English value in the dictionary
    const enDict = apiTranslations.en;
    if (enDict && langDict) {
      for (const [k, v] of Object.entries(enDict)) {
        if (v === key || v === fallback) {
          if (langDict[k]) return langDict[k];
        }
      }
    }

    // 3. Check dynamic runtime API cache
    const cacheKey = `${currentLanguageCode}_${fallback || key}`;
    if (dynamicTranslations[cacheKey]) {
      return dynamicTranslations[cacheKey];
    }

    // 4. Check localStorage cache
    try {
      const lsRaw = localStorage.getItem(`mc_trans_${currentLanguageCode}`);
      if (lsRaw) {
        const lsCache = JSON.parse(lsRaw);
        if (lsCache[fallback || key]) {
          return lsCache[fallback || key];
        }
      }
    } catch (e) {}

    // 5. On-the-fly asynchronous fetch via MindCare Translation API
    const textToTranslate = fallback || key;
    if (textToTranslate && textToTranslate.trim()) {
      fetchApiTranslation(textToTranslate, currentLanguageCode).then(translated => {
        if (translated && translated !== textToTranslate) {
          setDynamicTranslations(prev => ({
            ...prev,
            [cacheKey]: translated
          }));
        }
      });
    }

    return fallback || key;
  }, [currentLanguageCode, dynamicTranslations]);

  /**
   * Async translation method for dynamic user text (e.g. custom reminders, notes)
   */
  const translateAsync = useCallback(async (text, targetLang) => {
    const lang = targetLang || currentLanguageCode;
    return await fetchApiTranslation(text, lang);
  }, [currentLanguageCode]);

  /**
   * Batch async translation method
   */
  const translateBatchAsync = useCallback(async (texts, targetLang) => {
    const lang = targetLang || currentLanguageCode;
    return await fetchApiTranslationBatch(texts, lang);
  }, [currentLanguageCode]);

  return (
    <LanguageContext.Provider value={{
      language: currentLanguageCode,
      currentLanguageCode,
      currentLanguage,
      supportedLanguages: SUPPORTED_LANGUAGES,
      changeLanguage,
      t,
      translateAsync,
      translateBatchAsync
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
