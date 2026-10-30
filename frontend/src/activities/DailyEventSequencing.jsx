import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useVoice } from '../context/VoiceContext';
import { sessionsAPI } from '../services/api';
import LevelSelector from '../components/LevelSelector';

const EVENT_ROUTINES_POOL = {
  3: [
    [
      { id: '1', title: 'Wake Up', icon: '⏰', step: 1 },
      { id: '2', title: 'Brush Teeth', icon: '🪥', step: 2 },
      { id: '3', title: 'Eat Breakfast', icon: '🍳', step: 3 }
    ],
    [
      { id: '1', title: 'Prepare Ingredients', icon: '🧺', step: 1 },
      { id: '2', title: 'Cook Tea', icon: '🫖', step: 2 },
      { id: '3', title: 'Enjoy Afternoon Tea', icon: '☕', step: 3 }
    ]
  ],
  4: [
    [
      { id: '1', title: 'Wake Up', icon: '⏰', step: 1 },
      { id: '2', title: 'Brush Teeth', icon: '🪥', step: 2 },
      { id: '3', title: 'Eat Breakfast', icon: '🍳', step: 3 },
      { id: '4', title: 'Go for a Walk', icon: '🚶‍♂️', step: 4 }
    ],
    [
      { id: '1', title: 'Eat Dinner', icon: '🍲', step: 1 },
      { id: '2', title: 'Wash Dishes', icon: '🧼', step: 2 },
      { id: '3', title: 'Watch News', icon: '📺', step: 3 },
      { id: '4', title: 'Go to Bed', icon: '🌙', step: 4 }
    ]
  ],
  5: [
    [
      { id: '1', title: 'Wake Up in Morning', icon: '🌅', step: 1 },
      { id: '2', title: 'Take Morning Medication', icon: '💊', step: 2 },
      { id: '3', title: 'Eat Healthy Lunch', icon: '🥗', step: 3 },
      { id: '4', title: 'Afternoon Rest', icon: '🛋️', step: 4 },
      { id: '5', title: 'Evening Family Call', icon: '📞', step: 5 }
    ]
  ],
  6: [
    [
      { id: '1', title: 'Morning Exercise', icon: '🧘', step: 1 },
      { id: '2', title: 'Breakfast & Water', icon: '🥛', step: 2 },
      { id: '3', title: 'MindCare Activities', icon: '🧩', step: 3 },
      { id: '4', title: 'Afternoon Walk', icon: '🌳', step: 4 },
      { id: '5', title: 'Night Herbal Tea', icon: '🫖', step: 5 },
      { id: '6', title: 'Sleep at Night', icon: '🌙', step: 6 }
    ]
  ],
  7: [
    [
      { id: '1', title: 'Wake Up Alarm', icon: '⏰', step: 1 },
      { id: '2', title: 'Brush Teeth', icon: '🪥', step: 2 },
      { id: '3', title: 'Morning Medication', icon: '💊', step: 3 },
      { id: '4', title: 'Nutritious Breakfast', icon: '🍳', step: 4 },
      { id: '5', title: 'Cognitive Exercises', icon: '🧩', step: 5 },
      { id: '6', title: 'Read a Favorite Book', icon: '📖', step: 6 },
      { id: '7', title: 'Night Sleep', icon: '🌙', step: 7 }
    ]
  ]
};

const LEVEL_CONFIG = {
  1: { numSteps: 3, diffName: 'Easy' },
  2: { numSteps: 3, diffName: 'Easy' },
  3: { numSteps: 4, diffName: 'Easy' },
  4: { numSteps: 4, diffName: 'Medium' },
  5: { numSteps: 5, diffName: 'Medium' },
  6: { numSteps: 5, diffName: 'Medium' },
  7: { numSteps: 6, diffName: 'Medium' },
  8: { numSteps: 6, diffName: 'Hard' },
  9: { numSteps: 7, diffName: 'Hard' },
  10: { numSteps: 7, diffName: 'Hard' }
};

const getLevelFromDifficulty = (diff) => {
  if (!diff) return 1;
  const d = String(diff).toLowerCase();
  if (d === 'hard') return 8;
  if (d === 'medium') return 4;
  return 1;
};

