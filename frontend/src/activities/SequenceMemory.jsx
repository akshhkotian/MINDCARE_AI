import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useVoice } from '../context/VoiceContext';
import { sessionsAPI } from '../services/api';
import LevelSelector from '../components/LevelSelector';

const BUTTONS = [
  { num: 1, label: '🌹 Rose', color: '#D4A5A5' },
  { num: 2, label: '🪵 Brown', color: '#4B3F3F' },
  { num: 3, label: '🌾 Taupe', color: '#C9B7A7' },
  { num: 4, label: '🌱 Sage', color: '#6E8B74' }
];

const LEVEL_CONFIG = {
  1: { length: 2, speed: 1100, diffName: 'Easy' },
  2: { length: 3, speed: 1000, diffName: 'Easy' },
  3: { length: 3, speed: 900, diffName: 'Easy' },
  4: { length: 4, speed: 850, diffName: 'Medium' },
  5: { length: 4, speed: 800, diffName: 'Medium' },
  6: { length: 5, speed: 750, diffName: 'Medium' },
  7: { length: 5, speed: 700, diffName: 'Medium' },
  8: { length: 6, speed: 650, diffName: 'Hard' },
  9: { length: 7, speed: 600, diffName: 'Hard' },
  10: { length: 8, speed: 500, diffName: 'Hard' }
};

const getLevelFromDifficulty = (diff) => {
  if (!diff) return 1;
  const d = String(diff).toLowerCase();
  if (d === 'hard') return 8;
  if (d === 'medium') return 4;
  return 1;
};

