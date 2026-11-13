import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useVoice } from '../context/VoiceContext';
import { sessionsAPI, familiarPeopleAPI } from '../services/api';
import LevelSelector from '../components/LevelSelector';

const LEVEL_CONFIG = {
  1: { numChoices: 3, rounds: 2, diffName: 'Easy' },
  2: { numChoices: 3, rounds: 3, diffName: 'Easy' },
  3: { numChoices: 4, rounds: 3, diffName: 'Easy' },
  4: { numChoices: 4, rounds: 4, diffName: 'Medium' },
  5: { numChoices: 4, rounds: 5, diffName: 'Medium' },
  6: { numChoices: 5, rounds: 5, diffName: 'Medium' },
  7: { numChoices: 5, rounds: 6, diffName: 'Medium' },
  8: { numChoices: 6, rounds: 6, diffName: 'Hard' },
  9: { numChoices: 6, rounds: 7, diffName: 'Hard' },
  10: { numChoices: 6, rounds: 8, diffName: 'Hard' }
};

const getLevelFromDifficulty = (diff) => {
  if (!diff) return 1;
  const d = String(diff).toLowerCase();
  if (d === 'hard') return 8;
  if (d === 'medium') return 4;
  return 1;
};

const NameFaceRecognition = () => {
  const { user } = useAuth();
  const { speakInstruction } = useVoice();
  const navigate = useNavigate();
  const location = useLocation();

  const [level, setLevel] = useState(1);
  const [maxUnlockedLevel, setMaxUnlockedLevel] = useState(() => {
    const saved = localStorage.getItem(`unlocked_lvl_${user?.id || 'guest'}_name_face`);
    return saved ? parseInt(saved, 10) : 1;
  });
  const [facesPool, setFacesPool] = useState([]);
  const [loading, setLoading] = useState(true);
  const facesPoolRef = useRef([]);

  const [roundIndex, setRoundIndex] = useState(0);
  const [targetPerson, setTargetPerson] = useState(null);
  const [faceChoices, setFaceChoices] = useState([]);
  const [stage, setStage] = useState('question'); // 'question', 'result'
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [selectedFaceId, setSelectedFaceId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [mlResult, setMlResult] = useState(null);
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    fetchFamiliarFaces();
  }, [user?.id]);

  useEffect(() => {
    let timer;
    if (stage === 'result' && countdown !== null && countdown > 0) {
      timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
    } else if (stage === 'result' && countdown === 0) {
      handleNextLevelOrActivity();
    }
    return () => clearTimeout(timer);
  }, [stage, countdown]);

  const fetchFamiliarFaces = async () => {
    setLoading(true);
    try {
      if (!user?.id) {
        setFacesPool([]);
        facesPoolRef.current = [];
        setLoading(false);
        return;
      }

      const res = await familiarPeopleAPI.getByPatientId(user.id);
      if (res.data && res.data.length > 0) {
        const customFaces = res.data.map((f, i) => ({
          id: `custom_${f.id || i}`,
          name: f.name,
          relationship: f.relationship,
          photo_path: f.photo_path,
          description: f.description
        }));
        setFacesPool(customFaces);
        facesPoolRef.current = customFaces;

        const initLvl = getLevelFromDifficulty(location.state?.difficulty);
        const startingLvl = Math.min(initLvl, maxUnlockedLevel);
        startLevel(startingLvl, customFaces);
      } else {
        setFacesPool([]);
        facesPoolRef.current = [];
        speakInstruction("No familiar faces have been added yet. Please ask your caregiver to add photos of your family and friends.");
      }
    } catch (err) {
      console.error("Error fetching familiar faces:", err);
      setFacesPool([]);
      facesPoolRef.current = [];
    } finally {
      setLoading(false);
    }
  };

  const startLevel = (lvlNum, poolToUse = facesPoolRef.current) => {
    if (!poolToUse || poolToUse.length === 0) return;
    setLevel(lvlNum);
    setScore(0);
    setMistakes(0);
    setAttempts(0);
    setRoundIndex(0);
    setStage('question');
    setStartTime(Date.now());
    setMlResult(null);
    setCountdown(null);
    setupRound(0, lvlNum, poolToUse);
  };

  const setupRound = (rIdx, lvlNum, poolToUse = facesPoolRef.current) => {
    if (!poolToUse || poolToUse.length === 0) return;
    const cfg = LEVEL_CONFIG[lvlNum] || LEVEL_CONFIG[1];
    setSelectedFaceId(null);
    setFeedback(null);

    // Pick target person from patient's familiar pool
    const shuffledPool = [...poolToUse].sort(() => Math.random() - 0.5);
    const target = shuffledPool[0];
    setTargetPerson(target);

    // Pick distractor faces from familiar pool (capped to available pool size)
    const count = Math.min(cfg.numChoices, poolToUse.length);
    const distractors = shuffledPool.slice(1, count);
    const choices = [target, ...distractors].sort(() => Math.random() - 0.5);
    setFaceChoices(choices);

    // Speak prompt instruction
    const promptText = `Which photo shows ${target.name}, your ${target.relationship}?`;
    speakInstruction(promptText);
  };

  const handleFaceSelect = (chosenFace) => {
    if (selectedFaceId !== null && feedback?.type === 'right') return;

    setSelectedFaceId(chosenFace.id);
    setAttempts(prev => prev + 1);

    if (chosenFace.id === targetPerson.id) {
      const addedScore = 30 * level;
      const newScore = score + addedScore;
      setScore(newScore);
      setFeedback({
        type: 'right',
        message: `🎉 Correct! That is ${targetPerson.name} (${targetPerson.relationship})!`
      });
      speakInstruction(`Great job! Correct! That is ${targetPerson.name}.`);

      const cfg = LEVEL_CONFIG[level] || LEVEL_CONFIG[1];
      if (roundIndex + 1 < cfg.rounds) {
        setTimeout(() => {
          const nextR = roundIndex + 1;
          setRoundIndex(nextR);
          setupRound(nextR, level, facesPoolRef.current);
        }, 1600);
      } else {
        setTimeout(() => {
          finishLevel(newScore, mistakes);
        }, 1600);
      }
    } else {
      const newMistakes = mistakes + 1;
      setMistakes(newMistakes);
      setFeedback({
        type: 'wrong',
        message: `That is ${chosenFace.name}. Try finding ${targetPerson.name}!`
      });
      speakInstruction(`That is ${chosenFace.name}. Tap on the photo of ${targetPerson.name}.`);
    }
  };

  const finishLevel = async (finalScore, finalMistakes) => {
    setStage('result');
    setCountdown(5);
    const durationSeconds = Math.max(5, Math.round((Date.now() - startTime) / 1000));
    const cfg = LEVEL_CONFIG[level] || LEVEL_CONFIG[1];
    const totalPossible = cfg.rounds * 30 * level;
    const accuracyVal = Math.round((finalScore / (totalPossible || 1)) * 100);

    const isPassing = finalMistakes <= 1;
    const isDemoting = !isPassing && level > 1 && finalMistakes >= 3;
    const adaptLevel = isPassing ? Math.min(10, level + 1) : (isDemoting ? Math.max(1, level - 1) : level);

    if (isDemoting) {
      setMaxUnlockedLevel(adaptLevel);
      localStorage.setItem(`unlocked_lvl_${user?.id || 'guest'}_name_face`, adaptLevel);
      speakInstruction(`Wonderful effort! You worked really hard. Let's take a gentle step back to Level ${adaptLevel} to practice together and build our confidence!`);
    } else if (isPassing) {
      speakInstruction(`Level ${level} complete! Outstanding face recall.`);
    } else {
      speakInstruction(`Good try on Level ${level}. Let's practice Level ${level} once more to strengthen your face and name recall.`);
    }

    try {
      const res = await sessionsAPI.create({
        patient_id: user.id,
        activity_id: 6, // Name & Face Recognition
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
        localStorage.setItem(`unlocked_lvl_${user?.id || 'guest'}_name_face`, nextLvl);
      }
      if (level < 10) {
        startLevel(level + 1, facesPoolRef.current);
      } else {
        navigate('/patient/activities/event-sequence');
      }
    } else if (isDemoting) {
      const adaptLevel = Math.max(1, level - 1);
      setMaxUnlockedLevel(adaptLevel);
      localStorage.setItem(`unlocked_lvl_${user?.id || 'guest'}_name_face`, adaptLevel);
      startLevel(adaptLevel, facesPoolRef.current);
    } else {
      startLevel(level, facesPoolRef.current);
    }
  };

  const cfg = LEVEL_CONFIG[level] || LEVEL_CONFIG[1];

  return (
    <div className="container py-4 patient-view text-center">
      {/* Top Header */}
      <div className="card border-0 rounded-4 shadow-sm bg-white p-4 mb-4" style={{ borderLeft: '6px solid #8FAF9A' }}>
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
          <div className="text-start">
            <span className="badge bg-rose-light text-rose fs-6 px-3 py-2 rounded-pill mb-2 border border-rose">
              <i className="bi bi-people-fill me-1"></i> Activity 6: Face Recognition
            </span>
            <h1 className="fw-extrabold text-rose mb-1">Familiar Face Recognition Challenge</h1>
            <p className="text-secondary fs-4 mb-0">Identify your family members and loved ones from the photos.</p>
          </div>

          {/* Level Switcher (only shown when familiar faces are present) */}
          {facesPool.length > 0 && (
            <LevelSelector
              activityKey="name_face"
              currentLevel={level}
              maxUnlockedLevel={maxUnlockedLevel}
              onSelectLevel={(lvl) => startLevel(lvl, facesPoolRef.current)}
              speakInstruction={speakInstruction}
            />
          )}
        </div>
      </div>

      {loading ? (
        <div className="card patient-card text-center p-5 my-4 border-0 shadow-sm">
          <div className="spinner-border text-primary mx-auto mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <h3 className="fw-bold text-dark mb-1">Loading Your Familiar Faces...</h3>
          <p className="text-secondary fs-5 mb-0">Checking your family photos and loved ones.</p>
        </div>
      ) : facesPool.length === 0 ? (
        <div className="card patient-card text-center p-4 p-md-5 my-4 border-rose shadow-sm" style={{ borderTop: '6px solid #D4A5A5' }}>
          <div className="mb-3">
            <div className="rounded-circle d-inline-flex p-4 bg-rose-light text-rose mb-2 shadow-sm">
              <i className="bi bi-people display-2"></i>
            </div>
          </div>
          <h2 className="display-6 fw-extrabold text-dark mb-2">
            No Familiar People Added Yet
          </h2>
          <p className="fs-4 text-secondary mb-4 mx-auto" style={{ maxWidth: '640px' }}>
            Your caregiver hasn't uploaded or added any familiar family members or friends yet. 
            To protect your comfort and privacy, we do not show random unknown people.
          </p>

          <div className="alert alert-light border border-2 border-secondary-subtle d-inline-block text-start p-3 p-md-4 rounded-4 mb-4 shadow-sm" style={{ maxWidth: '600px', backgroundColor: '#FAF7F2' }}>
            <div className="d-flex align-items-center gap-2 mb-2 text-dark fw-bold fs-5">
              <i className="bi bi-info-circle-fill text-primary"></i>
              <span>How to play this activity:</span>
            </div>
            <p className="text-secondary fs-6 mb-2">
              Please ask your caregiver to log into the <strong>Caregiver Portal</strong> and add your family members, friends, or companions under <strong>Familiar Faces</strong>.
            </p>
            <p className="text-secondary fs-6 mb-0">
              Once photos and names are added, this memory game will automatically activate with their faces!
            </p>
          </div>

          <div className="d-flex justify-content-center gap-3 flex-wrap">
            <button 
              onClick={() => navigate('/patient/activities')} 
              className="btn patient-btn patient-btn-primary fs-4 px-4 py-3"
            >
              <i className="bi bi-arrow-left-circle me-2"></i> Back to Activities
            </button>
            <button 
              onClick={() => navigate('/patient/familiar-faces')} 
              className="btn patient-btn btn-outline-secondary fs-4 px-4 py-3"
            >
              <i className="bi bi-person-lines-fill me-2"></i> View Familiar Faces
            </button>
          </div>
        </div>
      ) : (
        <>
          {stage === 'question' && targetPerson && (
            <div className="card patient-card p-4 p-md-5 shadow-lg my-4 border-rose">
              <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <span className="badge bg-rose-light text-rose border border-rose fs-5 px-3 py-2 rounded-pill">
                  Round {roundIndex + 1} of {cfg.rounds} — Level {level} ({cfg.diffName})
                </span>
                <span className="badge bg-secondary fs-5 px-3 py-2 rounded-pill">
                  Score: {score} pts | Mistakes: {mistakes}
                </span>
              </div>

              {/* Target Question Banner */}
              <div className="bg-rose-light p-4 rounded-4 border border-rose mb-4 shadow-sm">
                <h2 className="display-5 fw-extrabold text-rose mb-1">
                  Which photo is <span className="text-decoration-underline">{targetPerson.name}</span>?
                </h2>
                <p className="fs-3 text-secondary mb-0">
                  Relationship: <strong>{targetPerson.relationship}</strong>
                  {targetPerson.description && ` — “${targetPerson.description}”`}
                </p>
              </div>

              {/* Friendly Note if caregiver added only 1 person */}
              {facesPool.length < 2 && (
                <div className="alert alert-light border border-primary-subtle text-primary fs-5 rounded-4 mb-3">
                  <i className="bi bi-lightbulb-fill me-2"></i>
                  <strong>Friendly Tip:</strong> Your caregiver has added 1 familiar person. Ask your caregiver to add more family members or friends in the Caregiver Portal to unlock multi-choice quiz mode!
                </div>
              )}

              {/* Feedback Banner */}
              {feedback && (
                <div className={`alert ${feedback.type === 'right' ? 'alert-success' : 'alert-danger'} fs-3 p-3 rounded-4 mb-4 fw-bold shadow-sm`}>
                  {feedback.message}
                </div>
              )}

              {/* Face Photo Choices Grid */}
              <div className="row g-4 justify-content-center">
                {faceChoices.map((faceChoice) => {
                  const isSelected = selectedFaceId === faceChoice.id;
                  const isCorrectChoice = faceChoice.id === targetPerson.id;

                  let cardBorder = 'border-2 border-secondary';
                  if (isSelected) {
                    cardBorder = isCorrectChoice ? 'border-4 border-success shadow-lg scale-105' : 'border-4 border-danger shadow-sm';
                  }

                  const colClass = faceChoices.length === 1 ? 'col-10 col-md-5' : (cfg.numChoices === 6 ? 'col-6 col-md-4' : 'col-6 col-md-3');

                  return (
                    <div key={faceChoice.id} className={colClass}>
                      <div
                        onClick={() => handleFaceSelect(faceChoice)}
                        className={`card patient-card p-3 cursor-pointer text-center transition-all h-100 ${cardBorder} ${
                          isSelected && isCorrectChoice ? 'bg-success bg-opacity-10' : 'bg-white'
                        }`}
                        style={{ borderRadius: '20px' }}
                      >
                        <img
                          src={faceChoice.photo_path}
                          alt="Choice face"
                          className="rounded-circle mx-auto mb-3 shadow-md"
                          style={{
                            width: faceChoices.length === 1 ? '180px' : (cfg.numChoices === 6 ? '130px' : '160px'),
                            height: faceChoices.length === 1 ? '180px' : (cfg.numChoices === 6 ? '130px' : '160px'),
                            objectFit: 'cover'
                          }}
                        />
                        <button
                          type="button"
                          className={`btn patient-btn w-100 fs-5 fw-bold ${
                            isSelected
                              ? isCorrectChoice ? 'patient-btn-success' : 'patient-btn-danger'
                              : 'btn-outline-danger'
                          }`}
                        >
                          {isSelected && isCorrectChoice ? '✓ Correct Person' : isSelected ? '✕ Wrong Person' : 'Tap Photo'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
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
                    <i className="bi bi-person-check-fill display-1 text-success mb-2"></i>
                    <h2 className="fw-bold text-success display-5">🎉 Level {level} Face Recognition Complete! Great Job!</h2>
                  </>
                ) : (
                  <>
                    <i className="bi bi-star-fill display-1 text-warning mb-2"></i>
                    <h2 className="fw-bold text-primary display-5">💛 Good Try on Level {level}!</h2>
                    <p className="fs-4 text-muted mt-1 mb-2">Let's practice this level once more to build confidence.</p>
                  </>
                )}

                <p className="fs-3 fw-bold mt-2">Final Score: {score} pts | Total Mistakes: {mistakes}</p>

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
                      <button onClick={() => startLevel(level, facesPoolRef.current)} className="btn patient-btn btn-outline-secondary fs-4">
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
        </>
      )}
    </div>
  );
};

export default NameFaceRecognition;
