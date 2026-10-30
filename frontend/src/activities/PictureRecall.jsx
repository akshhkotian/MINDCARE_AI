import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useVoice } from '../context/VoiceContext';
import { sessionsAPI } from '../services/api';
import LevelSelector from '../components/LevelSelector';

const MASTER_OBJECTS_POOL = [
  { name: 'Apple', emoji: '🍎' },
  { name: 'Book', emoji: '📚' },
  { name: 'Chair', emoji: '🪑' },
  { name: 'Flower', emoji: '🌸' },
  { name: 'Clock', emoji: '⏰' },
  { name: 'Key', emoji: '🔑' },
  { name: 'Teacup', emoji: '☕' },
  { name: 'House', emoji: '🏠' },
  { name: 'Bicycle', emoji: '🚲' },
  { name: 'Guitar', emoji: '🎸' },
  { name: 'Lamp', emoji: '💡' },
  { name: 'Umbrella', emoji: '☂️' },
  { name: 'Camera', emoji: '📷' },
  { name: 'Telephone', emoji: '📞' },
  { name: 'Pencil', emoji: '✏️' },
  { name: 'Car', emoji: '🚗' },
  { name: 'Hat', emoji: '🎩' },
  { name: 'Shoe', emoji: '👟' },
  { name: 'Cake', emoji: '🍰' },
  { name: 'Dog', emoji: '🐶' }
];

const LEVEL_CONFIG = {
  1: { numObjects: 2, displayTime: 7, numQuestions: 2, diffName: 'Easy' },
  2: { numObjects: 2, displayTime: 6, numQuestions: 3, diffName: 'Easy' },
  3: { numObjects: 3, displayTime: 5, numQuestions: 3, diffName: 'Easy' },
  4: { numObjects: 3, displayTime: 5, numQuestions: 4, diffName: 'Medium' },
  5: { numObjects: 4, displayTime: 4, numQuestions: 4, diffName: 'Medium' },
  6: { numObjects: 4, displayTime: 4, numQuestions: 5, diffName: 'Medium' },
  7: { numObjects: 5, displayTime: 4, numQuestions: 5, diffName: 'Medium' },
  8: { numObjects: 5, displayTime: 3, numQuestions: 5, diffName: 'Hard' },
  9: { numObjects: 6, displayTime: 3, numQuestions: 6, diffName: 'Hard' },
  10: { numObjects: 7, displayTime: 3, numQuestions: 6, diffName: 'Hard' }
};

const getLevelFromDifficulty = (diff) => {
  if (!diff) return 1;
  const d = String(diff).toLowerCase();
  if (d === 'hard') return 8;
  if (d === 'medium') return 4;
  return 1;
};