const DailyEventSequencing = () => {
  const { user } = useAuth();
  const { speakInstruction } = useVoice();
  const navigate = useNavigate();
  const location = useLocation();

  const [level, setLevel] = useState(1);
  const [maxUnlockedLevel, setMaxUnlockedLevel] = useState(() => {
    const saved = localStorage.getItem(`unlocked_lvl_${user?.id || 'guest'}_event_sequence`);
    return saved ? parseInt(saved, 10) : 1;
  });
  const [currentTargetSet, setCurrentTargetSet] = useState([]);
  const [availableEvents, setAvailableEvents] = useState([]);
  const [userSequence, setUserSequence] = useState([]);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [startTime, setStartTime] = useState(null);
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

  const getRandomRoutine = (numSteps) => {
    const routines = EVENT_ROUTINES_POOL[numSteps] || EVENT_ROUTINES_POOL[3];
    return routines[Math.floor(Math.random() * routines.length)];
  };

  const startLevel = (lvlNum) => {
    setLevel(lvlNum);
    const cfg = LEVEL_CONFIG[lvlNum] || LEVEL_CONFIG[1];
    const targetSet = getRandomRoutine(cfg.numSteps);
    const scrambled = [...targetSet].sort(() => Math.random() - 0.5);

    setCurrentTargetSet(targetSet);
    setAvailableEvents(scrambled);
    setUserSequence([]);
    setScore(0);
    setMistakes(0);
    setAttempts(0);
    setStartTime(Date.now());
    setFeedback(null);
    setCompleted(false);
    setMlResult(null);
    setCountdown(null);
    speakInstruction(`Starting Level ${lvlNum}. Arrange these ${cfg.numSteps} daily events into chronological order.`);
  };

  const handleSelectEvent = (eventObj) => {
    setUserSequence([...userSequence, eventObj]);
    setAvailableEvents(availableEvents.filter((e) => e.id !== eventObj.id));
    setFeedback(null);
  };

  const handleRemoveFromUserSequence = (eventObj) => {
    setUserSequence(userSequence.filter((e) => e.id !== eventObj.id));
    setAvailableEvents([...availableEvents, eventObj]);
    setFeedback(null);
  };

  const handleCheckSequence = async () => {
    setAttempts((prev) => prev + 1);
    const cfg = LEVEL_CONFIG[level];

    let isCorrect = true;
    for (let i = 0; i < userSequence.length; i++) {
      if (userSequence[i].step !== i + 1) {
        isCorrect = false;
        break;
      }
    }

    if (isCorrect && userSequence.length === currentTargetSet.length) {
      const finalScore = Math.max(20, (100 - mistakes * 15) * level);
      setScore(finalScore);
      setFeedback({
        type: 'right',
        message: `🎉 Congratulations! Perfect routine sequence!`
      });
      speakInstruction(`Congratulations! Excellent! You arranged Level ${level} routine in perfect order.`);
      finishLevel(finalScore, mistakes, cfg);
    } else {
      const newMistakes = mistakes + 1;
      setMistakes(newMistakes);
      if (newMistakes >= 3) {
        // Patient struggled with the sequence after 3 mistakes - finish gracefully with encouragement
        const partialScore = Math.max(10, 20 * level);
        setScore(partialScore);
        setFeedback({
          type: 'wrong',
          message: `Good effort! Let's practice daily routines together.`
        });
        finishLevel(partialScore, newMistakes, cfg);
        return;
      }
      setFeedback({
        type: 'wrong',
        message: `Oh oh! That sequence order is not quite right.`
      });
      speakInstruction("Oh oh! That sequence is not quite right. Tap Try Again to reset the order and try again.");
    }
  };

  const handleTryAgain = () => {
    setFeedback(null);
    setUserSequence([]);
    const scrambled = [...currentTargetSet].sort(() => Math.random() - 0.5);
    setAvailableEvents(scrambled);
    speakInstruction("Let's try again! Click the cards below to arrange them into chronological order.");
  };

  const handleResetSequence = () => {
    setUserSequence([]);
    const scrambled = [...currentTargetSet].sort(() => Math.random() - 0.5);
    setAvailableEvents(scrambled);
    setFeedback(null);
  };

  const finishLevel = async (finalScore, finalMistakes, cfg) => {
    setCompleted(true);
    setCountdown(5);
    const durationSeconds = Math.max(5, Math.round((Date.now() - startTime) / 1000));
    const accuracyVal = Math.max(30, Math.round((currentTargetSet.length / (currentTargetSet.length + finalMistakes)) * 100));

    const isPassing = finalMistakes <= 1;
    const isDemoting = !isPassing && level > 1 && finalMistakes >= 3;
    const adaptLevel = isPassing ? Math.min(10, level + 1) : (isDemoting ? Math.max(1, level - 1) : level);

    if (isDemoting) {
      setMaxUnlockedLevel(adaptLevel);
      localStorage.setItem(`unlocked_lvl_${user?.id || 'guest'}_event_sequence`, adaptLevel);
      speakInstruction(`Wonderful effort! You worked really hard. Let's take a gentle step back to Level ${adaptLevel} to practice together and build our confidence!`);
    } else if (isPassing) {
      speakInstruction(`Level ${level} complete! Advancing to next level.`);
    } else {
      speakInstruction(`Good try on Level ${level}. Let's practice Level ${level} once more to strengthen your daily sequencing.`);
    }

    try {
      const res = await sessionsAPI.create({
        patient_id: user.id,
        activity_id: 7, // Daily Event Sequencing
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
        localStorage.setItem(`unlocked_lvl_${user?.id || 'guest'}_event_sequence`, nextLvl);
      }
      if (level < 10) {
        startLevel(level + 1);
      } else {
        navigate('/patient/activities/puzzles');
      }
    } else if (isDemoting) {
      const adaptLevel = Math.max(1, level - 1);
      setMaxUnlockedLevel(adaptLevel);
      localStorage.setItem(`unlocked_lvl_${user?.id || 'guest'}_event_sequence`, adaptLevel);
      startLevel(adaptLevel);
    } else {
      startLevel(level);
    }
  };

  return (
    <div className="container py-4 patient-view text-center">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h1 className="fw-extrabold text-rose mb-1">Activity 7: Daily Event Sequencing</h1>
          <p className="text-secondary fs-4 mb-0">Arrange daily routine steps into chronological order across 10 levels.</p>
        </div>

        {/* Multi-level selector */}
        <LevelSelector
          activityKey="event_sequence"
          currentLevel={level}
          maxUnlockedLevel={maxUnlockedLevel}
          onSelectLevel={startLevel}
          speakInstruction={speakInstruction}
        />
      </div>

      {!completed ? (
        <div className="card patient-card p-4 shadow-lg my-4 border-rose">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <span className="badge bg-rose-light text-rose border border-rose fs-4 px-3 py-2 rounded-pill">
              Level {level} ({currentTargetSet.length} Steps)
            </span>
            <span className="badge bg-secondary fs-4 px-3 py-2 rounded-pill">
              Mistakes: {mistakes}
            </span>
          </div>

          <h2 className="fw-bold text-dark mb-3">Arrange these daily events in order (first to last):</h2>

          {/* Feedback Banner */}
          {feedback && (
            <div className={`alert ${feedback.type === 'right' ? 'alert-success' : 'alert-danger'} fs-3 p-3 rounded-4 mb-4 fw-bold shadow-sm d-flex flex-column align-items-center justify-content-center gap-2`}>
              <div>{feedback.message}</div>
              {feedback.type === 'wrong' && (
                <button 
                  onClick={handleTryAgain}
                  className="btn patient-btn patient-btn-danger fs-4 px-4 py-2 mt-2 shadow-sm"
                >
                  <i className="bi bi-arrow-counterclockwise me-2"></i> Try Again (Reset Sequence)
                </button>
              )}
            </div>
          )}

          {/* Selected Sequence Row */}
          <div className="p-4 bg-rose-light border border-2 border-rose rounded-4 my-3">
            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
              <h4 className="fw-bold text-rose mb-0">Your Ordered Sequence:</h4>
              {userSequence.length > 0 && (
                <button
                  type="button"
                  onClick={handleResetSequence}
                  className="btn btn-outline-danger btn-sm px-3 py-1 rounded-pill fw-bold"
                  title="Reset and place cards from the beginning"
                >
                  <i className="bi bi-arrow-counterclockwise me-1"></i> Reset Sequence
                </button>
              )}
            </div>
            {userSequence.length === 0 ? (
              <p className="text-secondary fs-4">Click cards below to place them into order.</p>
            ) : (
              <div className="row g-3 justify-content-center">
                {userSequence.map((evt, idx) => (
                  <div key={evt.id} className="col-auto">
                    <div 
                      onClick={() => handleRemoveFromUserSequence(evt)}
                      className="p-3 bg-white text-dark border border-rose rounded-3 cursor-pointer shadow-sm fs-4 fw-bold"
                    >
                      <span className="badge bg-rose-light text-rose border border-rose me-2">{idx + 1}</span>
                      {evt.icon} {evt.title}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Available Cards Row */}
          <h4 className="fw-bold text-secondary mt-4 mb-3">Available Cards to Place:</h4>
          <div className="row g-3 justify-content-center mb-4">
            {availableEvents.map((evt) => (
              <div key={evt.id} className="col-md-3 col-6">
                <button
                  onClick={() => handleSelectEvent(evt)}
                  className="btn patient-btn btn-outline-danger w-100 py-3 fs-4 fw-bold"
                >
                  <span className="me-2">{evt.icon}</span> {evt.title}
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={handleCheckSequence}
            disabled={availableEvents.length > 0}
            className="btn patient-btn patient-btn-primary px-5 py-3 fs-3"
          >
            Check Sequence Order
          </button>
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
                <i className="bi bi-clock-history display-1 text-success mb-2"></i>
                <h2 className="fw-bold text-success display-5">🎉 Level {level} Daily Sequencing Complete! Great Job!</h2>
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

export default DailyEventSequencing;