const SequenceMemory = () => {
  const { user } = useAuth();
  const { speakInstruction } = useVoice();
  const navigate = useNavigate();
  const location = useLocation();

  const [level, setLevel] = useState(1);
  const [maxUnlockedLevel, setMaxUnlockedLevel] = useState(() => {
    const saved = localStorage.getItem(`unlocked_lvl_${user?.id || 'guest'}_sequence_memory`);
    return saved ? parseInt(saved, 10) : 1;
  });
  const [sequence, setSequence] = useState([]);
  const [userSequence, setUserSequence] = useState([]);
  const [activeButton, setActiveButton] = useState(null);
  const [isShowingSequence, setIsShowingSequence] = useState(false);
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

  const generateRandomSequence = (length) => {
    return Array.from({ length }, () => Math.floor(Math.random() * 4) + 1);
  };

  const startLevel = (lvlNum) => {
    setLevel(lvlNum);
    const cfg = LEVEL_CONFIG[lvlNum] || LEVEL_CONFIG[1];
    const newSeq = generateRandomSequence(cfg.length);

    setSequence(newSeq);
    setUserSequence([]);
    setScore(0);
    setMistakes(0);
    setAttempts(0);
    setStartTime(Date.now());
    setFeedback(null);
    setCompleted(false);
    setMlResult(null);
    setCountdown(null);

    playSequence(newSeq, cfg.speed);
  };

  const playSequence = (seq, speed = 800) => {
    setIsShowingSequence(true);
    setFeedback(null);
    speakInstruction("Observe the light-up sequence carefully.");

    seq.forEach((num, index) => {
      setTimeout(() => {
        setActiveButton(num);
        setTimeout(() => setActiveButton(null), Math.round(speed * 0.7));
      }, (index + 1) * speed);
    });

    setTimeout(() => {
      setIsShowingSequence(false);
      speakInstruction("Now repeat the sequence by pressing the buttons in order.");
    }, (seq.length + 1) * speed);
  };

  const handleButtonClick = async (num) => {
    if (isShowingSequence || completed) return;

    setActiveButton(num);
    setTimeout(() => setActiveButton(null), 300);

    const newUserSeq = [...userSequence, num];
    setUserSequence(newUserSeq);
    const currentIndex = newUserSeq.length - 1;

    if (newUserSeq[currentIndex] !== sequence[currentIndex]) {
      // Mistake
      const newMistakes = mistakes + 1;
      setMistakes(newMistakes);
      if (newMistakes >= 3) {
        // Patient made 3 mistakes - finish level gracefully with encouragement
        setFeedback({
          type: 'wrong',
          message: `Good effort! Let's practice sequences together.`
        });
        finishLevel(score, newMistakes, attempts + 1);
        setUserSequence([]);
        return;
      }
      setFeedback({
        type: 'wrong',
        message: `Oh oh! That wasn't the right sequence item. Give it another try!`
      });
      speakInstruction("Oh oh! Not quite right. Tap Try Again to watch the sequence again.");
      setUserSequence([]);
      return;
    }

    if (newUserSeq.length === sequence.length) {
      // Sequence completed!
      const finalScore = score + 30 * level;
      setScore(finalScore);
      setAttempts((prev) => prev + 1);
      setFeedback({
        type: 'right',
        message: `🎉 Congratulations! Perfect sequence!`
      });
      speakInstruction(`Congratulations! Fantastic! Level ${level} sequence completed!`);

      finishLevel(finalScore, mistakes, attempts + 1);
    }
  };

  const handleTryAgain = () => {
    const cfg = LEVEL_CONFIG[level];
    setUserSequence([]);
    setFeedback(null);
    playSequence(sequence, cfg.speed);
  };

  const finishLevel = async (finalScore, finalMistakes, finalAttempts) => {
    setCompleted(true);
    setCountdown(5);
    const durationSeconds = Math.max(4, Math.round((Date.now() - startTime) / 1000));
    const accuracyVal = Math.max(20, Math.round((sequence.length / (sequence.length + finalMistakes)) * 100));
    const cfg = LEVEL_CONFIG[level];

    const isPassing = finalMistakes <= 1;
    const isDemoting = !isPassing && level > 1 && finalMistakes >= 3;
    const adaptLevel = isPassing ? Math.min(10, level + 1) : (isDemoting ? Math.max(1, level - 1) : level);

    if (isDemoting) {
      setMaxUnlockedLevel(adaptLevel);
      localStorage.setItem(`unlocked_lvl_${user?.id || 'guest'}_sequence_memory`, adaptLevel);
      speakInstruction(`Wonderful effort! You worked really hard. Let's take a gentle step back to Level ${adaptLevel} to practice together and build our confidence!`);
    } else if (isPassing) {
      speakInstruction(`Level ${level} complete! Advancing to next level.`);
    } else {
      speakInstruction(`Good try on Level ${level}. Let's practice Level ${level} once more to strengthen your sequence recall.`);
    }

    try {
      const res = await sessionsAPI.create({
        patient_id: user.id,
        activity_id: 3, // Sequence Memory
        score: finalScore,
        accuracy: accuracyVal,
        completion_time: durationSeconds,
        mistakes: finalMistakes,
        attempts: finalAttempts,
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
        localStorage.setItem(`unlocked_lvl_${user?.id || 'guest'}_sequence_memory`, nextLvl);
      }
      if (level < 10) {
        startLevel(level + 1);
      } else {
        navigate('/patient/activities/object-recognition');
      }
    } else if (isDemoting) {
      const adaptLevel = Math.max(1, level - 1);
      setMaxUnlockedLevel(adaptLevel);
      localStorage.setItem(`unlocked_lvl_${user?.id || 'guest'}_sequence_memory`, adaptLevel);
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
          <h1 className="fw-extrabold text-rose mb-1">Activity 3: Sequence Memory</h1>
          <p className="text-secondary fs-4 mb-0">Watch the light-up pattern and repeat it correctly.</p>
        </div>
        
        {/* Multi-level selector */}
        <LevelSelector
          activityKey="sequence_memory"
          currentLevel={level}
          maxUnlockedLevel={maxUnlockedLevel}
          onSelectLevel={startLevel}
          speakInstruction={speakInstruction}
        />
      </div>

      <div className="card patient-card p-3 p-md-5 shadow-lg my-3 my-md-4 border-rose">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <span className="badge bg-rose-light text-rose border border-rose fs-5 fs-md-4 px-3 py-2 rounded-pill">
            Level {level} ({cfg.length} Steps)
          </span>
          <span className="badge bg-secondary fs-5 fs-md-4 px-3 py-2 rounded-pill">
            Mistakes: {mistakes}
          </span>
        </div>

        <h2 className="fw-bold text-rose mb-3 fs-3 fs-md-2">
          {isShowingSequence ? "Watch the Sequence Carefully!" : "Your Turn: Tap the Buttons in Order!"}
        </h2>

        {/* Feedback Banner */}
        {feedback && (
          <div className={`alert ${feedback.type === 'right' ? 'alert-success' : 'alert-danger'} fs-4 fs-md-3 p-3 rounded-4 mb-4 fw-bold shadow-sm d-flex flex-column align-items-center justify-content-center gap-2`}>
            <div>{feedback.message}</div>
            {feedback.type === 'wrong' && (
              <button 
                onClick={handleTryAgain}
                className="btn patient-btn patient-btn-danger fs-5 fs-md-4 px-4 py-2 mt-2"
              >
                <i className="bi bi-arrow-counterclockwise me-2"></i> Try Again (Watch Sequence)
              </button>
            )}
          </div>
        )}

        {/* Interactive Pad */}
        <div className="row g-3 g-md-4 justify-content-center my-3 my-md-4">
          {BUTTONS.map((item) => (
            <div key={item.num} className="col-6 col-md-3">
              <button
                onClick={() => handleButtonClick(item.num)}
                disabled={isShowingSequence || completed || (feedback?.type === 'wrong')}
                className="btn w-100 py-4 py-md-5 fs-3 fs-md-2 fw-bold rounded-4 shadow"
                style={{
                  backgroundColor: activeButton === item.num ? '#FFD54F' : item.color,
                  borderColor: activeButton === item.num ? '#3D2630' : item.color,
                  color: '#FFFFFF'
                }}
              >
                {item.label}
              </button>
            </div>
          ))}
        </div>

        <div className="fs-4 fw-bold text-secondary">
          Progress: {userSequence.length} / {sequence.length} items completed
        </div>
      </div>

      {completed && (() => {
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
                <i className="bi bi-award-fill display-1 text-warning mb-2"></i>
                <h2 className="fw-bold text-success display-5">🎉 Level {level} Sequence Completed! Great Job!</h2>
              </>
            ) : (
              <>
                <i className="bi bi-star-fill display-1 text-warning mb-2"></i>
                <h2 className="fw-bold text-primary display-5">💛 Good Try on Level {level}!</h2>
                <p className="fs-4 text-muted mt-1 mb-2">Let's practice this level once more to build confidence.</p>
              </>
            )}

            <p className="fs-3 fw-bold mt-2">
              Score: {score} pts | Sequence Length: {sequence.length}
            </p>

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

export default SequenceMemory;
