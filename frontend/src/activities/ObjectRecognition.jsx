import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useVoice } from '../context/VoiceContext';
import { sessionsAPI } from '../services/api';
import LevelSelector from '../components/LevelSelector';

const MASTER_OBJECTS_POOL = [
  { emoji: '🍎', target: 'Apple' },
  { emoji: '🪑', target: 'Chair' },
  { emoji: '📚', target: 'Book' },
  { emoji: '🚗', target: 'Car' },
  { emoji: '⏰', target: 'Clock' },
  { emoji: '🌸', target: 'Flower' },
  { emoji: '☕', target: 'Teacup' },
  { emoji: '🚲', target: 'Bicycle' },
  { emoji: '🔑', target: 'Key' },
  { emoji: '🥑', target: 'Avocado' },
  { emoji: '🎸', target: 'Guitar' },
  { emoji: '📱', target: 'Phone' },
  { emoji: '👟', target: 'Shoe' },
  { emoji: '👓', target: 'Glasses' },
  { emoji: '🕯️', target: 'Candle' },
  { emoji: '🫖', target: 'Teapot' },
  { emoji: '🪴', target: 'Plant' },
  { emoji: '☂️', target: 'Umbrella' },
  { emoji: '📷', target: 'Camera' },
  { emoji: '🎨', target: 'Palette' },
  { emoji: '🍕', target: 'Pizza' },
  { emoji: '🎁', target: 'Gift' },
  { emoji: '🧸', target: 'Teddy' },
  { emoji: '🔔', target: 'Bell' }
];

const LEVEL_CONFIG = {
  1: { numItems: 2, numOptions: 3, diffName: 'Easy' },
  2: { numItems: 3, numOptions: 3, diffName: 'Easy' },
  3: { numItems: 3, numOptions: 4, diffName: 'Easy' },
  4: { numItems: 4, numOptions: 4, diffName: 'Medium' },
  5: { numItems: 5, numOptions: 4, diffName: 'Medium' },
  6: { numItems: 6, numOptions: 4, diffName: 'Medium' },
  7: { numItems: 7, numOptions: 4, diffName: 'Medium' },
  8: { numItems: 8, numOptions: 4, diffName: 'Hard' },
  9: { numItems: 9, numOptions: 5, diffName: 'Hard' },
  10: { numItems: 10, numOptions: 6, diffName: 'Hard' }
};

const getLevelFromDifficulty = (diff) => {
  if (!diff) return 1;
  const d = String(diff).toLowerCase();
  if (d === 'hard') return 8;
  if (d === 'medium') return 4;
  return 1;
};

