import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useVoice } from '../context/VoiceContext';
import { sessionsAPI } from '../services/api';
import LevelSelector from '../components/LevelSelector';

const MASTER_WORD_POOL = [
  'APPLE', 'BOOK', 'CHAIR', 'FLOWER', 'GARDEN', 'SUNSHINE',
  'RIVER', 'BICYCLE', 'TEACUP', 'MORNING', 'BLANKET', 'MUSIC',
  'SUMMER', 'FRIEND', 'WINDOW', 'BUTTERFLY', 'COFFEE', 'PILLOW',
  'HARMONY', 'KITCHEN', 'FAMILY', 'RAINBOW', 'DOCTOR', 'HONEY',
  'BREAD', 'MIRROR', 'PENCIL', 'BIRD', 'STAR', 'CANDLE'
];

const LEVEL_CONFIG = {
  1: { numWords: 2, timer: 9, totalOptions: 5, diffName: 'Easy' },
  2: { numWords: 2, timer: 8, totalOptions: 6, diffName: 'Easy' },
  3: { numWords: 3, timer: 7, totalOptions: 6, diffName: 'Easy' },
  4: { numWords: 3, timer: 7, totalOptions: 8, diffName: 'Medium' },
  5: { numWords: 4, timer: 6, totalOptions: 8, diffName: 'Medium' },
  6: { numWords: 4, timer: 6, totalOptions: 10, diffName: 'Medium' },
  7: { numWords: 5, timer: 5, totalOptions: 10, diffName: 'Medium' },
  8: { numWords: 5, timer: 5, totalOptions: 12, diffName: 'Hard' },
  9: { numWords: 6, timer: 4, totalOptions: 12, diffName: 'Hard' },
  10: { numWords: 7, timer: 4, totalOptions: 14, diffName: 'Hard' }
};

const getLevelFromDifficulty = (diff) => {
  if (!diff) return 1;
  const d = String(diff).toLowerCase();
  if (d === 'hard') return 8;
  if (d === 'medium') return 4;
  return 1;
};

