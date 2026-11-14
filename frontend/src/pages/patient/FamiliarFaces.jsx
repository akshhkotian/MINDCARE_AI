import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { familiarPeopleAPI } from '../../services/api';
import HelpButton from '../../components/HelpButton';

const FamiliarFaces = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPeople();
    }
  }, [user]);

  const fetchPeople = async () => {
    try {
      const res = await familiarPeopleAPI.getByPatientId(user.id);
      setPeople(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-4 patient-view">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <span className="badge bg-rose-light text-rose border border-rose fs-6 px-3 py-2 rounded-pill mb-2">
            {t('familyMemoryCare', 'Family & Memory Care')}
          </span>
          <h1 className="fw-extrabold text-rose mb-1">{t('yourFamiliarFaces', 'Your Familiar Faces')}</h1>
          <p className="text-secondary fs-4 mb-0">{t('familyPhotosSubtitle', 'Photos of your loving family members, friends, and daily routine companions.')}</p>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button 
            onClick={() => navigate('/patient/activities/name-face')}
            className="btn patient-btn patient-btn-primary fs-5 px-4 py-3"
          >
            {t('playNameFaceGame', 'Play Name & Face Game')} <i className="bi bi-controller ms-2"></i>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5 text-secondary fs-4">{t('loadingFamiliarFaces', 'Loading your familiar faces...')}</div>
      ) : people.length === 0 ? (
        <div className="card patient-card text-center p-5">
          <i className="bi bi-people display-1 text-rose mb-3"></i>
          <h2 className="fw-bold text-dark mb-2">{t('noFamiliarFacesYet', 'No Familiar Faces Added Yet')}</h2>
          <p className="text-secondary fs-4 mb-4">{t('caregiverUploadPhotosMsg', 'Your caregiver will upload photos of family members and friends so you can view them and practice memory games here.')}</p>
        </div>
      ) : (
        <div className="row g-4">
          {people.map((person) => (
            <div key={person.id} className="col-md-6 col-lg-4">
              <div className="card patient-card h-100 p-4 text-center border-rose" style={{ borderTop: '6px solid #D4A5A5' }}>
                <img 
                  src={person.photo_path} 
                  alt={person.name} 
                  className="rounded-circle mx-auto mb-3 shadow-md border border-3 border-rose"
                  style={{ width: '130px', height: '130px', objectFit: 'cover' }}
                />
                <h2 className="fw-bold text-dark mb-1 fs-3">{person.name}</h2>
                <span className="badge bg-rose-light text-rose border border-rose fs-5 px-3 py-1 rounded-pill mb-3">
                  {person.relationship}
                </span>
                <p className="text-secondary fs-5 mb-0">{person.description || 'Family member'}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FamiliarFaces;
