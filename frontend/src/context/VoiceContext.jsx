import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import { useLanguage } from './LanguageContext';

export const INDIC_VOICE_PROFILES = {
  'hi-IN': {
    code: 'hi-IN',
    name: 'हिन्दी (Hindi)',
    preferredNames: ['Swara', 'Madhur', 'Google हिन्दी', 'Kalpana', 'Hemant', 'hi-in', 'hindi'],
    sampleText: 'नमस्ते! माइंडकेयर एआई में आपका स्वागत है। मैं आपकी सहायता के लिए तैयार हूँ।'
  },
  'kn-IN': {
    code: 'kn-IN',
    name: 'ಕನ್ನಡ (Kannada)',
    preferredNames: ['Sapna', 'Gagan', 'Google ಕನ್ನಡ', 'kn-in', 'kannada'],
    sampleText: 'ನಮಸ್ಕಾರ! ಮೈಂಡ್‌ಕೇರ್ ಎಐಗೆ ಸುಸ್ವಾಗತ. ನಾನು ನಿಮ್ಮ ನೆನಪಿನ ಆರೈಕೆಗಾಗಿ ಸದಾ ನಿಮ್ಮೊಂದಿಗಿದ್ದೇನೆ.'
  },
  'ta-IN': {
    code: 'ta-IN',
    name: 'தமிழ் (Tamil)',
    preferredNames: ['Pallavi', 'Valluvar', 'Google தமிழ்', 'ta-in', 'tamil'],
    sampleText: 'வணக்கம்! மைண்ட்கேர் ஏஐ உங்களை அன்புடன் வரவேற்கிறது. உங்கள் பயிற்சிக்கு நான் உதவுகிறேன்.'
  },
  'te-IN': {
    code: 'te-IN',
    name: 'తెలుగు (Telugu)',
    preferredNames: ['Shruti', 'Mohan', 'Google తెలుగు', 'te-in', 'telugu'],
    sampleText: 'నమస్కారం! మైండ్‌కేర్ AIకి స్వాగతం. మీ జ్ఞాపకశక్తి వ్యాయామాలకు నేను తోడుగా ఉంటాను.'
  },
  'bn-IN': {
    code: 'bn-IN',
    name: 'বাংলা (Bengali)',
    preferredNames: ['Tanishaa', 'Bashkar', 'Google বাংলা', 'bn-in', 'bengali', 'bangla'],
    sampleText: 'নমস্কার! মাইন্ডকেয়ার এআই-তে স্বাগতম। আপনার স্মৃতির যত্নে আমি আপনার সাথে আছি।'
  },
  'mr-IN': {
    code: 'mr-IN',
    name: 'मराठी (Marathi)',
    preferredNames: ['Aarohi', 'Manohar', 'Google मराठी', 'mr-in', 'marathi'],
    sampleText: 'नमस्कार! माइंडकेअर एआय मध्ये आपले स्वागत आहे. मी आपल्या मदतीसाठी सदैव तयार आहे.'
  },
  'gu-IN': {
    code: 'gu-IN',
    name: 'ગુજરાતી (Gujarati)',
    preferredNames: ['Dhwani', 'Niranjan', 'Google ગુજરાતી', 'gu-in', 'gujarati'],
    sampleText: 'નમસ્તે! માઇન્ડકેર AI માં આપનું હાર્દિક સ્વાગત છે. હું તમારી સેવા માટે હાજર છું.'
  },
  'ml-IN': {
    code: 'ml-IN',
    name: 'മലയാളം (Malayalam)',
    preferredNames: ['Sobana', 'Midhun', 'Google മലയാളം', 'ml-in', 'malayalam'],
    sampleText: 'നമസ്കാരം! മൈൻഡ്കെയർ AI-ലേക്ക് സ്വാഗതം. നിങ്ങളുടെ ഓർമ്മശക്തി പരിശീലനത്തിന് ഞാൻ സഹായിക്കാം.'
  },
  'en-IN': {
    code: 'en-IN',
    name: 'English (India)',
    preferredNames: ['Neerja', 'Prabhat', 'Google English (India)', 'Ravi', 'Heera', 'Veena', 'en-in', 'india', 'indian'],
    sampleText: 'Namaste! Welcome to MindCare AI. I am your cognitive and memory care assistant.'
  }
};

const VoiceContext = createContext();

