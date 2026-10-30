import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useVoice } from '../context/VoiceContext';
import { sessionsAPI } from '../services/api';
import LevelSelector from '../components/LevelSelector';

const EMOJI_POOL = [
  '🍎', '🐶', '🚗', '📚', '🌻', '⚽', '🎨', '🔔',
  '🥑', '🚀', '🎸', '🍦', '🐘', '🦋', '🧸', '🌈',
  '🍕', '🚲', '🎁', '🏖️', '🍩', '🪀', '👑', '🏀'
];

const LEVEL_CONFIG = {
  1: { name: 'Level 1', pairs: 2, cols: 'col-6 col-md-3', diffName: 'Easy' },
  2: { name: 'Level 2', pairs: 3, cols: 'col-4 col-md-4', diffName: 'Easy' },
  3: { name: 'Level 3', pairs: 4, cols: 'col-4 col-md-3', diffName: 'Easy' },
  4: { name: 'Level 4', pairs: 5, cols: 'col-4 col-md-3', diffName: 'Medium' },
  5: { name: 'Level 5', pairs: 6, cols: 'col-4 col-md-3', diffName: 'Medium' },
  6: { name: 'Level 6', pairs: 7, cols: 'col-3 col-md-3', diffName: 'Medium' },
  7: { name: 'Level 7', pairs: 8, cols: 'col-3 col-md-3', diffName: 'Medium' },
  8: { name: 'Level 8', pairs: 9, cols: 'col-3 col-md-3', diffName: 'Hard' },
  9: { name: 'Level 9', pairs: 10, cols: 'col-3 col-md-3', diffName: 'Hard' },
  10: { name: 'Level 10', pairs: 12, cols: 'col-3 col-md-2', diffName: 'Hard' }
};

const getLevelFromDifficulty = (diff) => {
  if (!diff) return 1;
  const d = String(diff).toLowerCase();
  if (d === 'hard') return 8;
  if (d === 'medium') return 4;
  return 1;
};

