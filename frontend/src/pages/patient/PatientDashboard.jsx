import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useVoice } from '../../context/VoiceContext';
import { useLanguage } from '../../context/LanguageContext';
import HelpButton from '../../components/HelpButton';
import { remindersAPI, recommendationsAPI, caregiverRequestsAPI } from '../../services/api';
import { parseTimeToMinutes } from '../../components/ReminderNotificationModal';

const PatientDashboard = () => {
  const { user } = useAuth();
  const { speakInstruction } = useVoice();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [reminders, setReminders] = useState([]);
  const [recommendation, setRecommendation] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [helpNotified, setHelpNotified] = useState(false);
  const [loading, setLoading] = useState(true);

  // Caregiver connect / re-connect form state
  const [caregiverCodeInput, setCaregiverCodeInput] = useState('');
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectMsg, setConnectMsg] = useState('');
  const [connectErr, setConnectErr] = useState('');

  const handleConnectCaregiver = async (e) => {
    e.preventDefault();
    if (!caregiverCodeInput.trim()) return;
    setConnectLoading(true);
    setConnectMsg('');
    setConnectErr('');
    try {
      const res = await caregiverRequestsAPI.connect(user.id, caregiverCodeInput.trim().toUpperCase());
      setConnectMsg(res.data.message || 'Connection request sent successfully!');
      setCaregiverCodeInput('');
      // Re-fetch patient caregiver status
      const connRes = await caregiverRequestsAPI.getPatientStatus(user.id);
      setConnectionStatus(connRes.data || null);
    } catch (err) {
      setConnectErr(err.response?.data?.error || 'Failed to send connection request. Please verify the code.');
    } finally {
      setConnectLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      const greetingTemplate = t('welcomeVoiceGreeting', 'Welcome back, {name}! What activity would you like to practice today?');
      speakInstruction(greetingTemplate.replace('{name}', user.name || ''));
      fetchData();
    }
  }, [user, speakInstruction, t]);

  const fetchData = async () => {
    try {
      const [remRes, recRes, connRes] = await Promise.all([
        remindersAPI.getByPatientId(user.id),
        recommendationsAPI.getByPatientId(user.id),
        caregiverRequestsAPI.getPatientStatus(user.id)
      ]);
      setReminders(remRes.data || []);
      if (recRes.data && recRes.data.length > 0) {
        setRecommendation(recRes.data[0]);
      }
      setConnectionStatus(connRes.data || null);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-4 patient-view">
      {/* Top Welcome Banner */}
      <div className="card border-rose rounded-4 shadow-sm bg-white p-4 mb-4">
        <span className="badge bg-rose-light text-rose fs-6 px-3 py-2 rounded-pill mb-2 border border-rose" style={{ width: 'fit-content' }}>
          <i className="bi bi-heart-pulse-fill me-1"></i> {t('patientPortal', 'Patient Care Portal')}
        </span>
        <h1 className="fw-extrabold text-rose mb-1">
          {t('hello', 'Hello')}, {user?.name || 'Friend'}! 👋
        </h1>
        <p className="text-secondary fs-4 mb-0">
          {t('readyDaily', 'Ready for your daily cognitive exercise and memory care?')}
        </p>
      </div>

      {/* Emergency Assistance Inline Banner */}
      {helpNotified && (
        <div className="alert alert-danger border-2 rounded-4 p-3 mb-4 shadow-sm text-center fs-5" role="alert">
          <i className="bi bi-bell-fill me-2 fs-4"></i>
          <strong>{t('emergencySent', 'Emergency Request Sent: Your caregiver has been notified and will respond shortly.')}</strong>
        </div>
      )}

      {/* Caregiver Connection Status & Actions */}
      {connectionStatus?.status === 'accepted' ? (
        <div className="alert alert-success rounded-4 p-4 mb-4 shadow-sm border-2 fs-5" style={{ borderLeft: '6px solid #8FAF9A' }}>
          <div className="d-flex align-items-center gap-3">
            <div className="bg-success-subtle text-success rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: '50px', height: '50px' }}>
              <i className="bi bi-shield-check fs-2 text-success"></i>
            </div>
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <span className="badge bg-success fs-6 rounded-pill">{t('connectedCaregiver', 'Connected Caregiver')}</span>
                {connectionStatus.caregiver_code && (
                  <span className="badge bg-light text-dark border fs-6 rounded-pill">{connectionStatus.caregiver_code}</span>
                )}
              </div>
              <h4 className="fw-bold mb-0 text-dark">
                {connectionStatus.caregiver_name}
                {connectionStatus.caregiver_email && (
                  <span className="text-secondary fw-normal fs-6 ms-2">({connectionStatus.caregiver_email})</span>
                )}
              </h4>
            </div>
          </div>
        </div>
      ) : connectionStatus?.status === 'pending' ? (
        <div className="alert alert-warning rounded-4 p-4 mb-4 shadow-sm border-2 fs-5" style={{ borderLeft: '6px solid #f0ad4e' }}>
          <div className="d-flex align-items-center gap-3">
            <div className="bg-warning-subtle text-warning-emphasis rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: '50px', height: '50px' }}>
              <i className="bi bi-hourglass-split fs-2 text-warning"></i>
            </div>
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <span className="badge bg-warning text-dark fs-6 rounded-pill">{t('pendingApproval', 'Pending Approval')}</span>
              </div>
              <h4 className="fw-bold mb-1 text-dark">
                Connection Request Sent to {connectionStatus.caregiver_name} {connectionStatus.caregiver_code ? `(${connectionStatus.caregiver_code})` : ''}
              </h4>
              <p className="text-secondary fs-6 mb-0">
                Waiting for your caregiver to approve the connection on their dashboard. Once accepted, your accounts will be linked.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Rejection Notice & Connect / Re-Connect Form */
        <div className="card border-rose rounded-4 p-4 mb-4 shadow-sm bg-white" style={{ borderLeft: '6px solid #D98A6C' }}>
          {connectionStatus?.status === 'rejected' && (
            <div className="alert alert-danger border-2 rounded-3 p-3 mb-3 fs-6 d-flex align-items-center gap-2">
              <i className="bi bi-exclamation-octagon-fill fs-4 text-danger"></i>
              <div>
                <strong>Connection Declined:</strong> Your previous connection request to{' '}
                <strong>{connectionStatus.caregiver_name || 'the caregiver'}</strong> was declined or rejected. You can enter a new Caregiver ID Code below to connect with your caregiver.
              </div>
            </div>
          )}

          <div className="d-flex align-items-center gap-3 mb-3">
            <div className="bg-rose-light text-rose rounded-circle p-3 d-flex align-items-center justify-content-center" style={{ width: '56px', height: '56px' }}>
              <i className="bi bi-person-plus-fill fs-3 text-rose"></i>
            </div>
            <div>
              <h3 className="fw-bold text-dark mb-1 fs-4">
                {connectionStatus?.status === 'rejected' ? 'Re-connect with Your Caregiver' : 'Connect with a Caregiver'}
              </h3>
              <p className="text-secondary fs-6 mb-0">
                Enter your caregiver or family member's unique Caregiver ID Code (e.g., <strong>MC-CG-1001</strong>) to send a connection request.
              </p>
            </div>
          </div>

          {connectMsg && (
            <div className="alert alert-success rounded-3 p-3 mb-3 fs-6">
              <i className="bi bi-check-circle-fill me-2"></i>{connectMsg}
            </div>
          )}
          {connectErr && (
            <div className="alert alert-danger rounded-3 p-3 mb-3 fs-6">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>{connectErr}
            </div>
          )}

          <form onSubmit={handleConnectCaregiver} className="row g-2 align-items-center">
            <div className="col-12 col-md-7 col-lg-8">
              <div className="input-group input-group-lg">
                <span className="input-group-text bg-white border-rose text-secondary">
                  <i className="bi bi-upc-scan fs-5"></i>
                </span>
                <input
                  type="text"
                  className="form-control form-control-lg fs-5 border-rose"
                  placeholder="Enter Caregiver Code (e.g. MC-CG-1001)"
                  value={caregiverCodeInput}
                  onChange={(e) => setCaregiverCodeInput(e.target.value.toUpperCase())}
                  disabled={connectLoading}
                  required
                />
              </div>
            </div>
            <div className="col-12 col-md-5 col-lg-4">
              <button
                type="submit"
                disabled={connectLoading || !caregiverCodeInput.trim()}
                className="btn patient-btn-primary btn-lg w-100 py-3 fw-bold fs-5 rounded-3 shadow-sm"
              >
                {connectLoading ? (
                  <span><span className="spinner-border spinner-border-sm me-2" role="status"></span>Sending...</span>
                ) : (
                  <span><i className="bi bi-send-fill me-2"></i>Send Request</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Recommended Activity Callout ("Next Activity For You") */}
      {recommendation && (
        <div className="card border-rose rounded-4 p-4 mb-4 shadow-sm bg-white" style={{ borderLeft: '6px solid #8FAF9A' }}>
          <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
            <div className="d-flex align-items-center gap-3">
              <div className="bg-rose-light text-rose rounded-circle p-3 d-flex align-items-center justify-content-center" style={{ width: '64px', height: '64px' }}>
                <i className="bi bi-star-fill fs-2" style={{ color: '#C9A66B' }}></i>
              </div>
              <div>
                <div className="d-flex align-items-center gap-2 mb-1">
                  <span className="badge bg-rose-light text-rose fs-6 px-3 py-1 rounded-pill border border-rose">
                    Next Activity For You
                  </span>
                  <span className="badge bg-secondary fs-6 px-3 py-1 rounded-pill">
                    {recommendation.stage || 'Personalized Plan'}
                  </span>
                </div>
                <h2 className="fw-bold text-dark mb-1">
                  {recommendation.activity_name || 'Sequence Memory'}
                </h2>
                <p className="text-secondary fs-5 mb-1">
                  “{recommendation.recommendation_reason || "Let's practice your cognitive exercises today."}”
                </p>
                <div className="d-flex align-items-center gap-2 text-muted fs-6">
                  <span>Recommended Difficulty:</span>
                  <span className={`badge ${
                    recommendation.recommended_difficulty === 'Hard' ? 'bg-danger' :
                    recommendation.recommended_difficulty === 'Medium' ? 'bg-warning text-dark' : 'bg-success'
                  }`}>
                    {recommendation.recommended_difficulty || 'Easy'}
                  </span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => {
                const routes = {
                  1: '/patient/activities/matching',
                  2: '/patient/activities/picture-recall',
                  3: '/patient/activities/sequence',
                  4: '/patient/activities/object-recognition',
                  5: '/patient/activities/word-memory',
                  6: '/patient/activities/name-face',
                  7: '/patient/activities/event-sequence',
                  8: '/patient/activities/puzzles'
                };
                const targetRoute = routes[recommendation.activity_id] || '/patient/activities';
                navigate(targetRoute, { state: { difficulty: recommendation.recommended_difficulty } });
              }}
              className="btn patient-btn patient-btn-primary px-4 py-3 align-self-md-center shadow-sm"
            >
              Start Activity <i className="bi bi-play-circle-fill ms-2"></i>
            </button>
          </div>
        </div>
      )}

      {/* Main Quick Actions Navigation Cards */}
      <div className="row g-4 mb-5">
        <div className="col-md-6 col-lg-3">
          <div 
            onClick={() => navigate('/patient/activities')}
            className="card patient-card h-100 text-center p-4 cursor-pointer"
            style={{ borderTop: '6px solid #8FAF9A' }}
          >
            <div className="card-body d-flex flex-column align-items-center justify-content-center">
              <i className="bi bi-controller display-3 text-rose mb-3"></i>
              <h3 className="fw-bold mb-2">{t('activities', 'Activities')}</h3>
              <p className="text-muted fs-6 mb-4">{t('eightExercises', '8 Playable memory exercises.')}</p>
              <span className="btn patient-btn patient-btn-primary w-100 fs-5">
                {t('playGames', 'Play Games')}
              </span>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-lg-3">
          <div 
            onClick={() => navigate('/patient/familiar-faces')}
            className="card patient-card h-100 text-center p-4 cursor-pointer"
            style={{ borderTop: '6px solid #B8C9B8' }}
          >
            <div className="card-body d-flex flex-column align-items-center justify-content-center">
              <i className="bi bi-people-fill display-3 text-rose mb-3"></i>
              <h3 className="fw-bold mb-2">{t('familiarFaces', 'Familiar Faces')}</h3>
              <p className="text-muted fs-6 mb-4">{t('familyRoutinePhotos', 'View family & play face memory.')}</p>
              <span className="btn patient-btn patient-btn-primary w-100 fs-5">
                {t('viewPeople', 'View People')}
              </span>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-lg-3">
          <div 
            onClick={() => navigate('/patient/memory')}
            className="card patient-card h-100 text-center p-4 cursor-pointer"
            style={{ borderTop: '6px solid #C9A66B' }}
          >
            <div className="card-body d-flex flex-column align-items-center justify-content-center">
              <i className="bi bi-journal-bookmark-fill display-3 text-rose mb-3"></i>
              <h3 className="fw-bold mb-2">{t('memoryCare', 'Memory Cards')}</h3>
              <p className="text-muted fs-6 mb-4">{t('notesAddressRoutines', 'Notes, address & routines.')}</p>
              <span className="btn patient-btn patient-btn-secondary w-100 fs-5">
                {t('openCards', 'Open Cards')}
              </span>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-lg-3">
          <div 
            onClick={() => navigate('/patient/reminders')}
            className="card patient-card h-100 text-center p-4 cursor-pointer"
            style={{ borderTop: '6px solid #8FAF9A' }}
          >
            <div className="card-body d-flex flex-column align-items-center justify-content-center">
              <i className="bi bi-alarm-fill display-3 text-rose mb-3"></i>
              <h3 className="fw-bold mb-2">{t('reminders', 'Reminders')}</h3>
              <p className="text-muted fs-6 mb-4">{t('waterTeaAlerts', 'Water, tea & daily alerts.')}</p>
              <span className="btn patient-btn patient-btn-secondary w-100 fs-5">
                {t('checkSchedule', 'Check')} ({reminders.length})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Reminders Preview List */}
      <div className="card patient-card mb-4 p-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <h2 className="fw-bold mb-0 text-rose">
            <i className="bi bi-calendar-check-fill me-2"></i> {t('todaysSchedule', "Today's Schedule")}
          </h2>
          <Link to="/patient/reminders" className="btn btn-outline-danger fw-bold rounded-pill px-3">
            {t('viewAll', 'View All')}
          </Link>
        </div>

        {reminders.length === 0 ? (
          <p className="text-muted fs-5 my-3">{t('noReminders', 'No pending reminders for today. You are all set!')}</p>
        ) : (
          <div className="row g-3">
            {reminders.slice(0, 3).map((rem) => {
              const remMin = parseTimeToMinutes(rem.reminder_time);
              const now = new Date();
              const currentMin = now.getHours() * 60 + now.getMinutes();
              const isDueNow = remMin !== null && currentMin === remMin;

              return (
                <div key={rem.id} className="col-md-4">
                  <div className={`p-3 border rounded-3 transition-all ${isDueNow ? 'bg-warning-subtle border-warning shadow-sm' : 'bg-rose-light border-rose'}`}>
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      {isDueNow ? (
                        <span className="badge bg-danger text-white fs-6 font-monospace animate-pulse">
                          🔔 Alarm Due Now! ({rem.reminder_time})
                        </span>
                      ) : (
                        <span className="badge bg-rose-light text-rose border border-rose fs-6 font-monospace">
                          ⏰ {rem.reminder_time}
                        </span>
                      )}
                      <span className="text-muted fs-6">{rem.repeat_option}</span>
                    </div>
                    <h4 className="fw-bold fs-5 mb-1 text-dark">{rem.title}</h4>
                    <p className="text-secondary fs-6 mb-0">{rem.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientDashboard;
