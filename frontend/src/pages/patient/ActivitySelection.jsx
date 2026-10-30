import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { recommendationsAPI } from '../../services/api';

const getActivityConfig = (t) => [
  {
    id: 1,
    name: t('memoryMatching', 'Memory Matching'),
    icon: 'bi-grid-3x3-gap-fill',
    color: '#4B3F3F',
    route: '/patient/activities/matching',
    description: 'Find matching hidden pairs of cards.'
  },
  {
    id: 2,
    name: t('pictureRecall', 'Picture Recall'),
    icon: 'bi-image-fill',
    color: '#D4A5A5',
    route: '/patient/activities/picture-recall',
    description: 'Look at pictures and recall what was shown.'
  },
  {
    id: 3,
    name: t('sequenceMemory', 'Sequence Memory'),
    icon: 'bi-123',
    color: '#C9B7A7',
    route: '/patient/activities/sequence',
    description: 'Remember and repeat the light-up sequence.'
  },
  {
    id: 4,
    name: t('objectRecognition', 'Object Recognition'),
    icon: 'bi-search',
    color: '#4B3F3F',
    route: '/patient/activities/object-recognition',
    description: 'Identify familiar household objects from photos.'
  },
  {
    id: 5,
    name: t('wordMemory', 'Word Memory'),
    icon: 'bi-file-text-fill',
    color: '#D4A5A5',
    route: '/patient/activities/word-memory',
    description: 'Memorize short word lists and identify them.'
  },
  {
    id: 6,
    name: t('nameFaceRecognition', 'Name & Face Recognition'),
    icon: 'bi-person-bounding-box',
    color: '#C9B7A7',
    route: '/patient/activities/name-face',
    description: 'Match familiar faces with their names.'
  },
  {
    id: 7,
    name: t('dailyEventSequencing', 'Daily Event Sequencing'),
    icon: 'bi-sort-numeric-down',
    color: '#4B3F3F',
    route: '/patient/activities/event-sequence',
    description: 'Arrange daily activities in right order.'
  },
  {
    id: 8,
    name: t('simplePuzzles', 'Simple Puzzles'),
    icon: 'bi-puzzle-fill',
    color: '#D4A5A5',
    route: '/patient/activities/puzzles',
    description: 'Solve odd-one-out and pattern completion games.'
  }
];

const ActivitySelection = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activityProfiles, setActivityProfiles] = useState({});

  const activities = getActivityConfig(t);

  useEffect(() => {
    if (user) {
      fetchPatientProfile();
    }
  }, [user]);

  const fetchPatientProfile = async () => {
    try {
      const res = await recommendationsAPI.getProfile(user.id);
      if (res.data && res.data.activities) {
        const profileMap = {};
        res.data.activities.forEach(act => {
          profileMap[act.activity_id] = act.recommended_level || 'Easy';
        });
        setActivityProfiles(profileMap);
      }
    } catch (err) {
      console.error("Failed to fetch activity profile:", err);
    }
  };

  const handleSelectActivity = (act) => {
    const recommendedDifficulty = activityProfiles[act.id] || 'Easy';
    navigate(act.route, { state: { difficulty: recommendedDifficulty } });
  };

  return (
    <div className="container py-4 patient-view">
      <div className="mb-4">
        <h1 className="fw-extrabold text-rose mb-1">{t('selectActivityTitle', 'Select a Cognitive Activity')}</h1>
      </div>

      <div className="row g-4">
        {activities.map((act) => {
          const recLevel = activityProfiles[act.id] || 'Easy';
          return (
            <div key={act.id} className="col-md-6 col-lg-3">
              <div 
                onClick={() => handleSelectActivity(act)}
                className="card patient-card text-center h-100 p-3 cursor-pointer"
                style={{ borderTop: `6px solid ${act.color}` }}
              >
                <div className="card-body d-flex flex-column justify-content-between align-items-center">
                  <div>
                    <i className={`bi ${act.icon} display-3 mb-3`} style={{ color: act.color }}></i>
                    <h3 className="fw-bold fs-4 mb-1">{act.name}</h3>
                    <div className="mb-2">
                      <span className={`badge ${
                        recLevel === 'Hard' ? 'bg-danger' :
                        recLevel === 'Medium' ? 'bg-warning text-dark' : 'bg-success'
                      } fs-6 px-3 py-1 rounded-pill`}>
                        Adaptive: {recLevel}
                      </span>
                    </div>
                    <p className="text-muted fs-5 mb-4">{act.description}</p>
                  </div>
                  <button className="btn patient-btn patient-btn-primary w-100 mt-auto">
                    {t('startActivity', 'Start Game')}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActivitySelection;