const MemoryMatching = () => {
  const { user } = useAuth();
  const { speakInstruction } = useVoice();
  const navigate = useNavigate();
  const location = useLocation();

  const [level, setLevel] = useState(1);
  const [maxUnlockedLevel, setMaxUnlockedLevel] = useState(() => {
    const saved = localStorage.getItem(`unlocked_lvl_${user?.id || 'guest'}_memory_matching`);
    return saved ? parseInt(saved, 10) : 1;
  });
  const [cards, setCards] = useState([]);
  const [seenIndices, setSeenIndices] = useState(new Set());
  const [flippedIndices, setFlippedIndices] = useState([]);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    speakInstruction("Memory Matching Activity. Select matching pairs of cards.");
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

  const shuffleDeck = (numPairs) => {
    const shuffledPool = [...EMOJI_POOL].sort(() => Math.random() - 0.5);
    const selectedEmojis = shuffledPool.slice(0, numPairs);
    
    return [...selectedEmojis, ...selectedEmojis]
      .sort(() => Math.random() - 0.5)
      .map((emoji, id) => ({ id, emoji, matched: false }));
  };

  const startLevel = (lvlNum) => {
    setLevel(lvlNum);
    const cfg = LEVEL_CONFIG[lvlNum] || LEVEL_CONFIG[1];
    const deck = shuffleDeck(cfg.pairs);

    setCards(deck);
    setSeenIndices(new Set());
    setFlippedIndices([]);
    setMatchedPairs(0);
    setScore(0);
    setMistakes(0);
    setAttempts(0);
    setStartTime(Date.now());
    setFeedback(null);
    setCompleted(false);
    setResult(null);
    setCountdown(null);
    speakInstruction(`Starting Level ${lvlNum}. Match ${cfg.pairs} hidden pairs.`);
  };

  const handleCardClick = (index) => {
    if (completed || flippedIndices.length === 2 || cards[index].matched || flippedIndices.includes(index)) {
      return;
    }

    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      setAttempts((prev) => prev + 1);
      const [idx1, idx2] = newFlipped;
      if (cards[idx1].emoji === cards[idx2].emoji) {
        // Match!
        const addedScore = 25 * level;
        const updatedScore = score + addedScore;
        setScore(updatedScore);
        setCards((prev) => prev.map((c, i) => i === idx1 || i === idx2 ? { ...c, matched: true } : c));
        
        const newPairs = matchedPairs + 1;
        setMatchedPairs(newPairs);
        setFeedback({
          type: 'right',
          message: `🎉 Congratulations! Match found!`
        });
        speakInstruction(`Congratulations! Great match!`);

        const cfg = LEVEL_CONFIG[level];
        if (newPairs === cfg.pairs) {
          handleFinishGame(updatedScore, mistakes, attempts + 1);
        }
        setTimeout(() => {
          setFlippedIndices([]);
          setFeedback(null);
        }, 1000);
      } else {
        // No match! Check if either card was already revealed in a previous turn
        const wasIdx1Seen = seenIndices.has(idx1);
        const wasIdx2Seen = seenIndices.has(idx2);

        if (wasIdx1Seen || wasIdx2Seen) {
          // Card opened for the 2nd time or more and still does not match -> Count as a mistake!
          setMistakes((prev) => prev + 1);
          setFeedback({
            type: 'wrong',
            message: `Oh oh! Not a match. Give it another try!`
          });
          speakInstruction("Oh oh! Not a match. Try again!");
        } else {
          // Both cards opened for the very first time -> Exploration / Discovery (DO NOT count as mistake)
          setFeedback({
            type: 'info',
            message: `👀 Good look! Remember these two cards for later.`
          });
          speakInstruction("Good look! Remember where these cards are.");
        }

        // Mark both cards as seen now that they have been revealed
        setSeenIndices((prev) => {
          const next = new Set(prev);
          next.add(idx1);
          next.add(idx2);
          return next;
        });

        setTimeout(() => {
          setFlippedIndices([]);
          setFeedback(null);
        }, 1100);
      }
    }
  };

  const handleTryAgain = () => {
    setFlippedIndices([]);
    setFeedback(null);
  };

  const handleFinishGame = async (finalScore, finalMistakes, finalAttempts) => {
    setCompleted(true);
    setCountdown(5);
    const durationSeconds = Math.max(5, Math.round((Date.now() - startTime) / 1000));
    const cfg = LEVEL_CONFIG[level];
    const accuracyVal = Math.max(0, Math.min(100, Math.round((cfg.pairs / (cfg.pairs + finalMistakes)) * 100)));

    setLoading(true);
    const isPassing = finalMistakes <= 2;
    const isDemoting = !isPassing && level > 1 && finalMistakes >= 4;
    const adaptLevel = isPassing ? Math.min(10, level + 1) : (isDemoting ? Math.max(1, level - 1) : level);

    if (isDemoting) {
      setMaxUnlockedLevel(adaptLevel);
      localStorage.setItem(`unlocked_lvl_${user?.id || 'guest'}_memory_matching`, adaptLevel);
      speakInstruction(`Wonderful effort! You worked really hard. Let's take a gentle step back to Level ${adaptLevel} to practice together and build our confidence!`);
    } else if (isPassing) {
      speakInstruction(`Awesome job! Level ${level} completed! Advancing to next level.`);
    } else {
      speakInstruction(`Good try on Level ${level}. Let's practice Level ${level} once more to strengthen your card matching.`);
    }

    try {
      const res = await sessionsAPI.create({
        patient_id: user.id,
        activity_id: 1, // Memory Matching
        score: finalScore,
        accuracy: accuracyVal,
        completion_time: durationSeconds,
        mistakes: finalMistakes,
        attempts: finalAttempts,
        difficulty: cfg.diffName
      });

      setResult(res.data);
    } catch (err) {
      console.error("Session submit error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleNextLevelOrActivity = () => {
    const isPassing = mistakes <= 2;
    const isDemoting = !isPassing && level > 1 && mistakes >= 4;

    if (isPassing) {
      const nextLvl = level + 1;
      if (nextLvl > maxUnlockedLevel && nextLvl <= 10) {
        setMaxUnlockedLevel(nextLvl);
        localStorage.setItem(`unlocked_lvl_${user?.id || 'guest'}_memory_matching`, nextLvl);
      }
      if (level < 10) {
        startLevel(level + 1);
      } else {
        navigate('/patient/activities/picture-recall');
      }
    } else if (isDemoting) {
      const adaptLevel = Math.max(1, level - 1);
      setMaxUnlockedLevel(adaptLevel);
      localStorage.setItem(`unlocked_lvl_${user?.id || 'guest'}_memory_matching`, adaptLevel);
      startLevel(adaptLevel);
    } else {
      startLevel(level);
    }
  };

  const cfg = LEVEL_CONFIG[level];

  return (
    <div className="container py-4 patient-view">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h1 className="fw-extrabold text-rose mb-1">Activity 1: Memory Matching</h1>
          <p className="text-secondary fs-4 mb-0">Find hidden pairs. Complete levels to unlock harder challenges.</p>
        </div>
        
        {/* Multi-level selector */}
        <LevelSelector
          activityKey="memory_matching"
          currentLevel={level}
          maxUnlockedLevel={maxUnlockedLevel}
          onSelectLevel={startLevel}
          speakInstruction={speakInstruction}
        />
      </div>

      {/* Game Stats */}
      <div className="row g-3 mb-4 text-center">
        <div className="col">
          <div className="p-3 bg-white border border-rose rounded-3 shadow-sm">
            <div className="text-secondary fs-5">Current Level</div>
            <div className="fs-2 fw-bold text-rose">Level {level} ({cfg.pairs} Pairs)</div>
          </div>
        </div>
        <div className="col">
          <div className="p-3 bg-white border border-rose rounded-3 shadow-sm">
            <div className="text-secondary fs-5">Score</div>
            <div className="fs-2 fw-bold text-rose">{score}</div>
          </div>
        </div>
        <div className="col">
          <div className="p-3 bg-white border border-rose rounded-3 shadow-sm">
            <div className="text-secondary fs-5">Mistakes</div>
            <div className="fs-2 fw-bold text-danger">{mistakes}</div>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className={`alert ${feedback.type === 'right' ? 'alert-success' : feedback.type === 'info' ? 'alert-info border-info text-dark' : 'alert-danger'} fs-3 p-3 rounded-4 mb-4 fw-bold shadow-sm d-flex flex-column align-items-center justify-content-center gap-2 text-center`}>
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

      {/* Game Board */}
      <div className="row g-3 justify-content-center mb-5">
        {cards.map((card, index) => {
          const isFlipped = card.matched || flippedIndices.includes(index);
          return (
            <div key={card.id} className={cfg.cols}>
              <div 
                className={`matching-card ${isFlipped ? 'flipped' : ''} ${card.matched ? 'matched' : ''}`}
                onClick={() => handleCardClick(index)}
              >
                <div className="matching-card-inner">
                  <div className="matching-card-front">❓</div>
                  <div className="matching-card-back">{card.emoji}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Level Completion Card */}
      {completed && (() => {
        const isPassing = mistakes <= 2;
        const isDemoting = !isPassing && level > 1 && mistakes >= 4;
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
                <i className="bi bi-trophy-fill display-1 text-warning mb-2"></i>
                <h2 className="fw-bold text-success display-5">🎉 Level {level} Completed! Great Job!</h2>
              </>
            ) : (
              <>
                <i className="bi bi-star-fill display-1 text-warning mb-2"></i>
                <h2 className="fw-bold text-primary display-5">💛 Good Try on Level {level}!</h2>
                <p className="fs-4 text-muted mt-1 mb-2">Let's practice this level once more to build confidence.</p>
              </>
            )}

            <p className="fs-3 fw-bold text-dark mt-2 mb-3">
              Score: {score} pts | Pairs Matched: {matchedPairs}
            </p>

            {result && result.recommendation && (
              <div className="alert alert-info fs-4 p-3 rounded-4 my-3">
                <i className="bi bi-info-circle-fill me-2"></i>
                {result.recommendation.recommendation_reason || result.recommendation.message}
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

            <div className="d-flex justify-content-center gap-3 mt-3 flex-wrap">
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

export default MemoryMatching;
