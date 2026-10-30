import React, { useState } from 'react';

const LevelSelector = ({
  activityKey,
  currentLevel,
  maxUnlockedLevel,
  onSelectLevel,
  totalLevels = 10,
  speakInstruction
}) => {
  const [warning, setWarning] = useState(null);

  const handleLevelClick = (lvlNum) => {
    if (lvlNum > maxUnlockedLevel) {
      const msg = `⚠️ Level ${lvlNum} is locked! Please complete Level ${maxUnlockedLevel} first.`;
      setWarning(msg);
      if (speakInstruction) {
        speakInstruction(`Level ${lvlNum} is locked. Please complete Level ${maxUnlockedLevel} first to unlock it.`);
      }
    } else {
      setWarning(null);
      onSelectLevel(lvlNum);
    }
  };

  return (
    <div className="my-2">
      {/* Warning Banner for Locked Level */}
      {warning && (
        <div className="alert alert-warning alert-dismissible fade show d-flex align-items-center justify-content-between rounded-4 shadow-sm mb-3 fs-5 fw-bold p-3 border-warning" role="alert">
          <div>
            <i className="bi bi-lock-fill me-2 fs-4 text-warning"></i>
            {warning}
          </div>
          <button
            type="button"
            className="btn-close ms-2"
            onClick={() => setWarning(null)}
            aria-label="Close"
          ></button>
        </div>
      )}

      {/* Level Selection Button Bar */}
      <div className="d-flex flex-wrap justify-content-center gap-2">
        {Array.from({ length: totalLevels }, (_, i) => i + 1).map((lvlNum) => {
          const isCurrent = currentLevel === lvlNum;
          const isUnlocked = lvlNum <= maxUnlockedLevel;

          return (
            <button
              key={lvlNum}
              type="button"
              onClick={() => handleLevelClick(lvlNum)}
              className={`btn fs-6 fw-bold px-3 py-2 rounded-3 transition-all d-flex align-items-center gap-1 ${
                isCurrent
                  ? 'patient-btn-primary shadow'
                  : isUnlocked
                  ? 'btn-outline-danger'
                  : 'btn-light text-muted border border-secondary-subtle opacity-75'
              }`}
              title={isUnlocked ? `Level ${lvlNum}` : `Level ${lvlNum} (Locked - Complete Level ${maxUnlockedLevel} first)`}
            >
              {!isUnlocked && <i className="bi bi-lock-fill text-muted fs-6"></i>}
              {isUnlocked && isCurrent && <i className="bi bi-play-fill fs-6"></i>}
              Lvl {lvlNum}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LevelSelector;
