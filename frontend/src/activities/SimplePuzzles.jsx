import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useVoice } from '../context/VoiceContext';
import { sessionsAPI } from '../services/api';
import LevelSelector from '../components/LevelSelector';

const MASTER_PUZZLES_BANK = [
  {
    type: 'Odd One Out',
    question: 'Which item does NOT belong with fruits?',
    items: [
      { emoji: '🍎', name: 'Apple', isOdd: false },
      { emoji: '🍌', name: 'Banana', isOdd: false },
      { emoji: '🐶', name: 'Dog', isOdd: true },
      { emoji: '🍇', name: 'Grapes', isOdd: false }
    ],
    targetName: 'Dog'
  },
  {
    type: 'Number Pattern',
    question: 'What number comes next: 2 → 4 → 6 → ?',
    options: ['7', '8', '9', '10'],
    target: '8'
  },
  {
    type: 'Odd One Out',
    question: 'Which vehicle does NOT belong?',
    items: [
      { emoji: '🚗', name: 'Car', isOdd: false },
      { emoji: '🚌', name: 'Bus', isOdd: false },
      { emoji: '🚲', name: 'Bicycle', isOdd: false },
      { emoji: '🍰', name: 'Cake', isOdd: true }
    ],
    targetName: 'Cake'
  },
  {
    type: 'Number Pattern',
    question: 'What number comes next: 5 → 10 → 15 → ?',
    options: ['16', '18', '20', '25'],
    target: '20'
  },
  {
    type: 'Odd One Out',
    question: 'Which item is NOT clothing?',
    items: [
      { emoji: '👕', name: 'Shirt', isOdd: false },
      { emoji: '👖', name: 'Pants', isOdd: false },
      { emoji: '📚', name: 'Book', isOdd: true },
      { emoji: '🧦', name: 'Socks', isOdd: false }
    ],
    targetName: 'Book'
  },
  {
    type: 'Category Match',
    question: 'What item do you use to write?',
    options: ['Spoon', 'Pencil', 'Clock', 'Hat'],
    target: 'Pencil'
  },
  {
    type: 'Number Pattern',
    question: 'What number comes next: 1 → 3 → 5 → ?',
    options: ['6', '7', '8', '9'],
    target: '7'
  },
  {
    type: 'Odd One Out',
    question: 'Which animal lives in water?',
    items: [
      { emoji: '🐱', name: 'Cat', isOdd: false },
      { emoji: '🐬', name: 'Dolphin', isOdd: true },
      { emoji: '🐮', name: 'Cow', isOdd: false },
      { emoji: '🐔', name: 'Chicken', isOdd: false }
    ],
    targetName: 'Dolphin'
  },
  {
    type: 'Category Match',
    question: 'Which object helps you tell time?',
    options: ['Chair', 'Clock', 'Key', 'Car'],
    target: 'Clock'
  },
  {
    type: 'Number Pattern',
    question: 'What number comes next: 10 → 20 → 30 → ?',
    options: ['35', '40', '45', '50'],
    target: '40'
  }
];

const LEVEL_CONFIG = {
  1: { numPuzzles: 2, diffName: 'Easy' },
  2: { numPuzzles: 2, diffName: 'Easy' },
  3: { numPuzzles: 3, diffName: 'Easy' },
  4: { numPuzzles: 3, diffName: 'Medium' },
  5: { numPuzzles: 4, diffName: 'Medium' },
  6: { numPuzzles: 4, diffName: 'Medium' },
  7: { numPuzzles: 5, diffName: 'Medium' },
  8: { numPuzzles: 5, diffName: 'Hard' },
  9: { numPuzzles: 6, diffName: 'Hard' },
  10: { numPuzzles: 7, diffName: 'Hard' }
};

const getLevelFromDifficulty = (diff) => {
  if (!diff) return 1;
  const d = String(diff).toLowerCase();
  if (d === 'hard') return 8;
  if (d === 'medium') return 4;
  return 1;
};