const ObjectRecognition = () => {
  const { user } = useAuth();
  const { speakInstruction } = useVoice();
  const navigate = useNavigate();
  const location = useLocation();

  const [level, setLevel] = useState(1);
  const [maxUnlockedLevel, setMaxUnlockedLevel] = useState(() => {
    const saved = localStorage.getItem(`unlocked_lvl_${user?.id || 'guest'}_object_rec`);
    return saved ? parseInt(saved, 10) : 1;
  });
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [feedback, setFeedback] = useState(null); // { type: 'right'|'wrong', message: '' }
  const [completed, setCompleted] = useState(false);
  const [mlResult, setMlResult] = useState(null);
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    const initLvl = getLevelFromDifficulty(location.state?.difficulty);
    const startingLvl = Math.min(initLvl, maxUnlockedLevel);
    startLevel(startingLvl);
  }, []);

  useEffect(() => {
    let timer;
    if (completed && countdown !== null && countdown > 0) {
      timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
    } else if (completed && countdown === 0) {
      handleNextLevelOrActivity();
    }
    return () => clearTimeout(timer);
  }, [completed, countdown]);

  const generateLevelQuestions = (lvlNum) => {
    const cfg = LEVEL_CONFIG[lvlNum] || LEVEL_CONFIG[1];
    const shuffledPool = [...MASTER_OBJECTS_POOL].sort(() => Math.random() - 0.5);
    const selectedObjects = shuffledPool.slice(0, cfg.numItems);

    return selectedObjects.map((item) => {
      const otherNames = MASTER_OBJECTS_POOL
        .filter(o => o.target !== item.target)
        .map(o => o.target);
      
      const shuffledOthers = [...otherNames].sort(() => Math.random() - 0.5).slice(0, cfg.numOptions - 1);
      const options = [...shuffledOthers, item.target].sort(() => Math.random() - 0.5);

      return {
        emoji: item.emoji,
        target: item.target,
        options: options
      };
    });
  };

  const startLevel = (lvlNum) => {
    setLevel(lvlNum);
    const newQuestions = generateLevelQuestions(lvlNum);

    setQuestions(newQuestions);
    setCurrentIdx(0);
    setScore(0);
    setMistakes(0);
    setAttempts(0);
    setStartTime(Date.now());
    setSelectedOption(null);
    setFeedback(null);
    setCompleted(false);
    setMlResult(null);
    setCountdown(null);
    speakInstruction(`Starting Level ${lvlNum}. Identify the picture and select its correct name.`);
  };

  const handleSelect = async (opt) => {
    setSelectedOption(opt);
    setAttempts((prev) => prev + 1);
    const currentObj = questions[currentIdx];

    let newScore = score;
    let newMistakes = mistakes;

    if (opt === currentObj.target) {
      newScore += 25 * level;
      setScore(newScore);
      setFeedback({
        type: 'right',
        message: `🎉 Congratulations! Excellent job! That is a ${currentObj.target}.`
      });
      speakInstruction(`Congratulations! Correct! That is a ${currentObj.target}.`);

      if (currentIdx + 1 < questions.length) {
        setTimeout(() => {
          setCurrentIdx((prev) => prev + 1);
          setSelectedOption(null);
          setFeedback(null);
        }, 1500);
      } else {
        // Level finish
        finishLevel(newScore, newMistakes);
      }
    } else {
      newMistakes += 1;
      setMistakes(newMistakes);
      setFeedback({
        type: 'wrong',
        message: `Oh oh! That's not quite right. Give it another try!`
      });
      speakInstruction(`Oh oh, that's not quite right. Tap Try Again to try selecting again!`);
    }
  };

  const handleTryAgain = () => {
    setSelectedOption(null);
    setFeedback(null);
  };

  const finishLevel = async (finalScore, finalMistakes) => {
    setCompleted(true);
    setCountdown(5);
    const durationSeconds = Math.max(5, Math.round((Date.now() - startTime) / 1000));
    const totalPossible = questions.length * 25 * level;
    const accuracyVal = Math.round((finalScore / (totalPossible || 1)) * 100);
    const cfg = LEVEL_CONFIG[level];

    const isPassing = finalMistakes <= 1;
    const isDemoting = !isPassing && level > 1 && finalMistakes >= 3;
    const adaptLevel = isPassing ? Math.min(10, level + 1) : (isDemoting ? Math.max(1, level - 1) : level);

    if (isDemoting) {
      setMaxUnlockedLevel(adaptLevel);
      localStorage.setItem(`unlocked_lvl_${user?.id || 'guest'}_object_rec`, adaptLevel);
      speakInstruction(`Wonderful effort! You worked really hard. Let's take a gentle step back to Level ${adaptLevel} to practice together and build our confidence!`);
    } else if (isPassing) {
      speakInstruction(`Level ${level} complete! Advancing to the next level.`);
    } else {
      speakInstruction(`Good try on Level ${level}. Let's practice Level ${level} once more to strengthen your object recognition.`);
    }

    try {
      const res = await sessionsAPI.create({
        patient_id: user.id,
        activity_id: 4, // Object Recognition
        score: finalScore,
        accuracy: accuracyVal,
        completion_time: durationSeconds,
        mistakes: finalMistakes,
        attempts: attempts + 1,
        difficulty: cfg.diffName
      });
      setMlResult(res.data);
    } catch (err) {
      console.error("Session submit error:", err);
    }
  };

  const handleNextLevelOrActivity = () => {
    const isPassing = mistakes <= 1;
    const isDemoting = !isPassing && level > 1 && mistakes >= 3;

    if (isPassing) {
      const nextLvl = level + 1;
      if (nextLvl > maxUnlockedLevel && nextLvl <= 10) {
        setMaxUnlockedLevel(nextLvl);
        localStorage.setItem(`unlocked_lvl_${user?.id || 'guest'}_object_rec`, nextLvl);
      }
      if (level < 10) {
        startLevel(level + 1);
      } else {
        navigate('/patient/activities/word-memory');
      }
    } else if (isDemoting) {
      const adaptLevel = Math.max(1, level - 1);
      setMaxUnlockedLevel(adaptLevel);
      localStorage.setItem(`unlocked_lvl_${user?.id || 'guest'}_object_rec`, adaptLevel);
      startLevel(adaptLevel);
    } else {
      startLevel(level);
    }
  };

  const currentObj = questions[currentIdx] || { emoji: '❓', target: '', options: [] };

  return (
    <div className="container py-4 patient-view text-center">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h1 className="fw-extrabold text-rose mb-1">Activity 4: Object Recognition</h1>
          <p className="text-secondary fs-4 mb-0">Identify household items from pictures across multiple levels.</p>
        </div>

        {/* Multi-level selector */}
        <LevelSelector
          activityKey="object_rec"
          currentLevel={level}
          maxUnlockedLevel={maxUnlockedLevel}
          onSelectLevel={startLevel}
          speakInstruction={speakInstruction}
        />
      </div>

      {!completed ? (
        <div className="card patient-card p-5 shadow-lg my-4 border-rose position-relative">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <span className="badge bg-rose-light text-rose border border-rose fs-4 px-3 py-2 rounded-pill">
              Item {currentIdx + 1} of {questions.length} (Level {level})
            </span>
            <span className="badge bg-secondary fs-4 px-3 py-2 rounded-pill">
              Score: {score}
            </span>
          </div>

          <h2 className="fw-bold text-dark mb-3">What object is shown below?</h2>
          
          <div className="p-4 bg-rose-light border border-rose rounded-4 display-1 mb-4 my-3 d-inline-block px-5 shadow-sm">
            {currentObj.emoji}
          </div>

          {/* Feedback Banner */}
          {feedback && (
            <div className={`alert ${feedback.type === 'right' ? 'alert-success' : 'alert-danger'} fs-3 p-3 rounded-4 mb-4 fw-bold shadow-sm d-flex flex-column align-items-center justify-content-center gap-2`}>
              <div>{feedback.message}</div>
              {feedback.type === 'wrong' && (
                <button 
                  onClick={handleTryAgain}
                  className="btn patient-btn patient-btn-danger fs-4 px-4 py-2 mt-2"
                >
                  <i className="bi bi-arrow-counterclockwise me-2"></i> Try Again
                </button>
              )}
            </div>
          )}

          <div className="row g-4 justify-content-center">
            {currentObj.options.map((opt, i) => (
              <div key={i} className="col-md-6">
                <button
                  onClick={() => handleSelect(opt)}
                  disabled={selectedOption !== null && feedback?.type === 'right'}
                  className={`btn patient-btn w-100 py-4 fs-2 ${
                    selectedOption === opt
                      ? opt === currentObj.target ? 'patient-btn-success' : 'patient-btn-danger'
                      : 'btn-outline-danger'
                  }`}
                >
                  {opt}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (() => {
        const isPassing = mistakes <= 1;
        const isDemoting = !isPassing && level > 1 && mistakes >= 3;
        const adaptLevel = isPassing ? Math.min(10, level + 1) : (isDemoting ? Math.max(1, level - 1) : level);

        return (
          <div className="card patient-card border-success p-5 text-center shadow-lg my-4">
            {isDemoting ? (
              <>
                <i className="bi bi-heart-fill display-1 text-rose mb-2"></i>
                <h2 className="fw-bold text-rose display-5">🌟 Wonderful Effort on Level {level}!</h2>
                <p className="fs-4 text-muted mt-1 mb-2">Every practice helps keep our memory active and strong. 💛</p>
              </>
            ) : isPassing ? (
              <>
                <i className="bi bi-patch-check-fill display-1 text-success mb-2"></i>
                <h2 className="fw-bold text-success display-5">🎉 Level {level} Complete! Great Job!</h2>
              </>
            ) : (
              <>
                <i className="bi bi-star-fill display-1 text-warning mb-2"></i>
                <h2 className="fw-bold text-primary display-5">💛 Good Try on Level {level}!</h2>
                <p className="fs-4 text-muted mt-1 mb-2">Let's practice this level once more to build confidence.</p>
              </>
            )}

            <p className="fs-3 fw-bold mt-2">Score: {score} pts | Mistakes: {mistakes}</p>

            {mlResult && mlResult.recommendation && (
              <div className="alert alert-info fs-4 p-3 rounded-4 my-3">
                <i className="bi bi-info-circle-fill me-2"></i>
                {mlResult.recommendation.recommendation_reason || mlResult.recommendation.message}
              </div>
            )}

            {isDemoting ? (
              <div className="alert alert-warning fs-4 p-3 rounded-4 my-3 fw-bold border-warning d-flex align-items-center justify-content-center">
                <i className="bi bi-arrow-repeat me-2 fs-3 text-warning"></i>
                {`Wonderful effort! Let's take a gentle step back to Level ${adaptLevel} to practice together! Returning in ${countdown}s...`}
              </div>
            ) : isPassing ? (
              <div className="alert alert-success fs-4 p-3 rounded-4 my-3 fw-bold">
                <i className="bi bi-arrow-right-circle-fill me-2"></i>
                {level < 10 
                  ? `Advancing to Level ${level + 1} automatically in ${countdown}s...` 
                  : `Level 10 Mastered! Moving to Next Activity in ${countdown}s...`}
              </div>
            ) : (
              <div className="alert alert-info fs-4 p-3 rounded-4 my-3 fw-bold">
                <i className="bi bi-arrow-clockwise me-2"></i>
                {`Let's practice Level ${level} together once more! Replaying in ${countdown}s...`}
              </div>
            )}

            <div className="d-flex justify-content-center gap-3 mt-4 flex-wrap">
              {isDemoting ? (
                <>
                  <button 
                    onClick={handleNextLevelOrActivity} 
                    className="btn patient-btn patient-btn-primary fs-3 px-5 py-3"
                  >
                    Let's Practice Level ${adaptLevel} Now 🌿
                  </button>
                  <button onClick={() => navigate('/patient/activities')} className="btn patient-btn btn-outline-secondary fs-4">
                    All Activities
                  </button>
                </>
              ) : isPassing ? (
                <>
                  <button 
                    onClick={handleNextLevelOrActivity} 
                    className="btn patient-btn patient-btn-success fs-3 px-5 py-3"
                  >
                    {level < 10 ? `Go to Level ${level + 1} Now` : `Go to Next Activity Now`} <i className="bi bi-arrow-right-circle-fill ms-2"></i>
                  </button>
                  <button onClick={() => startLevel(level)} className="btn patient-btn btn-outline-secondary fs-4">
                    Replay Level {level}
                  </button>
                  <button onClick={() => navigate('/patient/activities')} className="btn patient-btn patient-btn-primary fs-4">
                    All Activities
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={handleNextLevelOrActivity} 
                    className="btn patient-btn patient-btn-primary fs-3 px-5 py-3"
                  >
                    Practice Level {level} Again <i className="bi bi-arrow-repeat ms-2"></i>
                  </button>
                  <button onClick={() => navigate('/patient/activities')} className="btn patient-btn btn-outline-secondary fs-4">
                    All Activities
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default ObjectRecognition;