export const VoiceProvider = ({ children }) => {
  const { currentLanguage } = useLanguage();
  // Native Indian language voice code (e.g., 'en-IN', 'hi-IN', 'kn-IN', etc.)
  const voiceLangCode = currentLanguage?.voiceLang || 'en-IN';

  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [hasSupport, setHasSupport] = useState(true);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [preferredGender, setPreferredGender] = useState('female'); // 'female' | 'male' | 'any'
  const [isPlayingTest, setIsPlayingTest] = useState(false);

  const voicesRef = useRef([]);
  const recognitionRef = useRef(null);

  // Load and cache browser voices
  const loadVoices = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices() || [];
    if (voices.length > 0) {
      voicesRef.current = voices;
      setAvailableVoices(voices);
    }
  }, []);

  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setHasSupport(false);
      return;
    }

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [loadVoices]);

  // Indic voice ranker: scores each voice for authenticity, naturalness, and Indic suitability
  const rankVoiceForIndic = useCallback((voice, targetLangCode, gender) => {
    let score = 0;
    const vName = (voice.name || '').toLowerCase();
    const vLang = (voice.lang || '').toLowerCase().replace('_', '-');
    const target = (targetLangCode || 'en-IN').toLowerCase();
    const targetPrefix = target.split('-')[0];

    const profile = INDIC_VOICE_PROFILES[target] || INDIC_VOICE_PROFILES['en-IN'];
    const preferredNames = (profile?.preferredNames || []).map(n => n.toLowerCase());

    // 1. Exact language tag match (e.g. 'hi-in', 'kn-in', 'ta-in')
    if (vLang === target) {
      score += 120;
    } else if (vLang.startsWith(targetPrefix)) {
      score += 90;
    }

    // 2. High priority for specific Indic named voices (Neerja, Swara, Sapna, Pallavi, Google Indic, etc.)
    for (let i = 0; i < preferredNames.length; i++) {
      if (vName.includes(preferredNames[i])) {
        score += (80 - i * 8);
        break;
      }
    }

    // 3. Natural / Neural online voices have authentic human prosody and breathing
    if (vName.includes('natural') || vName.includes('online')) {
      score += 50;
    }

    // 4. Any Indian language tag or country identifier
    if (vLang.includes('in') || vName.includes('india') || vName.includes('indian')) {
      score += 40;
    }

    // 5. General Indic keyword recognition
    const allIndicKeywords = [
      'hindi', 'हिन्दी', 'kannada', 'ಕನ್ನಡ', 'tamil', 'தமிழ்', 
      'telugu', 'తెలుగు', 'bengali', 'বাংলা', 'marathi', 'मराठी', 
      'gujarati', 'ગુજરાતી', 'malayalam', 'മലയാളം', 'india', 
      'neerja', 'prabhat', 'swara', 'madhur', 'heera', 'ravi', 'veena',
      'sapna', 'gagan', 'pallavi', 'valluvar', 'shruti', 'mohan',
      'tanishaa', 'bashkar', 'aarohi', 'manohar', 'dhwani', 'niranjan',
      'sobana', 'midhun'
    ];
    if (allIndicKeywords.some(kw => vName.includes(kw) || vLang.includes(kw))) {
      score += 30;
    }

    // 6. Preferred Gender Match
    const femaleKeywords = ['female', 'neerja', 'swara', 'sapna', 'pallavi', 'shruti', 'aarohi', 'dhwani', 'sobana', 'heera', 'veena', 'kalpana', 'tanishaa'];
    const maleKeywords = ['male', 'prabhat', 'madhur', 'gagan', 'valluvar', 'mohan', 'manohar', 'niranjan', 'midhun', 'ravi', 'hemant', 'bashkar'];

    if (gender === 'female' && femaleKeywords.some(k => vName.includes(k))) {
      score += 25;
    } else if (gender === 'male' && maleKeywords.some(k => vName.includes(k))) {
      score += 25;
    }

    // 7. Heavily penalize non-Indic voices when we want an Indic accent
    const isIndic = vLang.includes('in') || vName.includes('india') || allIndicKeywords.some(kw => vName.includes(kw));
    if (!isIndic) {
      if (vLang.startsWith('en-us') || vLang.startsWith('en-gb') || vName.includes('david') || vName.includes('zira') || vName.includes('mark') || vName.includes('george') || vName.includes('hazel')) {
        score -= 100;
      }
    }

    return score;
  }, []);

  // Helper to find the best native Indian voice installed in the browser/OS
  const getBestIndianVoice = useCallback((targetLangCode, gender = preferredGender) => {
    const voices = voicesRef.current.length > 0 
      ? voicesRef.current 
      : (typeof window !== 'undefined' && window.speechSynthesis ? window.speechSynthesis.getVoices() : []);
    
    if (!voices || voices.length === 0) return null;

    const scoredVoices = voices.map(voice => ({
      voice,
      score: rankVoiceForIndic(voice, targetLangCode, gender)
    }));

    // Sort descending by Indic suitability score
    scoredVoices.sort((a, b) => b.score - a.score);

    const best = scoredVoices[0];
    // If the top scored voice has a positive score, use it
    if (best && best.score > 0) {
      return best.voice;
    }

    // Secondary fallback: look for any voice with 'in' or 'india'
    const anyIndic = voices.find(v => {
      const vLang = (v.lang || '').toLowerCase();
      const vName = (v.name || '').toLowerCase();
      return vLang.includes('in') || vName.includes('india') || vName.includes('hindi');
    });
    if (anyIndic) return anyIndic;

    // Last resort fallback
    return voices.find(v => v.default) || voices[0] || null;
  }, [preferredGender, rankVoiceForIndic]);

  // Current active Indic voice for the current language
  const activeIndicVoice = getBestIndianVoice(voiceLangCode);

  // Filter list of all Indian voices available in this browser
  const allDetectedIndicVoices = availableVoices.filter(v => {
    const vName = (v.name || '').toLowerCase();
    const vLang = (v.lang || '').toLowerCase().replace('_', '-');
    return (
      vLang.includes('-in') || 
      vLang === 'hi' || vLang === 'kn' || vLang === 'ta' || vLang === 'te' || vLang === 'bn' || vLang === 'mr' || vLang === 'gu' || vLang === 'ml' ||
      vName.includes('india') || vName.includes('hindi') || vName.includes('kannada') || vName.includes('tamil') ||
      vName.includes('telugu') || vName.includes('bengali') || vName.includes('marathi') || vName.includes('gujarati') ||
      vName.includes('malayalam') || vName.includes('neerja') || vName.includes('prabhat') || vName.includes('swara') ||
      vName.includes('madhur') || vName.includes('ravi') || vName.includes('heera')
    );
  });

  // Text-to-Speech helper in authentic Indic cadence
  const speakInstruction = useCallback((text, overrideLang) => {
    if (!speechEnabled || !('speechSynthesis' in window) || !text) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const targetLang = overrideLang || voiceLangCode || 'en-IN';
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Indic prosody: gentle, respectful, unhurried pace suitable for elders
    utterance.rate = 0.88;
    utterance.pitch = 1.02;
    utterance.lang = targetLang;

    // Assign the best Indian voice
    const voice = getBestIndianVoice(targetLang);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang || targetLang;
    }

    window.speechSynthesis.speak(utterance);
  }, [speechEnabled, voiceLangCode, getBestIndianVoice]);

  // Test current Indic voice with sample phrase
  const testIndicVoice = useCallback((langCode) => {
    const targetLang = langCode || voiceLangCode || 'en-IN';
    const profile = INDIC_VOICE_PROFILES[targetLang] || INDIC_VOICE_PROFILES['en-IN'];
    const sample = profile.sampleText;

    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    setIsPlayingTest(true);
    const utterance = new SpeechSynthesisUtterance(sample);
    utterance.rate = 0.88;
    utterance.pitch = 1.02;
    utterance.lang = targetLang;

    const voice = getBestIndianVoice(targetLang);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang || targetLang;
    }

    utterance.onend = () => setIsPlayingTest(false);
    utterance.onerror = () => setIsPlayingTest(false);

    window.speechSynthesis.speak(utterance);
  }, [voiceLangCode, getBestIndianVoice]);

  // Speech-to-Text helper (Mic input with native Indian language recognition)
  const startListening = useCallback((onResultCallback, onErrorCallback, overrideLang) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (onErrorCallback) onErrorCallback("not_supported");
      return;
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = false;
      // Configure speech recognition with Indian language locale
      recognition.lang = overrideLang || voiceLangCode || 'en-IN';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (e) => {
        console.error("Speech Recognition Error:", e);
        setIsListening(false);
        if (onErrorCallback) onErrorCallback(e.error);
      };

      recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        if (onResultCallback) {
          onResultCallback(text);
        }
      };

      recognition.start();
    } catch (err) {
      console.error("Error starting speech recognition:", err);
      setIsListening(false);
      if (onErrorCallback) onErrorCallback(err?.message || "error");
    }
  }, [voiceLangCode]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsListening(false);
    }
  }, []);

  const toggleSpeech = () => {
    if (speechEnabled) {
      window.speechSynthesis?.cancel();
    }
    setSpeechEnabled(!speechEnabled);
  };

  return (
    <VoiceContext.Provider value={{
      speechEnabled,
      toggleSpeech,
      speakInstruction,
      startListening,
      stopListening,
      isListening,
      transcript,
      hasSupport,
      voiceLangCode,
      availableVoices,
      activeIndicVoice,
      allDetectedIndicVoices,
      preferredGender,
      setPreferredGender,
      testIndicVoice,
      isPlayingTest,
      getBestIndianVoice
    }}>
      {children}
    </VoiceContext.Provider>
  );
};

export const useVoice = () => useContext(VoiceContext);
