import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useVoice } from '../../context/VoiceContext';
import { useLanguage } from '../../context/LanguageContext';
import HelpButton from '../../components/HelpButton';
import { sessionsAPI } from '../../services/api';

const PatientProgress = () => {
  const { user } = useAuth();
  const { speakInstruction } = useVoice();
  const { t } = useLanguage();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user]);

  const fetchSessions = async () => {
    try {
      const res = await sessionsAPI.getByPatientId(user.id);
      setSessions(res.data || []);
      speakInstruction(`You have completed ${res.data.length} activity sessions. Keep up the good work!`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-4 patient-view">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="fw-extrabold text-primary mb-1">Your Activity Progress</h1>
          <p className="text-secondary fs-4 mb-0">Summary of your recent cognitive achievements.</p>
        </div>
        <HelpButton />
      </div>

      <div className="card patient-card p-4 mb-4 text-center bg-white shadow-sm">
        <div className="row g-3 align-items-center">
          <div className="col-md-4">
            <div className="display-1 text-warning fw-extrabold mb-1">
              <i className="bi bi-star-fill me-2"></i>{sessions.length}
            </div>
            <div className="fs-4 fw-bold text-muted">Total Activities Played</div>
          </div>
          <div className="col-md-8">
            <h3 className="fw-bold text-primary mb-2">Great job staying active!</h3>
            <p className="fs-5 text-secondary">
              Practicing daily cognitive exercises keeps your brain engaged and helps build healthy memory habits.
            </p>
          </div>
        </div>
      </div>

      <h2 className="fw-bold text-primary mb-3">Recent Activity History</h2>
      {loading ? (
        <div className="text-center py-4">
          <div className="spinner-border text-primary fs-3"></div>
        </div>
      ) : sessions.length === 0 ? (
        <p className="text-muted fs-4">No completed activity sessions yet. Start an activity today!</p>
      ) : (
        <div className="row g-3">
          {sessions.slice(0, 10).map((s) => (
            <div key={s.id} className="col-md-6">
              <div className="p-4 bg-white border rounded-4 shadow-sm d-flex justify-content-between align-items-center">
                <div>
                  <h3 className="fw-bold fs-4 mb-1 text-primary">{s.activity_name || `Activity #${s.activity_id}`}</h3>
                  <div className="text-muted fs-5">
                    Difficulty: <strong>{s.difficulty}</strong> | Score: <strong>{s.score} pts</strong>
                  </div>
                  <div className="text-muted fs-6 mt-1">
                    Completed on {s.created_at ? new Date(s.created_at).toLocaleDateString() : 'Today'}
                  </div>
                </div>
                <div>
                  <span className={`badge fs-5 px-3 py-2 ${
                    s.performance_category === 'Good Progress' ? 'bg-success' :
                    s.performance_category === 'Needs Support' ? 'bg-warning text-dark' : 'bg-info'
                  }`}>
                    {s.performance_category}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PatientProgress;
