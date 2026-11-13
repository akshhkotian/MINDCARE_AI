import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useCaregiverPatient } from '../../context/CaregiverPatientContext';
import { sessionsAPI, recommendationsAPI, caregiverRequestsAPI, assistanceAPI } from '../../services/api';
import { Link } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const CaregiverDashboard = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { 
    patients, 
    selectedPatientId, 
    selectedPatient, 
    setSelectedPatientId, 
    refreshPatients 
  } = useCaregiverPatient();
  const [requests, setRequests] = useState([]);
  const [helpRequests, setHelpRequests] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [profile, setProfile] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.role === 'caregiver') {
      fetchCaregiverOverview();
    }
  }, [user]);

  useEffect(() => {
    if (selectedPatientId) {
      fetchPatientDetails(selectedPatientId);
    } else {
      setSessions([]);
      setRecommendations([]);
      setProfile(null);
    }
  }, [selectedPatientId]);

  const fetchCaregiverOverview = async () => {
    try {
      const [reqsRes, helpRes] = await Promise.all([
        caregiverRequestsAPI.getByCaregiverId(user.id),
        assistanceAPI.getByCaregiverId(user.id)
      ]);
      setRequests(reqsRes.data || []);
      setHelpRequests(helpRes.data || []);
      refreshPatients();
    } catch (err) {
      console.error("Caregiver overview error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientDetails = async (patientId) => {
    try {
      const [sessRes, recRes, profRes] = await Promise.all([
        sessionsAPI.getByPatientId(patientId),
        recommendationsAPI.getByPatientId(patientId),
        recommendationsAPI.getProfile(patientId)
      ]);
      setSessions(sessRes.data || []);
      setRecommendations(recRes.data || []);
      setProfile(profRes.data || null);
    } catch (err) {
      console.error("Patient details error:", err);
    }
  };

  const handleRespondRequest = async (requestId, action) => {
    setStatusMessage('');
    try {
      const res = await caregiverRequestsAPI.respond(requestId, action);
      setStatusMessage(`Request ${action === 'accept' ? 'accepted' : 'rejected'} successfully.`);
      fetchCaregiverOverview();
      setTimeout(() => setStatusMessage(''), 5000);
    } catch (err) {
      setStatusMessage(`Failed to update request: ${err.message}`);
    }
  };

  const handleResolveHelp = async (helpId) => {
    try {
      await assistanceAPI.updateStatus(helpId, { status: 'Resolved' });
      setStatusMessage("Emergency help request marked as resolved.");
      setHelpRequests((prev) => prev.map(h => h.id === helpId ? { ...h, status: 'Resolved' } : h));
      setTimeout(() => setStatusMessage(''), 5000);
    } catch (err) {
      setStatusMessage("Failed to update help request.");
    }
  };

  // Metrics summary calculation
  const totalSessions = sessions.length;
  const avgAccuracy = totalSessions > 0 ? Math.round(sessions.reduce((acc, s) => acc + s.accuracy, 0) / totalSessions) : 0;
  const avgScore = totalSessions > 0 ? Math.round(sessions.reduce((acc, s) => acc + s.score, 0) / totalSessions) : 0;
  const avgTime = totalSessions > 0 ? Math.round(sessions.reduce((acc, s) => acc + s.completion_time, 0) / totalSessions) : 0;
  const totalMistakes = totalSessions > 0 ? sessions.reduce((acc, s) => acc + s.mistakes, 0) : 0;

  const latestRec = recommendations.length > 0 ? recommendations[0] : null;
  const pendingRequests = requests.filter(r => r.status === 'pending');

  // Chart Data Preparation
  const recentSessions = [...sessions].reverse();
  const chartLabels = recentSessions.map((s, idx) => `Session #${idx + 1}`);

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: isDark ? '#262020' : '#4B3F3F',
        titleColor: '#F5EBE6',
        bodyColor: '#F5EBE6',
        borderColor: isDark ? '#4A3E3E' : '#C9B7A7',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        grid: { color: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(75, 63, 63, 0.08)' },
        ticks: { color: isDark ? '#BBAAAA' : '#6B5B5B', font: { family: "'Public Sans', sans-serif" } }
      },
      y: {
        grid: { color: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(75, 63, 63, 0.08)' },
        ticks: { color: isDark ? '#BBAAAA' : '#6B5B5B', font: { family: "'Public Sans', sans-serif" } }
      }
    }
  };

  const accuracyChartData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Accuracy (%)',
        data: recentSessions.map((s) => s.accuracy),
        borderColor: '#D4A5A5',
        backgroundColor: 'rgba(212, 165, 165, 0.25)',
        tension: 0.3,
        fill: true
      }
    ]
  };

  const mistakesChartData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Mistakes Count',
        data: recentSessions.map((s) => s.mistakes),
        backgroundColor: '#C9B7A7',
        borderColor: '#4B3F3F',
        borderWidth: 1,
        borderRadius: 6
      }
    ]
  };

  return (
    <div className="container py-4">
      {/* Header Banner */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <span className="badge bg-rose-light text-rose border border-rose fs-6 px-3 py-2 rounded-pill mb-2">
            Caregiver Analytics Portal
          </span>
          <h1 className="fw-bold text-dark mb-1">Patient Management Dashboard</h1>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <span className="badge bg-rose-light text-rose border border-rose fs-5 px-3 py-2 rounded-pill">
            Your Caregiver ID: <strong className="notranslate" translate="no">{user?.caregiver_code || 'MC-CG-1001'}</strong>
          </span>
          {pendingRequests.length > 0 && (
            <span className="badge bg-warning text-dark border border-warning fs-5 px-3 py-2 rounded-pill shadow-sm">
              <i className="bi bi-bell-fill me-1 text-danger"></i> {pendingRequests.length} New Connection Request{pendingRequests.length > 1 ? 's' : ''}!
            </span>
          )}
          <Link to="/caregiver/familiar-faces" className="btn patient-btn-primary rounded-pill px-3 py-2 fs-6">
            <i className="bi bi-person-bounding-box me-1"></i> Familiar People
          </Link>
        </div>
      </div>

      {/* Inline Status Message Banner (NO alert dialogue popups) */}
      {statusMessage && (
        <div className="alert alert-info border-2 rounded-4 p-3 mb-4 shadow-sm fs-5" role="alert">
          <i className="bi bi-info-circle-fill me-2"></i> {statusMessage}
        </div>
      )}

      {/* 1. Patient Connection Requests Section (Only displayed when there are pending requests) */}
      {pendingRequests.length > 0 && (
        <div className="card border-rose rounded-4 shadow-sm bg-white p-4 mb-4" style={{ borderLeft: '6px solid #4B3F3F' }}>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3 className="fw-bold text-rose mb-0">
              <i className="bi bi-person-plus-fill me-2"></i> Patient Connection Requests ({pendingRequests.length})
            </h3>
          </div>

          <div className="row g-3">
            {pendingRequests.map((req) => (
              <div key={req.id} className="col-md-6 col-lg-4">
                <div className="p-3 border rounded-3 bg-rose-light border-rose">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h4 className="fw-bold fs-5 mb-0 text-dark">{req.patient_name}</h4>
                    <span className="badge bg-warning text-dark">Pending</span>
                  </div>
                  <p className="text-secondary fs-6 mb-2">Age: {req.patient_age || 'N/A'} | Email: {req.patient_email}</p>
                  <p className="text-muted fs-6 mb-3">Requested: {new Date(req.requested_at).toLocaleDateString()}</p>
                  
                  <div className="d-flex gap-2">
                    <button 
                      onClick={() => handleRespondRequest(req.id, 'accept')} 
                      className="btn patient-btn-success flex-fill py-2 fs-6"
                    >
                      <i className="bi bi-check-lg me-1"></i> Accept
                    </button>
                    <button 
                      onClick={() => handleRespondRequest(req.id, 'reject')} 
                      className="btn patient-btn-danger flex-fill py-2 fs-6"
                    >
                      <i className="bi bi-x-lg me-1"></i> Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Emergency Help Requests Section */}
      {helpRequests.filter(h => h.status === 'Pending').length > 0 && (
        <div className="alert alert-danger border-2 rounded-4 p-4 mb-4 shadow-sm">
          <h3 className="fw-bold text-danger mb-3">
            <i className="bi bi-bell-fill me-2"></i> Emergency Help Requests
          </h3>
          <div className="row g-3">
            {helpRequests.filter(h => h.status === 'Pending').map((h) => (
              <div key={h.id} className="col-md-6">
                <div className="p-3 bg-white border border-danger rounded-3 d-flex justify-content-between align-items-center">
                  <div>
                    <h5 className="fw-bold text-dark mb-1">{h.patient_name || 'Patient'} Requested Assistance</h5>
                    <p className="text-muted fs-6 mb-0">Time: {new Date(h.created_at).toLocaleString()}</p>
                  </div>
                  <button onClick={() => handleResolveHelp(h.id)} className="btn patient-btn-success btn-sm">
                    Mark as Resolved
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. My Patients Selection Bar */}
      <div className="card border-0 shadow-sm rounded-4 mb-4 bg-white p-3">
        <div className="d-flex align-items-center gap-3">
          <label className="fw-bold fs-5 text-rose mb-0">Select Accepted Patient:</label>
          <select 
            className="form-select form-select-lg fs-5 rounded-3 border-rose flex-grow-1"
            value={selectedPatientId || ''}
            onChange={(e) => setSelectedPatientId(parseInt(e.target.value, 10))}
            disabled={patients.length === 0}
          >
            {patients.length === 0 ? (
              <option value="">No connected patients yet</option>
            ) : (
              patients.map(p => (
                <option key={p.id} value={p.id}>{p.name} (Age {p.age || 'N/A'})</option>
              ))
            )}
          </select>
        </div>
      </div>

      {!selectedPatient ? (
        <div className="card border-0 shadow-sm rounded-4 p-5 text-center bg-white my-4">
          <i className="bi bi-people display-1 text-rose mb-3"></i>
          <h3 className="fw-bold text-dark mb-2">No Connected Patients Yet</h3>
          <p className="text-secondary fs-5 mb-0 mx-auto" style={{ maxWidth: '650px' }}>
            When a patient registers and you accept their connection request above, their activity analytics and memory progress will appear here.
          </p>
        </div>
      ) : (
        <>
          {/* 4. Patient Overview Header Card */}
      <div className="card shadow-sm border-rose rounded-4 mb-4 bg-white p-4">
        <div className="row align-items-center">
          <div className="col-md-3 border-end">
            <div className="d-flex align-items-center gap-3">
              <div className="avatar-circle bg-rose-light text-rose display-5 rounded-circle px-3 py-2 fw-bold border border-rose">
                {selectedPatient.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <h3 className="fw-bold mb-0">{selectedPatient.name}</h3>
                <span className="text-secondary">Patient ID: #{selectedPatient.id} | Age: {selectedPatient.age || 74}</span>
              </div>
            </div>
          </div>

          <div className="col-md-5 border-end">
            <div className="px-3">
              <h5 className="text-secondary fs-6 text-uppercase fw-bold">Current ML Classification</h5>
              <div className="d-flex align-items-center gap-2">
                <span className={`badge fs-5 px-3 py-2 ${
                  latestRec?.performance_category === 'Good Progress' ? 'bg-success' :
                  latestRec?.performance_category === 'Needs Support' ? 'bg-warning text-dark' : 'bg-info'
                }`}>
                  {latestRec?.performance_category || 'Normal Progress'}
                </span>
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="px-3">
              <h5 className="text-secondary fs-6 text-uppercase fw-bold">Recommended Difficulty</h5>
              <div className="fs-3 fw-bold text-rose">
                {latestRec?.recommended_difficulty || 'Medium'} Level
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* 5. Patient Strengths & Areas for Practice */}
      <div className="card border-0 shadow-sm rounded-4 mb-4 bg-white p-4" style={{ borderLeft: '6px solid #4B3F3F' }}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className="fw-bold text-dark mb-0">
            <i className="bi bi-person-badge-fill text-rose me-2"></i>
            Patient Strengths & Areas for Practice
          </h4>
          <span className="badge bg-rose-light text-rose border border-rose fs-6 px-3 py-2 rounded-pill">
            Evaluation Stage: <strong>{profile?.stage || 'Personalized Stage'}</strong>
          </span>
        </div>

        <div className="row g-4 align-items-center">
          <div className="col-md-4">
            <div className="p-3 bg-rose-light rounded-3 h-100">
              <h5 className="fw-bold text-success fs-6 text-uppercase mb-2">
                <i className="bi bi-check-circle-fill me-1"></i> Patient Strengths
              </h5>
              {profile?.strengths && profile.strengths.length > 0 ? (
                <div className="d-flex flex-wrap gap-2">
                  {profile.strengths.map((str, idx) => (
                    <span key={idx} className="badge bg-success fs-6 px-3 py-2 rounded-pill">
                      {str}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-secondary fs-6">Completing activities to identify strengths</span>
              )}
            </div>
          </div>

          <div className="col-md-4">
            <div className="p-3 bg-rose-light rounded-3 h-100">
              <h5 className="fw-bold text-warning text-dark fs-6 text-uppercase mb-2">
                <i className="bi bi-exclamation-triangle-fill me-1"></i> Needs More Practice
              </h5>
              {profile?.needs_practice && profile.needs_practice.length > 0 ? (
                <div className="d-flex flex-wrap gap-2">
                  {profile.needs_practice.map((np, idx) => (
                    <span key={idx} className="badge bg-warning text-dark fs-6 px-3 py-2 rounded-pill">
                      {np}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-secondary fs-6">No weak areas detected</span>
              )}
            </div>
          </div>

          <div className="col-md-4">
            <div className="p-3 bg-rose-light rounded-3 h-100">
              <h5 className="fw-bold text-rose fs-6 text-uppercase mb-2">
                <i className="bi bi-graph-up-arrow me-1"></i> Performance Trajectory
              </h5>
              <div className="d-flex align-items-center gap-2 mb-1">
                <span className={`badge fs-6 px-3 py-2 ${
                  profile?.recent_trend === 'improving' ? 'bg-success' :
                  profile?.recent_trend === 'declining' ? 'bg-danger' : 'bg-info'
                }`}>
                  {profile?.recent_trend ? profile.recent_trend.toUpperCase() : 'STABLE'}
                </span>
                <span className="text-secondary fs-6">Overall Accuracy: {profile?.overall_accuracy || avgAccuracy}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Performance Summary Metrics Cards */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm rounded-3 p-3 bg-white h-100">
            <div className="text-secondary fs-6 fw-bold">AVERAGE ACCURACY</div>
            <div className="fs-2 fw-bold text-rose">{avgAccuracy}%</div>
            <div className="progress mt-2" style={{ height: '6px' }}>
              <div className="progress-bar" style={{ width: `${avgAccuracy}%`, backgroundColor: '#D4A5A5' }}></div>
            </div>
          </div>
        </div>

        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm rounded-3 p-3 bg-white h-100">
            <div className="text-secondary fs-6 fw-bold">AVERAGE SCORE</div>
            <div className="fs-2 fw-bold text-success">{avgScore} pts</div>
            <span className="text-secondary fs-6">Across {totalSessions} sessions</span>
          </div>
        </div>

        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm rounded-3 p-3 bg-white h-100">
            <div className="text-secondary fs-6 fw-bold">AVG TIME</div>
            <div className="fs-2 fw-bold text-info">{avgTime}s</div>
            <span className="text-secondary fs-6">Per activity completion</span>
          </div>
        </div>

        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm rounded-3 p-3 bg-white h-100">
            <div className="text-secondary fs-6 fw-bold">TOTAL MISTAKES</div>
            <div className="fs-2 fw-bold text-warning">{totalMistakes}</div>
            <span className="text-secondary fs-6">Total recorded errors</span>
          </div>
        </div>
      </div>

      {/* 7. Progress Visualizations Charts */}
      <div className="row g-4 mb-4">
        <div className="col-md-6">
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
            <h4 className="fw-bold mb-3 text-dark">Accuracy Trajectory Over Time</h4>
            <Line data={accuracyChartData} options={chartOptions} />
          </div>
        </div>

        <div className="col-md-6">
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
            <h4 className="fw-bold mb-3 text-dark">Mistakes Count Per Session</h4>
            <Bar data={mistakesChartData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* 8. Activity Sessions History Table */}
      <div className="card border-0 shadow-sm rounded-4 bg-white p-4">
        <h4 className="fw-bold mb-3 text-dark">Historical Activity Sessions Table</h4>
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead className="table-light">
              <tr>
                <th>Date & Time</th>
                <th>Activity Name</th>
                <th>Score</th>
                <th>Accuracy</th>
                <th>Completion Time</th>
                <th>Mistakes</th>
                <th>Difficulty</th>
                <th>ML Performance Category</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center text-muted py-4">No activity sessions recorded yet for this patient.</td>
                </tr>
              ) : (
                sessions.map((s) => (
                  <tr key={s.id}>
                    <td className="text-secondary">{s.created_at ? new Date(s.created_at).toLocaleString() : 'N/A'}</td>
                    <td className="fw-bold text-rose">{s.activity_name || `Activity #${s.activity_id}`}</td>
                    <td className="fw-bold">{s.score} pts</td>
                    <td>{s.accuracy}%</td>
                    <td>{s.completion_time}s</td>
                    <td>{s.mistakes}</td>
                    <td><span className="badge bg-secondary">{s.difficulty}</span></td>
                    <td>
                      <span className={`badge ${
                        s.performance_category === 'Good Progress' ? 'bg-success' :
                        s.performance_category === 'Needs Support' ? 'bg-warning text-dark' : 'bg-info'
                      }`}>
                        {s.performance_category}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}
    </div>
  );
};

export default CaregiverDashboard;
