import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCaregiverPatient } from '../../context/CaregiverPatientContext';
import { sessionsAPI, recommendationsAPI, memoryAPI } from '../../services/api';

const PatientDetails = () => {
  const { id } = useParams();
  const patientId = id;
  const { setSelectedPatientId, selectedPatient } = useCaregiverPatient();
  const [sessions, setSessions] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [profile, setProfile] = useState(null);
  const [memoryItems, setMemoryItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (patientId) {
      setSelectedPatientId(Number(patientId));
      fetchData();
    }
  }, [patientId]);

  const fetchData = async () => {
    try {
      const [sRes, rRes, pRes, mRes] = await Promise.all([
        sessionsAPI.getByPatientId(patientId),
        recommendationsAPI.getByPatientId(patientId),
        recommendationsAPI.getProfile(patientId),
        memoryAPI.getByPatientId(patientId)
      ]);
      setSessions(sRes.data || []);
      setRecommendations(rRes.data || []);
      setProfile(pRes.data || null);
      setMemoryItems(mRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <Link to="/caregiver/dashboard" className="btn btn-outline-secondary rounded-pill px-3">
          <i className="bi bi-arrow-left me-1"></i> Back to Dashboard
        </Link>
        <Link to="/caregiver/memory" state={{ patientId }} className="btn patient-btn-primary fw-bold rounded-pill px-4">
          <i className="bi bi-journal-plus me-1"></i> Add / Manage Memory Care Cards
        </Link>
      </div>

      <div className="card border-rose rounded-4 p-4 bg-white mb-4 shadow-sm" style={{ borderLeft: '6px solid #4B3F3F' }}>
        <h2 className="fw-bold text-dark mb-1">Patient Profile & Cognitive Details (ID #{patientId})</h2>
        <p className="text-secondary mb-0">Personalized Stage Evaluation, Active Memory Care Cards, & Progress History</p>
      </div>

      {/* Memory Care Cards Summary Section */}
      <div className="card border-0 shadow-sm rounded-4 p-4 bg-white mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <span className="badge bg-rose-light text-rose border border-rose fs-6 px-3 py-1 rounded-pill mb-1">
              Memory Assistance
            </span>
            <h3 className="fw-bold text-dark mb-0">Active Memory Cards ({memoryItems.length})</h3>
          </div>
          <Link to="/caregiver/memory" state={{ patientId }} className="btn btn-outline-danger btn-sm rounded-pill fw-semibold">
            + Manage Cards
          </Link>
        </div>

        {memoryItems.length === 0 ? (
          <div className="p-4 border border-2 border-dashed rounded-4 text-center bg-rose-light">
            <p className="text-secondary mb-2 fs-6">No Memory Care cards added for this patient yet.</p>
            <Link to="/caregiver/memory" state={{ patientId }} className="btn patient-btn-primary btn-sm rounded-pill fw-bold">
              <i className="bi bi-journal-plus me-1"></i> Create First Memory Card
            </Link>
          </div>
        ) : (
          <div className="row g-3">
            {memoryItems.map((item) => (
              <div key={item.id} className="col-md-6 col-lg-4">
                <div className="p-3 border-rose rounded-3 bg-rose-light h-100 shadow-sm">
                  <span className={`badge ${
                    item.category === 'Family' ? 'bg-danger' :
                    item.category === 'Routine' ? 'bg-warning text-dark' :
                    item.category === 'Place' ? 'bg-success' : 'bg-primary'
                  } fs-6 mb-2`}>
                    {item.category}
                  </span>
                  <h4 className="fw-bold fs-5 text-dark mb-1">{item.title}</h4>
                  <p className="text-secondary mb-0 fs-6">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
        <h3 className="fw-bold mb-3">Activity Sessions Breakdown</h3>
        {loading ? (
          <div className="spinner-border text-rose"></div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Session ID</th>
                  <th>Activity</th>
                  <th>Score</th>
                  <th>Accuracy</th>
                  <th>Time</th>
                  <th>Mistakes</th>
                  <th>Difficulty</th>
                  <th>ML Classification</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id}>
                    <td>#{s.id}</td>
                    <td className="fw-bold text-rose">{s.activity_name || `Activity #${s.activity_id}`}</td>
                    <td className="fw-bold">{s.score}</td>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientDetails;
