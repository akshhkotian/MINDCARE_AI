import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVoice } from '../context/VoiceContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const parseVoiceCommand = (rawText, role = 'patient') => {
  if (!rawText) return null;
  const text = rawText.toLowerCase().trim();

  // 1. Familiar Faces, Family, and People (English & Indic Phrasing)
  if (
    text.includes('familiar face') ||
    text.includes('familiar faces') ||
    text.includes('face') ||
    text.includes('faces') ||
    text.includes('family') ||
    text.includes('relatives') ||
    text.includes('photo') ||
    text.includes('photos') ||
    text.includes('people') ||
    text.includes('who is this') ||
    text.includes('children') ||
    text.includes('son') ||
    text.includes('daughter') ||
    // Hindi
    text.includes('चेहरा') ||
    text.includes('चेहरे') ||
    text.includes('परिवार') ||
    text.includes('रिश्तेदार') ||
    text.includes('तस्वीर') ||
    text.includes('लोग') ||
    // Kannada
    text.includes('ಮುಖ') ||
    text.includes('ಮುಖಗಳು') ||
    text.includes('ಕುಟುಂಬ') ||
    text.includes('ಜನರು') ||
    text.includes('ಫೋಟೋ') ||
    // Tamil
    text.includes('முகம்') ||
    text.includes('முகங்கள்') ||
    text.includes('குடும்பம்') ||
    text.includes('மக்கள்') ||
    text.includes('புகைப்படம்') ||
    // Telugu
    text.includes('ముఖం') ||
    text.includes('ముఖాలు') ||
    text.includes('కుటుంబం') ||
    text.includes('ప్రజలు') ||
    text.includes('ఫోటో') ||
    // Bengali
    text.includes('মুখ') ||
    text.includes('পরিবার') ||
    text.includes('মানুষ') ||
    text.includes('ছবি') ||
    // Marathi
    text.includes('चेहरा') ||
    text.includes('चेहरे') ||
    text.includes('कुटुंब') ||
    text.includes('माणसे') ||
    // Gujarati
    text.includes('ચહેરો') ||
    text.includes('ચહેરા') ||
    text.includes('કુટુંબ') ||
    text.includes('લોકો') ||
    // Malayalam
    text.includes('മുഖം') ||
    text.includes('മുഖങ്ങൾ') ||
    text.includes('കുടുംബം') ||
    text.includes('ആളുകൾ')
  ) {
    return {
      title: 'Familiar Faces',
      icon: 'bi-people-fill',
      route: role === 'caregiver' ? '/caregiver/familiar-faces' : '/patient/familiar-faces',
      speechKey: 'voiceOpeningFaces',
      speech: 'Opening Familiar Faces and family photos for you.'
    };
  }

  // 2. Reminders / Medicine / Tablets / Schedule / Pooja
  if (
    text.includes('reminder') ||
    text.includes('reminders') ||
    text.includes('medicine') ||
    text.includes('medicines') ||
    text.includes('medication') ||
    text.includes('pill') ||
    text.includes('pills') ||
    text.includes('tablet') ||
    text.includes('tablets') ||
    text.includes('capsule') ||
    text.includes('schedule') ||
    text.includes('alarm') ||
    text.includes('water') ||
    text.includes('puja') ||
    text.includes('pooja') ||
    text.includes('appointment') ||
    // Hindi
    text.includes('याद') ||
    text.includes('दवा') ||
    text.includes('दवाई') ||
    text.includes('दवाइयाँ') ||
    text.includes('गोली') ||
    text.includes('अलार्म') ||
    text.includes('पानी') ||
    // Kannada
    text.includes('ಜ್ಞಾಪನೆ') ||
    text.includes('ನೆನಪು') ||
    text.includes('ಮಾತ್ರೆ') ||
    text.includes('ಔಷಧಿ') ||
    text.includes('ವೇಳಾಪಟ್ಟಿ') ||
    text.includes('ಅಲಾರಾಂ') ||
    // Tamil
    text.includes('நினைவூட்டல்') ||
    text.includes('மருந்து') ||
    text.includes('மாத்திரை') ||
    text.includes('அட்டவணை') ||
    // Telugu
    text.includes('జ్ఞాపిక') ||
    text.includes('మందులు') ||
    text.includes('మాత్ర') ||
    text.includes('షెడ్యూల్') ||
    // Bengali
    text.includes('অনুস্মারক') ||
    text.includes('ওষুধ') ||
    text.includes('বড়ি') ||
    // Marathi
    text.includes('स्मरणपत्र') ||
    text.includes('औषध') ||
    text.includes('गोळी') ||
    // Gujarati
    text.includes('રિમાઇન્ડર') ||
    text.includes('દવા') ||
    text.includes('ગોળી') ||
    // Malayalam
    text.includes('ഓർമ്മപ്പെടുത്തൽ') ||
    text.includes('മരുന്ന്') ||
    text.includes('ഗുളിക')
  ) {
    return {
      title: 'Reminders & Medicines',
      icon: 'bi-alarm-fill',
      route: role === 'caregiver' ? '/caregiver/reminders' : '/patient/reminders',
      speechKey: 'voiceOpeningReminders',
      speech: 'Opening your daily schedule, medicines, and alerts.'
    };
  }

  // 3. Specific Games & Exercises
  if (
    text.includes('match') || 
    text.includes('matching') || 
    text.includes('card pair') || 
    text.includes('pairs') || 
    text.includes('मिलान') || 
    text.includes('ಹೊಂದಾಣಿಕೆ') ||
    text.includes('பொருத்துதல்') ||
    text.includes('మ్యాచింగ్') ||
    text.includes('মেলানো') ||
    text.includes('जुळवणी')
  ) {
    return {
      title: 'Memory Matching Game',
      icon: 'bi-grid-3x3-gap-fill',
      route: '/patient/activities/matching',
      speechKey: 'voiceStartingMatching',
      speech: 'Starting the Memory Matching card game!'
    };
  }

  if (
    text.includes('picture recall') || 
    text.includes('picture game') || 
    text.includes('recall picture') || 
    text.includes('चित्र') || 
    text.includes('ಚಿತ್ರ') ||
    text.includes('படம்') ||
    text.includes('చిత్రం') ||
    text.includes('ছবি')
  ) {
    return {
      title: 'Picture Recall Activity',
      icon: 'bi-image-fill',
      route: '/patient/activities/picture-recall',
      speechKey: 'voiceStartingPicture',
      speech: 'Starting Picture Recall activity!'
    };
  }

  if (
    text.includes('sequence') || 
    text.includes('number pattern') || 
    text.includes('light sequence') || 
    text.includes('अनुक्रम') || 
    text.includes('ಸರಣಿ') ||
    text.includes('வரிசை') ||
    text.includes('వరుస') ||
    text.includes('ক্রম')
  ) {
    return {
      title: 'Sequence Memory Game',
      icon: 'bi-123',
      route: '/patient/activities/sequence',
      speechKey: 'voiceStartingSequence',
      speech: 'Starting Sequence Memory!'
    };
  }

  if (
    text.includes('object') || 
    text.includes('household') || 
    text.includes('item recognition') || 
    text.includes('वस्तु') || 
    text.includes('ವಸ್ತು') ||
    text.includes('பொருள்') ||
    text.includes('వస్తువు') ||
    text.includes('জিনিস')
  ) {
    return {
      title: 'Object Recognition',
      icon: 'bi-search',
      route: '/patient/activities/object-recognition',
      speechKey: 'voiceStartingObject',
      speech: 'Starting Object Recognition!'
    };
  }

  if (
    text.includes('word') || 
    text.includes('vocabulary') || 
    text.includes('words game') || 
    text.includes('शब्द') || 
    text.includes('ಪದ') ||
    text.includes('சொல்') ||
    text.includes('పదం') ||
    text.includes('শব্দ')
  ) {
    return {
      title: 'Word Memory Game',
      icon: 'bi-file-text-fill',
      route: '/patient/activities/word-memory',
      speechKey: 'voiceStartingWord',
      speech: 'Starting Word Memory activity!'
    };
  }

  if (text.includes('name and face') || text.includes('face game') || text.includes('guess face')) {
    return {
      title: 'Name & Face Recognition',
      icon: 'bi-person-bounding-box',
      route: '/patient/activities/name-face',
      speechKey: 'voiceStartingNameFace',
      speech: 'Starting Name and Face Recognition!'
    };
  }

  if (text.includes('event') || text.includes('routine') || text.includes('daily event') || text.includes('daily routine')) {
    return {
      title: 'Daily Event Sequencing',
      icon: 'bi-sort-numeric-down',
      route: '/patient/activities/event-sequence',
      speechKey: 'voiceStartingEvent',
      speech: 'Starting Daily Event Sequencing!'
    };
  }

  if (
    text.includes('puzzle') || 
    text.includes('puzzles') || 
    text.includes('odd one out') || 
    text.includes('पहेली') || 
    text.includes('ಒಗಟು') ||
    text.includes('புதிர்') ||
    text.includes('పజిల్') ||
    text.includes('ধাঁধা') ||
    text.includes('कोडे') ||
    text.includes('કોયડો')
  ) {
    return {
      title: 'Simple Puzzles',
      icon: 'bi-puzzle-fill',
      route: '/patient/activities/puzzles',
      speechKey: 'voiceStartingPuzzle',
      speech: 'Starting Simple Puzzles!'
    };
  }

  // 4. General Activities / Games / Brain Exercises
  if (
    text.includes('game') ||
    text.includes('games') ||
    text.includes('activity') ||
    text.includes('activities') ||
    text.includes('play') ||
    text.includes('exercise') ||
    text.includes('training') ||
    text.includes('brain') ||
    text.includes('खेल') ||
    text.includes('ಆಟ') ||
    text.includes('ಆಟಗಳು') ||
    text.includes('ವಿளையாட்டு') ||
    text.includes('ఆట') ||
    text.includes('খেলা') ||
    text.includes('उपक्रम') ||
    text.includes('રમત') ||
    text.includes('കളി')
  ) {
    return {
      title: 'Cognitive Activities',
      icon: 'bi-controller',
      route: '/patient/activities',
      speechKey: 'voiceOpeningActivities',
      speech: 'Opening brain training exercises and cognitive games!'
    };
  }

  // 5. Help / Caregiver / Emergency / SOS
  if (
    text.includes('help') ||
    text.includes('emergency') ||
    text.includes('call') ||
    text.includes('caregiver') ||
    text.includes('sos') ||
    text.includes('assist') ||
    text.includes('assistance') ||
    text.includes('support') ||
    text.includes('call doctor') ||
    text.includes('call son') ||
    text.includes('call daughter') ||
    text.includes('मदद') ||
    text.includes('सहायता') ||
    text.includes('ಸಹಾಯ') ||
    text.includes('ತುರ್ತು') ||
    text.includes('உதவி') ||
    text.includes('సహాయం') ||
    text.includes('সাহায্য') ||
    text.includes('मदत') ||
    text.includes('કટોકટી') ||
    text.includes('അടിയന്തിരം')
  ) {
    return {
      title: 'Help & Assistance',
      icon: 'bi-bell-fill',
      route: role === 'caregiver' ? '/caregiver/assistance' : '/patient/help',
      speechKey: 'voiceOpeningHelp',
      speech: 'Connecting you with your caregiver and family support.'
    };
  }

  // 6. Memory Cards / Personal Notes
  if (
    text.includes('memory card') ||
    text.includes('memory cards') ||
    text.includes('notes') ||
    text.includes('address') ||
    text.includes('my info') ||
    text.includes('personal') ||
    text.includes('स्मृति') ||
    text.includes('ನೆನಪು') ||
    text.includes('குறிப்பு')
  ) {
    return {
      title: 'Memory Cards & Notes',
      icon: 'bi-journal-bookmark-fill',
      route: role === 'caregiver' ? '/caregiver/memory' : '/patient/memory',
      speechKey: 'voiceOpeningMemory',
      speech: 'Opening your personal Memory Cards and Notes!'
    };
  }

  // 7. Progress / History / Scores
  if (
    text.includes('progress') ||
    text.includes('score') ||
    text.includes('scores') ||
    text.includes('report') ||
    text.includes('stat') ||
    text.includes('stats') ||
    text.includes('history') ||
    text.includes('प्रगति') ||
    text.includes('ಪ್ರಗತಿ') ||
    text.includes('முன்னேற்றம்') ||
    text.includes('పురోగతి') ||
    text.includes('অগ্রগতি')
  ) {
    return {
      title: 'Progress & Activity History',
      icon: 'bi-graph-up-arrow',
      route: '/patient/progress',
      speechKey: 'voiceOpeningProgress',
      speech: 'Opening your Progress and Activity Scores!'
    };
  }

  // 8. Home / Dashboard
  if (
    text.includes('home') ||
    text.includes('dashboard') ||
    text.includes('main') ||
    text.includes('menu') ||
    text.includes('start page') ||
    text.includes('होम') ||
    text.includes('घर') ||
    text.includes('ಮುಖಪುಟ') ||
    text.includes('ಮನೆ') ||
    text.includes('முகப்பு') ||
    text.includes('హోమ్') ||
    text.includes('বাড়ি') ||
    text.includes('मुख्यपृष्ठ') ||
    text.includes('ઘર') ||
    text.includes('ഹോം')
  ) {
    return {
      title: 'Home Dashboard',
      icon: 'bi-house-heart-fill',
      route: role === 'caregiver' ? '/caregiver/dashboard' : '/patient/dashboard',
      speechKey: 'voiceOpeningHome',
      speech: 'Taking you to the Home Dashboard!'
    };
  }

  // 9. Account / Profile
  if (
    text.includes('account') || 
    text.includes('profile') || 
    text.includes('settings') || 
    text.includes('खाता') || 
    text.includes('ಖಾತೆ') ||
    text.includes('கணக்கு') ||
    text.includes('ఖాతా') ||
    text.includes('অ্যাকাউন্ট')
  ) {
    return {
      title: 'Account Settings',
      icon: 'bi-person-circle',
      route: role === 'caregiver' ? '/caregiver/account' : '/patient/account',
      speechKey: 'voiceOpeningAccount',
      speech: 'Opening Account Settings!'
    };
  }

  // 10. Greetings (English & Indian Languages)
  if (
    text.includes('hello') || 
    text.includes('hi') || 
    text.includes('hey') || 
    text.includes('namaste') ||
    text.includes('namaskar') ||
    text.includes('namaskara') ||
    text.includes('vanakkam') ||
    text.includes('namaskaram') ||
    text.includes('pranam') ||
    text.includes('नमस्ते') || 
    text.includes('प्रणाम') || 
    text.includes('ನಮಸ್ಕಾರ') ||
    text.includes('வணக்கம்') ||
    text.includes('నమస్కారం') ||
    text.includes('নমস্কার') ||
    text.includes('नमस्कार')
  ) {
    return {
      title: 'Greeting',
      icon: 'bi-emoji-smile-fill',
      route: null,
      speechKey: 'voiceGreetingResponse',
      speech: "Namaste! How can I assist you today? You can say 'Familiar Faces', 'Reminders', 'Play Games', or 'Help'."
    };
  }

  return null;
};

