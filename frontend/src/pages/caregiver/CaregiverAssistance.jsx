import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { assistanceAPI } from '../../services/api';

const CaregiverAssistance = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user]);

  const fetchRequests = async () => {
    try {
      const res = await assistanceAPI.getByCaregiverId(user.id);
      setRequests(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id) => {
    try {
      await assistanceAPI.updateStatus(id, { status: 'Resolved' });
      setRequests(requests.map((r) => r.id === id ? { ...r, status: 'Resolved' } : r));
    } catch (err) {
      alert("Failed to update status.");
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <span className="badge bg-dark fs-6 px-3 py-1 rounded-pill mb-1">Caregiver Alert Center</span>
          <h1 className="fw-bold mb-0">Patient Emergency & Help Requests</h1>
        </div>
        <button onClick={fetchRequests} className="btn btn-outline-secondary rounded-pill px-3">
          <i className="bi bi-arrow-clockwise me-1"></i> Refresh Alerts
        </button>
      </div>

      <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
        {loading ? (
          <div className="text-center py-4"><div className="spinner-border text-primary"></div></div>
        ) : requests.length === 0 ? (
          <div className="text-center py-5">
            <i className="bi bi-shield-check display-1 text-success mb-3"></i>
            <h3 className="fw-bold">No Active Emergency Alerts</h3>
            <p className="text-muted">All assistance requests are currently resolved.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead className="table-light">
                <tr>
                  <th>Time Triggered</th>
                  <th>Patient Name</th>
                  <th>Message / Request Detail</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id} className={req.status === 'Pending' ? 'table-warning' : ''}>
                    <td className="fw-bold text-muted">
                      {req.created_at ? new Date(req.created_at).toLocaleString() : 'Just now'}
                    </td>
                    <td className="fw-bold text-primary">{req.patient_name || 'Patient'}</td>
                    <td className="fs-6">{req.message}</td>
                    <td>
                      <span className={`badge ${req.status === 'Pending' ? 'bg-danger fs-6' : 'bg-success fs-6'}`}>
                        {req.status}
                      </span>
                    </td>
                    <td>
                      {req.status === 'Pending' ? (
                        <button onClick={() => handleResolve(req.id)} className="btn btn-sm btn-success fw-bold">
                          <i className="bi bi-check-circle me-1"></i> Mark Resolved
                        </button>
                      ) : (
                        <span className="text-muted fs-6"><i className="bi bi-check-all text-success"></i> Resolved</span>
                      )}
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

export default CaregiverAssistance;