const WordMemory = () => {
  const { user } = useAuth();
  const { speakInstruction } = useVoice();
  const navigate = useNavigate();
  const location = useLocation();

  const [level, setLevel] = useState(1);
  const [maxUnlockedLevel, setMaxUnlockedLevel] = useState(() => {
    const saved = localStorage.getItem(`unlocked_lvl_${user?.id || 'guest'}_word_memory`);
    return saved ? parseInt(saved, 10) : 1;
  });
  const [stage, setStage] = useState('memorize'); // 'memorize', 'test', 'result'
  const [timer, setTimer] = useState(7);
  const [targetWords, setTargetWords] = useState([]);
  const [options, setOptions] = useState([]);
  const [selectedWords, setSelectedWords] = useState([]);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [mlResult, setMlResult] = useState(null);
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    const initLvl = getLevelFromDifficulty(location.state?.difficulty);
    const startingLvl = Math.min(initLvl, maxUnlockedLevel);
    startLevel(startingLvl);
  }, []);

  useEffect(() => {
    let interval;
    if (stage === 'memorize' && timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    } else if (stage === 'memorize' && timer === 0) {
      setStage('test');
      speakInstruction("Which words were on the list? Click to select them.");
    }
    return () => clearInterval(interval);
  }, [stage, timer, speakInstruction]);

  useEffect(() => {
    let timer;
    if (stage === 'result' && countdown !== null && countdown > 0) {
      timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
    } else if (stage === 'result' && countdown === 0) {
      handleNextLevelOrActivity();
    }
    return () => clearTimeout(timer);
  }, [stage, countdown]);

  const generateLevelWords = (lvlNum) => {
    const cfg = LEVEL_CONFIG[lvlNum] || LEVEL_CONFIG[1];
    const shuffledPool = [...MASTER_WORD_POOL].sort(() => Math.random() - 0.5);

    const targets = shuffledPool.slice(0, cfg.numWords);
    const distractors = shuffledPool
      .filter(w => !targets.includes(w))
      .slice(0, cfg.totalOptions - cfg.numWords);

    const allOptions = [...targets, ...distractors].sort(() => Math.random() - 0.5);

    return { targets, options: allOptions };
  };

  const startLevel = (lvlNum) => {
    setLevel(lvlNum);
    const cfg = LEVEL_CONFIG[lvlNum] || LEVEL_CONFIG[1];
    const { targets, options: generatedOptions } = generateLevelWords(lvlNum);

    setTargetWords(targets);
    setOptions(generatedOptions);
    setTimer(cfg.timer);
    setStage('memorize');
    setSelectedWords([]);
    setScore(0);
    setMistakes(0);
    setAttempts(0);
    setStartTime(Date.now());
    setFeedback(null);
    setMlResult(null);
    setCountdown(null);
    speakInstruction(`Starting Level ${lvlNum}. Memorize these ${cfg.numWords} words.`);
  };

  const handleWordToggle = (word) => {
    if (selectedWords.includes(word)) {
      setSelectedWords(selectedWords.filter((w) => w !== word));
    } else {
      setSelectedWords([...selectedWords, word]);
    }
    setFeedback(null);
  };

  const handleSubmitAnswers = async () => {
    setAttempts((prev) => prev + 1);
    let correctCount = 0;
    let wrongCount = 0;

    selectedWords.forEach((word) => {
      if (targetWords.includes(word)) {
        correctCount += 1;
      } else {
        wrongCount += 1;
      }
    });

    const missedCount = targetWords.length - correctCount;
    const finalMistakes = wrongCount + missedCount;
    const totalMistakes = mistakes + finalMistakes;
    const currentAttempts = attempts + 1;
    setAttempts(currentAttempts);

    if (finalMistakes === 0) {
      const finalScore = Math.max(0, (correctCount * 30 * level) - (mistakes * 10));
      setScore(finalScore);
      setFeedback({
        type: 'right',
        message: `🎉 Congratulations! Perfect word memory!`
      });
      speakInstruction(`Congratulations! Perfect word memory recall!`);
      finishLevel(finalScore, mistakes);
    } else {
      setMistakes(totalMistakes);
      if (totalMistakes >= 3 || currentAttempts >= 3) {
        // Patient has struggled across multiple attempts - complete level gracefully with encouragement
        const partialScore = Math.max(0, correctCount * 15 * level);
        setScore(partialScore);
        setFeedback({
          type: 'wrong',
          message: `Good effort! Let's practice words together.`
        });
        finishLevel(partialScore, totalMistakes);
      } else {
        setFeedback({
          type: 'wrong',
          message: `Oh oh! Some selected words were not quite right.`
        });
        speakInstruction(`Oh oh, that's not quite right. Tap Try Again to reset and choose your words again.`);
      }
    }
  };

  const handleTryAgain = () => {
    setSelectedWords([]);
    setFeedback(null);
    speakInstruction("Let's try again! Tap the words you remember seeing.");
  };

  const finishLevel = async (finalScore, finalMistakes) => {
    setStage('result');
    setCountdown(5);
    const durationSeconds = Math.max(5, Math.round((Date.now() - startTime) / 1000));
    const accuracyVal = Math.round((targetWords.length / (targetWords.length + finalMistakes)) * 100);
    const cfg = LEVEL_CONFIG[level];

    const isPassing = finalMistakes <= 1;
    const isDemoting = !isPassing && level > 1 && finalMistakes >= 3;
    const adaptLevel = isPassing ? Math.min(10, level + 1) : (isDemoting ? Math.max(1, level - 1) : level);

    if (isDemoting) {
      setMaxUnlockedLevel(adaptLevel);
      localStorage.setItem(`unlocked_lvl_${user?.id || 'guest'}_word_memory`, adaptLevel);
      speakInstruction(`Wonderful effort! You worked really hard. Let's take a gentle step back to Level ${adaptLevel} to practice together and build our confidence!`);
    } else if (isPassing) {
      speakInstruction(`Word test completed for Level ${level}. Advancing to next level.`);
    } else {
      speakInstruction(`Good try on Level ${level}. Let's practice Level ${level} once more to strengthen your word recall.`);
    }

    try {
      const res = await sessionsAPI.create({
        patient_id: user.id,
        activity_id: 5, // Word Memory
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
        localStorage.setItem(`unlocked_lvl_${user?.id || 'guest'}_word_memory`, nextLvl);
      }
      if (level < 10) {
        startLevel(level + 1);
      } else {
        navigate('/patient/activities/name-face');
      }
    } else if (isDemoting) {
      const adaptLevel = Math.max(1, level - 1);
      setMaxUnlockedLevel(adaptLevel);
      localStorage.setItem(`unlocked_lvl_${user?.id || 'guest'}_word_memory`, adaptLevel);
      startLevel(adaptLevel);
    } else {
      startLevel(level);
    }
  };

  const cfg = LEVEL_CONFIG[level];

  return (
    <div className="container py-4 patient-view text-center">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h1 className="fw-extrabold text-rose mb-1">Activity 5: Word Memory</h1>
          <p className="text-secondary fs-4 mb-0">Memorize a word list and pick them out from distractors across 10 levels.</p>
        </div>

        {/* Multi-level selector */}
        <LevelSelector
          activityKey="word_memory"
          currentLevel={level}
          maxUnlockedLevel={maxUnlockedLevel}
          onSelectLevel={startLevel}
          speakInstruction={speakInstruction}
        />
      </div>

      {stage === 'memorize' && (
        <div className="card patient-card p-5 shadow-lg my-4 border-rose">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <span className="badge bg-rose-light text-rose border border-rose fs-4 px-3 py-2 rounded-pill">
              Level {level} ({cfg.numWords} Words)
            </span>
            <div className="badge bg-danger fs-3 px-4 py-2 rounded-pill">
              Disappearing in: {timer}s
            </div>
          </div>

          <h2 className="fw-bold text-dark mb-4">Remember These Words!</h2>

          <div className="row justify-content-center g-3 my-3">
            {targetWords.map((word, i) => (
              <div key={i} className="col-6 col-md-4">
                <div className="p-4 bg-rose-light text-rose border border-rose rounded-4 fs-2 fw-bold shadow-sm">
                  {word}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stage === 'test' && (
        <div className="card patient-card p-5 shadow-lg my-4 border-rose">
          <span className="badge bg-rose-light text-rose border border-rose fs-4 px-3 py-2 rounded-pill mx-auto mb-3">
            Level {level} Test
          </span>
          <h2 className="fw-bold text-rose mb-3">Select the {cfg.numWords} words that were shown:</h2>

          {/* Feedback Banner */}
          {feedback && (
            <div className={`alert ${feedback.type === 'right' ? 'alert-success' : 'alert-danger'} fs-3 p-3 rounded-4 mb-4 fw-bold shadow-sm d-flex flex-column align-items-center justify-content-center gap-2`}>
              <div>{feedback.message}</div>
              {feedback.type === 'wrong' && (
                <button 
                  onClick={handleTryAgain}
                  className="btn patient-btn patient-btn-danger fs-4 px-4 py-2 mt-2"
                >
                  <i className="bi bi-arrow-counterclockwise me-2"></i> Try Again (Reset Selection)
                </button>
              )}
            </div>
          )}

          <div className="row g-3 justify-content-center mb-4">
            {options.map((word, i) => {
              const isSelected = selectedWords.includes(word);
              return (
                <div key={i} className="col-md-3 col-6">
                  <button
                    onClick={() => handleWordToggle(word)}
                    className={`btn patient-btn w-100 py-3 fs-3 ${
                      isSelected ? 'patient-btn-success' : 'btn-outline-danger'
                    }`}
                  >
                    {isSelected && <i className="bi bi-check-circle-fill me-1"></i>}
                    {word}
                  </button>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleSubmitAnswers}
            disabled={selectedWords.length === 0}
            className="btn patient-btn patient-btn-primary px-5 py-3 fs-3"
          >
            Submit Answers
          </button>
        </div>
      )}

      {stage === 'result' && (() => {
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
                <i className="bi bi-card-checklist display-1 text-success mb-2"></i>
                <h2 className="fw-bold text-success display-5">🎉 Level {level} Word Test Complete! Great Job!</h2>
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
                    Let's Practice Level {adaptLevel} Now 🌿
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

export default WordMemory;