const VoiceAssistant = () => {
  const { 
    speechEnabled, 
    toggleSpeech, 
    startListening, 
    stopListening, 
    isListening, 
    speakInstruction,
    activeIndicVoice,
    testIndicVoice,
    isPlayingTest,
    preferredGender,
    setPreferredGender
  } = useVoice();
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [showPanel, setShowPanel] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState('idle'); // 'listening', 'success', 'unrecognized', 'error'
  const [matchedAction, setMatchedAction] = useState(null);

  // Auto-dismiss panel after successful navigation
  useEffect(() => {
    let timer;
    if (feedbackStatus === 'success' && matchedAction?.route) {
      timer = setTimeout(() => {
        setShowPanel(false);
        setFeedbackStatus('idle');
        setMatchedAction(null);
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [feedbackStatus, matchedAction]);

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
      setFeedbackStatus('idle');
      return;
    }

    setShowPanel(true);
    setSpokenText('');
    setMatchedAction(null);
    setFeedbackStatus('listening');
    setFeedbackMsg(t('sayWhereToGo', 'Listening... Say where you want to go (e.g. Familiar Faces, Medicines, Games, or Help)'));

    startListening(
      (recognizedText) => {
        setSpokenText(recognizedText);
        const match = parseVoiceCommand(recognizedText, user?.role || 'patient');

        if (match) {
          const localizedSpeech = match.speechKey ? t(match.speechKey, match.speech) : match.speech;
          const matchWithLocalized = { ...match, speech: localizedSpeech };
          setMatchedAction(matchWithLocalized);
          setFeedbackStatus('success');
          setFeedbackMsg(localizedSpeech);
          speakInstruction(localizedSpeech);

          if (match.route) {
            setTimeout(() => {
              navigate(match.route);
            }, 1000);
          }
        } else {
          setFeedbackStatus('unrecognized');
          const promptTemplate = t('voiceUnrecognizedPrompt', 'I heard "{text}". Try saying "Familiar Faces", "Medicines", or "Games".');
          const prompt = promptTemplate.replace('{text}', recognizedText);
          setFeedbackMsg(prompt);
          speakInstruction(prompt);
        }
      },
      (error) => {
        if (error === 'no-speech') {
          setFeedbackStatus('error');
          const noSpeechMsg = t('voiceNoSpeechDetected', 'No speech detected. Please tap the mic and speak again!');
          setFeedbackMsg(noSpeechMsg);
          speakInstruction(noSpeechMsg);
        } else {
          setFeedbackStatus('error');
          const endMsg = t('voiceSearchEnded', 'Voice search paused. Tap the mic to speak again.');
          setFeedbackMsg(endMsg);
        }
      }
    );
  };

  const handleQuickDestination = (titleKey, defaultTitle, route, speechKey, defaultSpeech) => {
    const title = t(titleKey, defaultTitle);
    const speech = t(speechKey, defaultSpeech);
    setSpokenText(title);
    setFeedbackStatus('success');
    setFeedbackMsg(speech);
    speakInstruction(speech);
    setTimeout(() => {
      navigate(route);
      setShowPanel(false);
      setFeedbackStatus('idle');
    }, 800);
  };

  return (
    <div className="voice-widget d-flex flex-column align-items-end gap-2">
      {/* Interactive Voice Assistant Popover Panel */}
      {showPanel && (
        <div 
          className="card border-rose shadow-lg rounded-4 p-3 mb-2 bg-white voice-panel animate-fade-in"
          style={{ width: '340px', maxWidth: '92vw' }}
        >
          <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
            <div className="d-flex align-items-center gap-2">
              <span className={`badge rounded-pill ${isListening ? 'bg-danger animate-pulse' : 'bg-rose text-white'} px-2 py-1`}>
                <i className={`bi ${isListening ? 'bi-mic-fill' : 'bi-mic'} me-1`}></i>
                {isListening ? t('voiceListening', 'Listening...') : 'Indic Voice'}
              </span>
              <span className="fw-bold fs-6 text-dark">{t('voiceAssistantTitle', 'Indic Voice Assistant')}</span>
            </div>
            <button 
              type="button" 
              className="btn-close" 
              onClick={() => {
                setShowPanel(false);
                if (isListening) stopListening();
              }}
              aria-label="Close voice assistant"
            ></button>
          </div>

          {/* Active Indic Voice Pill & Quick Preview */}
          <div className="p-2 mb-2 bg-rose-light rounded-3 border border-rose d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-1 text-truncate">
              <span className="fs-6">🇮🇳</span>
              <span className="fs-7 fw-bold text-dark text-truncate" title={activeIndicVoice?.name || 'Indic TTS Voice'}>
                {activeIndicVoice ? activeIndicVoice.name.split('-')[0].trim() : 'Native Indic Voice'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => testIndicVoice()}
              disabled={isPlayingTest}
              className="btn btn-xs btn-outline-danger rounded-pill px-2 py-1 fs-7 fw-bold bg-white text-nowrap"
              title="Click to preview native Indic voice"
            >
              <i className={`bi ${isPlayingTest ? 'bi-volume-up-fill animate-pulse text-danger' : 'bi-play-fill'} me-1`}></i>
              {isPlayingTest ? 'Testing...' : 'Test Voice'}
            </button>
          </div>

          {/* Spoken Text Display */}
          {spokenText && (
            <div className="bg-light p-2 rounded-3 mb-2 border text-start">
              <span className="text-muted fs-7 d-block">{t('youSaid', 'You said:')}</span>
              <strong className="text-dark fs-5">"{spokenText}"</strong>
            </div>
          )}

          {/* Status Message */}
          <div className="my-2 text-start">
            {feedbackStatus === 'listening' && (
              <div className="text-danger fw-bold fs-6 d-flex align-items-center gap-2">
                <span className="spinner-grow spinner-grow-sm text-danger" role="status"></span>
                <span>{t('voiceListening', 'Listening... speak now')}</span>
              </div>
            )}

            {feedbackStatus === 'success' && matchedAction && (
              <div className="alert alert-success p-2 mb-0 rounded-3 fs-6 fw-bold d-flex align-items-center gap-2">
                <i className={`bi ${matchedAction.icon || 'bi-check-circle-fill'} fs-4 text-success`}></i>
                <div>
                  <div>{matchedAction.speech}</div>
                  <div className="fs-7 text-muted font-normal">{t('navigatingNow', 'Navigating now...')}</div>
                </div>
              </div>
            )}

            {feedbackStatus === 'unrecognized' && (
              <div className="alert alert-warning p-2 mb-0 rounded-3 fs-7 fw-bold">
                <i className="bi bi-question-circle-fill me-1 text-warning"></i>
                {feedbackMsg}
              </div>
            )}

            {feedbackStatus === 'error' && (
              <div className="alert alert-secondary p-2 mb-0 rounded-3 fs-7">
                <i className="bi bi-info-circle me-1"></i>
                {feedbackMsg}
              </div>
            )}
          </div>

          {/* Quick Voice Shortcut Chips */}
          <div className="mt-2 pt-2 border-top text-start">
            <span className="text-muted fs-7 d-block mb-1">{t('tapWhereToGo', 'Or tap where to go:')}</span>
            <div className="d-flex flex-wrap gap-1">
              <button 
                onClick={() => handleQuickDestination('familiarFaces', 'Familiar Faces', '/patient/familiar-faces', 'voiceOpeningFaces', 'Opening Familiar Faces and family photos for you.')}
                className="btn btn-sm btn-outline-danger rounded-pill px-2 py-1 fs-7 fw-bold"
              >
                👥 {t('familiarFaces', 'Familiar Faces')}
              </button>
              <button 
                onClick={() => handleQuickDestination('reminders', 'Medicines', '/patient/reminders', 'voiceOpeningReminders', 'Opening your daily schedule, medicines, and alerts.')}
                className="btn btn-sm btn-outline-danger rounded-pill px-2 py-1 fs-7 fw-bold"
              >
                ⏰ {t('reminders', 'Medicines')}
              </button>
              <button 
                onClick={() => handleQuickDestination('activities', 'Games', '/patient/activities', 'voiceOpeningActivities', 'Opening brain exercises and cognitive games!')}
                className="btn btn-sm btn-outline-danger rounded-pill px-2 py-1 fs-7 fw-bold"
              >
                🎮 {t('activities', 'Games')}
              </button>
              <button 
                onClick={() => handleQuickDestination('emergencyHelp', 'Help', '/patient/help', 'voiceOpeningHelp', 'Connecting you with your caregiver and family support.')}
                className="btn btn-sm btn-outline-danger rounded-pill px-2 py-1 fs-7 fw-bold"
              >
                🆘 {t('emergencyHelp', 'Help')}
              </button>
              <button 
                onClick={() => handleQuickDestination('home', 'Home', '/patient/dashboard', 'voiceOpeningHome', 'Taking you to Home Dashboard!')}
                className="btn btn-sm btn-outline-secondary rounded-pill px-2 py-1 fs-7"
              >
                🏠 {t('home', 'Home')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Microphone Action Button */}
      <button 
        className={`voice-btn ${isListening ? 'listening' : ''}`}
        onClick={handleMicClick}
        title={isListening ? t('voiceStopListening', "Listening... Click to stop") : t('voiceTapToSpeak', "Indic Voice Search - Click to speak")}
        aria-label="Voice Search"
      >
        <i className={`bi ${isListening ? 'bi-mic-fill' : 'bi-mic'}`}></i>
      </button>

      {/* Audio Guidance Toggle */}
      <button
        className="btn btn-sm btn-outline-secondary rounded-pill bg-white shadow-sm px-3 py-1 text-dark"
        onClick={toggleSpeech}
        title={t('voiceGuidance', 'Toggle voice guidance audio')}
      >
        <i className={`bi ${speechEnabled ? 'bi-volume-up-fill text-primary' : 'bi-volume-mute-fill text-muted'} me-1`}></i>
        {speechEnabled ? t('voiceTurnOff', 'Mute Voice') : t('voiceTurnOn', 'Turn Voice On')}
      </button>
    </div>
  );
};

export default VoiceAssistant;