const PictureRecall = () => {
  const { user } = useAuth();
  const { speakInstruction } = useVoice();
  const navigate = useNavigate();
  const location = useLocation();

  const [level, setLevel] = useState(1);
  const [maxUnlockedLevel, setMaxUnlockedLevel] = useState(() => {
    const saved = localStorage.getItem(`unlocked_lvl_${user?.id || 'guest'}_picture_recall`);
    return saved ? parseInt(saved, 10) : 1;
  });
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [stage, setStage] = useState('observe'); // 'observe', 'question', 'result'
  const [timer, setTimer] = useState(6);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
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
    if (stage === 'observe' && timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    } else if (stage === 'observe' && timer === 0) {
      setStage('question');
      speakInstruction("What object was shown in the pictures? Select your answer below.");
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

  const generateLevelQuestions = (lvlNum) => {
    const cfg = LEVEL_CONFIG[lvlNum] || LEVEL_CONFIG[1];
    const generated = [];

    for (let q = 0; q < cfg.numQuestions; q++) {
      const shuffledMaster = [...MASTER_OBJECTS_POOL].sort(() => Math.random() - 0.5);
      const objectsShown = shuffledMaster.slice(0, cfg.numObjects);
      
      const targetObj = objectsShown[Math.floor(Math.random() * objectsShown.length)];
      
      const distractors = shuffledMaster
        .filter(item => !objectsShown.some(o => o.name === item.name))
        .slice(0, 3)
        .map(o => o.name);

      const options = [...distractors, targetObj.name].sort(() => Math.random() - 0.5);

      generated.push({
        objects: objectsShown,
        target: targetObj.name,
        options: options
      });
    }

    return generated;
  };

  const startLevel = (lvlNum) => {
    setLevel(lvlNum);
    const cfg = LEVEL_CONFIG[lvlNum] || LEVEL_CONFIG[1];
    const newQuestions = generateLevelQuestions(lvlNum);

    setQuestions(newQuestions);
    setCurrentIdx(0);
    setScore(0);
    setMistakes(0);
    setAttempts(0);
    setTimer(cfg.displayTime);
    setStage('observe');
    setStartTime(Date.now());
    setSelectedAnswer(null);
    setFeedback(null);
    setMlResult(null);
    setCountdown(null);
    speakInstruction(`Starting Level ${lvlNum}. Look closely at these ${cfg.numObjects} objects.`);
  };

  const handleAnswerSelect = async (answer) => {
    setSelectedAnswer(answer);
    setAttempts((prev) => prev + 1);
    const q = questions[currentIdx];
    const isCorrect = answer === q.target;

    let newScore = score;
    let newMistakes = mistakes;

    if (isCorrect) {
      newScore += 30 * level;
      setScore(newScore);
      setFeedback({
        type: 'right',
        message: `🎉 Congratulations! Excellent memory recall!`
      });
      speakInstruction("Congratulations! Correct answer! Excellent job!");

      if (currentIdx + 1 < questions.length) {
        setTimeout(() => {
          const nextIdx = currentIdx + 1;
          setCurrentIdx(nextIdx);
          const cfg = LEVEL_CONFIG[level];
          setTimer(cfg.displayTime);
          setStage('observe');
          setSelectedAnswer(null);
          setFeedback(null);
        }, 1500);
      } else {
        finishLevel(newScore, newMistakes);
      }
    } else {
      newMistakes += 1;
      setMistakes(newMistakes);
      setFeedback({
        type: 'wrong',
        message: `Oh oh! That's not quite right. Give it another try!`
      });
      speakInstruction("Oh oh, that's not quite right. Tap Try Again to try selecting again!");
    }
  };

  const handleTryAgain = () => {
    setSelectedAnswer(null);
    setFeedback(null);
  };

  const finishLevel = async (finalScore, finalMistakes) => {
    setStage('result');
    setCountdown(5);
    const durationSeconds = Math.max(5, Math.round((Date.now() - startTime) / 1000));
    const totalPossible = questions.length * 30 * level;
    const accuracyVal = Math.round((finalScore / (totalPossible || 1)) * 100);
    const cfg = LEVEL_CONFIG[level];

    const isPassing = finalMistakes <= 1;
    const isDemoting = !isPassing && level > 1 && finalMistakes >= 3;
    const adaptLevel = isPassing ? Math.min(10, level + 1) : (isDemoting ? Math.max(1, level - 1) : level);

    if (isDemoting) {
      setMaxUnlockedLevel(adaptLevel);
      localStorage.setItem(`unlocked_lvl_${user?.id || 'guest'}_picture_recall`, adaptLevel);
      speakInstruction(`Wonderful effort! You worked really hard. Let's take a gentle step back to Level ${adaptLevel} to practice together and build our confidence!`);
    } else if (isPassing) {
      speakInstruction(`Level ${level} complete! Advancing to the next level.`);
    } else {
      speakInstruction(`Good try on Level ${level}. Let's practice Level ${level} once more to strengthen your picture recall.`);
    }

    try {
      const res = await sessionsAPI.create({
        patient_id: user.id,
        activity_id: 2, // Picture Recall
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
        localStorage.setItem(`unlocked_lvl_${user?.id || 'guest'}_picture_recall`, nextLvl);
      }
      if (level < 10) {
        startLevel(level + 1);
      } else {
        navigate('/patient/activities/sequence');
      }
    } else if (isDemoting) {
      const adaptLevel = Math.max(1, level - 1);
      setMaxUnlockedLevel(adaptLevel);
      localStorage.setItem(`unlocked_lvl_${user?.id || 'guest'}_picture_recall`, adaptLevel);
      startLevel(adaptLevel);
    } else {
      startLevel(level);
    }
  };

  const currentQ = questions[currentIdx] || { objects: [], options: [], target: '' };
  const cfg = LEVEL_CONFIG[level];

  return (
    <div className="container py-4 patient-view text-center">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h1 className="fw-extrabold text-rose mb-1">Activity 2: Picture Recall</h1>
          <p className="text-secondary fs-4 mb-0">Memorize images briefly and test your memory across levels.</p>
        </div>
        
        {/* Multi-level selector */}
        <LevelSelector
          activityKey="picture_recall"
          currentLevel={level}
          maxUnlockedLevel={maxUnlockedLevel}
          onSelectLevel={startLevel}
          speakInstruction={speakInstruction}
        />
      </div>

      {/* Observation Stage */}
      {stage === 'observe' && (
        <div className="card patient-card p-5 shadow-lg my-4 border-rose">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <span className="badge bg-rose-light text-rose border border-rose fs-4 px-3 py-2 rounded-pill">
              Question {currentIdx + 1} of {questions.length} (Level {level})
            </span>
            <div className="badge bg-danger fs-3 px-4 py-2 rounded-pill">
              Hiding in: {timer}s
            </div>
          </div>
          
          <h2 className="fw-bold mb-4 text-dark">Memorize These {currentQ.objects.length} Objects!</h2>

          <div className="row justify-content-center g-4 my-3">
            {currentQ.objects.map((obj, i) => (
              <div key={i} className="col-6 col-md-4">
                <div className="p-4 bg-rose-light border border-rose rounded-4 shadow-sm">
                  <div className="display-1 mb-2">{obj.emoji}</div>
                  <div className="fs-3 fw-bold text-dark">{obj.name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Question Stage */}
      {stage === 'question' && (
        <div className="card patient-card p-5 shadow-lg my-4 border-rose">
          <span className="badge bg-rose-light text-rose border border-rose fs-4 px-3 py-2 rounded-pill mx-auto mb-3">
            Question {currentIdx + 1} of {questions.length}
          </span>
          <h2 className="fw-bold mb-4 text-rose">Which object was shown in the pictures?</h2>

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
            {currentQ.options.map((opt, i) => (
              <div key={i} className="col-md-6">
                <button
                  onClick={() => handleAnswerSelect(opt)}
                  disabled={selectedAnswer !== null && feedback?.type === 'right'}
                  className={`btn patient-btn w-100 py-4 fs-3 ${
                    selectedAnswer === opt
                      ? opt === currentQ.target ? 'patient-btn-success' : 'patient-btn-danger'
                      : 'btn-outline-danger'
                  }`}
                >
                  {opt}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results Stage */}
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
                <i className="bi bi-star-fill display-1 text-warning mb-2"></i>
                <h2 className="fw-bold text-success display-5">🎉 Level {level} Completed! Great Job!</h2>
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

export default PictureRecall;
