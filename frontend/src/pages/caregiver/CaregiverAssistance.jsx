import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCaregiverPatient } from '../../context/CaregiverPatientContext';
import { assistanceAPI } from '../../services/api';

const CaregiverAssistance = () => {
  const { user } = useAuth();
  const { 
    patients, 
    selectedPatientId, 
    selectedPatient, 
    setSelectedPatientId 
  } = useCaregiverPatient();
  const [requests, setRequests] = useState([]);
  const [filterPatientOnly, setFilterPatientOnly] = useState(false);
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

  const displayedRequests = filterPatientOnly && selectedPatientId
    ? requests.filter(r => r.patient_id === selectedPatientId)
    : requests;

  return (
    <div className="container py-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <span className="badge bg-dark fs-6 px-3 py-1 rounded-pill mb-1">Caregiver Alert Center</span>
          <h1 className="fw-bold mb-0">Patient Emergency & Help Requests</h1>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          {patients.length > 0 && (
            <div className="d-flex align-items-center gap-2 bg-white border border-rose rounded-pill px-3 py-2 shadow-sm">
              <span className="text-secondary fw-semibold fs-7">Showing:</span>
              <select
                className="form-select form-select-sm border-0 bg-transparent fw-bold text-dark py-0 pe-4 cursor-pointer"
                style={{ width: 'auto', minWidth: '150px' }}
                value={filterPatientOnly ? (selectedPatientId || '') : 'ALL'}
                onChange={(e) => {
                  if (e.target.value === 'ALL') {
                    setFilterPatientOnly(false);
                  } else {
                    setSelectedPatientId(Number(e.target.value));
                    setFilterPatientOnly(true);
                  }
                }}
              >
                <option value="ALL">All Connected Patients</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>👤 {p.name} (#{p.id})</option>
                ))}
              </select>
            </div>
          )}
          <button onClick={fetchRequests} className="btn btn-outline-secondary rounded-pill px-3 py-2">
            <i className="bi bi-arrow-clockwise me-1"></i> Refresh Alerts
          </button>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
        {loading ? (
          <div className="text-center py-4"><div className="spinner-border text-primary"></div></div>
        ) : displayedRequests.length === 0 ? (
          <div className="text-center py-5">
            <i className="bi bi-shield-check display-1 text-success mb-3"></i>
            <h3 className="fw-bold">No Active Emergency Alerts</h3>
            <p className="text-muted">
              {filterPatientOnly && selectedPatient 
                ? `No alerts for ${selectedPatient.name}. All assistance requests are resolved.`
                : 'All assistance requests are currently resolved.'}
            </p>
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
                {displayedRequests.map((req) => (
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