const SimplePuzzles = () => {
  const { user } = useAuth();
  const { speakInstruction } = useVoice();
  const navigate = useNavigate();
  const location = useLocation();

  const [level, setLevel] = useState(1);
  const [maxUnlockedLevel, setMaxUnlockedLevel] = useState(() => {
    const saved = localStorage.getItem(`unlocked_lvl_${user?.id || 'guest'}_simple_puzzles`);
    return saved ? parseInt(saved, 10) : 1;
  });
  const [puzzles, setPuzzles] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [feedback, setFeedback] = useState(null);
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

  const generateLevelPuzzles = (lvlNum) => {
    const cfg = LEVEL_CONFIG[lvlNum] || LEVEL_CONFIG[1];
    const shuffled = [...MASTER_PUZZLES_BANK].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, cfg.numPuzzles);
  };

  const startLevel = (lvlNum) => {
    setLevel(lvlNum);
    const newPuzzles = generateLevelPuzzles(lvlNum);

    setPuzzles(newPuzzles);
    setCurrentIdx(0);
    setScore(0);
    setMistakes(0);
    setAttempts(0);
    setStartTime(Date.now());
    setSelectedAnswer(null);
    setFeedback(null);
    setCompleted(false);
    setMlResult(null);
    setCountdown(null);
    speakInstruction(`Starting Level ${lvlNum}. Solve the pattern and visual challenges.`);
  };

  const handleAnswerClick = async (chosen) => {
    setSelectedAnswer(chosen);
    setAttempts((prev) => prev + 1);
    const puzzle = puzzles[currentIdx];
    const target = puzzle.target || puzzle.targetName;

    let newScore = score;
    let newMistakes = mistakes;

    if (chosen === target) {
      newScore += 35 * level;
      setScore(newScore);
      setFeedback({
        type: 'right',
        message: `🎉 Congratulations! Correct puzzle answer!`
      });
      speakInstruction("Congratulations! Correct answer! Excellent problem solving.");

      if (currentIdx + 1 < puzzles.length) {
        setTimeout(() => {
          setCurrentIdx((prev) => prev + 1);
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
    setCompleted(true);
    setCountdown(5);
    const durationSeconds = Math.max(5, Math.round((Date.now() - startTime) / 1000));
    const totalPossible = puzzles.length * 35 * level;
    const accuracyVal = Math.round((finalScore / (totalPossible || 1)) * 100);
    const cfg = LEVEL_CONFIG[level];

    const isPassing = finalMistakes <= 1;
    const isDemoting = !isPassing && level > 1 && finalMistakes >= 3;
    const adaptLevel = isPassing ? Math.min(10, level + 1) : (isDemoting ? Math.max(1, level - 1) : level);

    if (isDemoting) {
      setMaxUnlockedLevel(adaptLevel);
      localStorage.setItem(`unlocked_lvl_${user?.id || 'guest'}_simple_puzzles`, adaptLevel);
      speakInstruction(`Wonderful effort! You worked really hard. Let's take a gentle step back to Level ${adaptLevel} to practice together and build our confidence!`);
    } else if (isPassing) {
      speakInstruction(`Level ${level} complete! Advancing to next level.`);
    } else {
      speakInstruction(`Good try on Level ${level}. Let's practice Level ${level} once more to strengthen your puzzle solving.`);
    }

    try {
      const res = await sessionsAPI.create({
        patient_id: user.id,
        activity_id: 8, // Simple Puzzles
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
        localStorage.setItem(`unlocked_lvl_${user?.id || 'guest'}_simple_puzzles`, nextLvl);
      }
      if (level < 10) {
        startLevel(level + 1);
      } else {
        navigate('/patient/activities');
      }
    } else if (isDemoting) {
      const adaptLevel = Math.max(1, level - 1);
      setMaxUnlockedLevel(adaptLevel);
      localStorage.setItem(`unlocked_lvl_${user?.id || 'guest'}_simple_puzzles`, adaptLevel);
      startLevel(adaptLevel);
    } else {
      startLevel(level);
    }
  };

  const puzzle = puzzles[currentIdx] || { type: '', question: '', options: [] };

  return (
    <div className="container py-4 patient-view text-center">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h1 className="fw-extrabold text-rose mb-1">Activity 8: Simple Puzzles</h1>
          <p className="text-secondary fs-4 mb-0">Solve odd-one-out and number pattern completion challenges across 10 levels.</p>
        </div>

        {/* Multi-level selector */}
        <LevelSelector
          activityKey="simple_puzzles"
          currentLevel={level}
          maxUnlockedLevel={maxUnlockedLevel}
          onSelectLevel={startLevel}
          speakInstruction={speakInstruction}
        />
      </div>

      {!completed ? (
        <div className="card patient-card p-5 shadow-lg my-4 border-rose">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <span className="badge bg-rose-light text-rose border border-rose fs-5 px-3 py-2">
              Puzzle {currentIdx + 1} of {puzzles.length} (Level {level})
            </span>
            <span className="badge bg-secondary fs-5 px-3 py-2">{puzzle.type}</span>
          </div>

          <h2 className="fw-bold text-dark mb-4">{puzzle.question}</h2>

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

          {puzzle.items ? (
            <div className="row g-4 justify-content-center">
              {puzzle.items.map((item, i) => (
                <div key={i} className="col-md-3 col-6">
                  <button
                    onClick={() => handleAnswerClick(item.name)}
                    disabled={selectedAnswer !== null && feedback?.type === 'right'}
                    className={`btn patient-btn w-100 py-4 ${
                      selectedAnswer === item.name
                        ? item.isOdd ? 'patient-btn-success' : 'patient-btn-danger'
                        : 'btn-outline-danger'
                    }`}
                  >
                    <div className="display-2 mb-2">{item.emoji}</div>
                    <div className="fs-3 fw-bold">{item.name}</div>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="row g-4 justify-content-center">
              {puzzle.options && puzzle.options.map((opt, i) => (
                <div key={i} className="col-md-3 col-6">
                  <button
                    onClick={() => handleAnswerClick(opt)}
                    disabled={selectedAnswer !== null && feedback?.type === 'right'}
                    className={`btn patient-btn w-100 py-4 display-3 fw-bold ${
                      selectedAnswer === opt
                        ? opt === puzzle.target ? 'patient-btn-success' : 'patient-btn-danger'
                        : 'btn-outline-danger'
                    }`}
                  >
                    {opt}
                  </button>
                </div>
              ))}
            </div>
          )}
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
                <i className="bi bi-puzzle-fill display-1 text-success mb-2"></i>
                <h2 className="fw-bold text-success display-5">🎉 Level {level} Solved! Great Job!</h2>
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
                  : `All Puzzle Levels Mastered! Returning to Activities in ${countdown}s...`}
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
                    {level < 10 ? `Go to Level ${level + 1} Now` : `All Activities`} <i className="bi bi-arrow-right-circle-fill ms-2"></i>
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

export default SimplePuzzles;
