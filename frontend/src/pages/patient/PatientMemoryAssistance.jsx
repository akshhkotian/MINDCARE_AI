import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useVoice } from '../../context/VoiceContext';
import HelpButton from '../../components/HelpButton';
import { memoryAPI } from '../../services/api';

const PatientMemoryAssistance = () => {
  const { user } = useAuth();
  const { speakInstruction } = useVoice();
  const [memoryItems, setMemoryItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchMemoryItems();
    }
  }, [user]);

  const fetchMemoryItems = async () => {
    try {
      const res = await memoryAPI.getByPatientId(user.id);
      setMemoryItems(res.data || []);
      speakInstruction("Memory Care Hub. Here are your saved family notes, routines, and important locations.");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (cat) => {
    switch (cat) {
      case 'Family': return 'bi-person-heart text-rose';
      case 'Routine': return 'bi-alarm-fill text-warning';
      case 'Place': return 'bi-geo-alt-fill text-rose';
      default: return 'bi-journal-bookmark-fill text-rose';
    }
  };

  return (
    <div className="container py-4 patient-view">
      <div className="card border-0 rounded-4 shadow-sm bg-white p-4 mb-4" style={{ borderLeft: '6px solid #8FAF9A' }}>
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div>
            <span className="badge bg-rose-light text-rose fs-6 px-3 py-2 rounded-pill mb-2 border border-rose">
              <i className="bi bi-journal-bookmark-fill me-1"></i> Patient Memory Cards
            </span>
            <h1 className="fw-extrabold text-rose mb-1">Memory Assistance Cards</h1>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary fs-3" role="status"></div>
        </div>
      ) : memoryItems.length === 0 ? (
        <div className="card patient-card p-5 text-center my-4 bg-white shadow-sm">
          <i className="bi bi-journal-x display-1 text-muted mb-3"></i>
          <h2 className="fw-bold text-dark">No Memory Cards Yet</h2>
          <p className="fs-4 text-muted">Your caregiver will add family contacts and notes here.</p>
        </div>
      ) : (
        <div className="row g-4">
          {memoryItems.map((item) => (
            <div key={item.id} className="col-md-6 col-lg-4">
              <div className="card patient-card h-100 p-4 shadow-sm" style={{ borderTop: '5px solid #8FAF9A' }}>
                <div className="d-flex align-items-center gap-3 mb-3">
                  <div className="bg-rose-light text-rose rounded-circle p-3 d-flex align-items-center justify-content-center" style={{ width: '56px', height: '56px' }}>
                    <i className={`bi ${getCategoryIcon(item.category)} fs-2`}></i>
                  </div>
                  <div>
                    <span className="badge bg-rose-light text-rose border border-rose fs-6 px-3 py-1 rounded-pill">{item.category}</span>
                    <h3 className="fw-bold fs-3 mb-0 text-rose">{item.title}</h3>
                  </div>
                </div>
                <p className="fs-4 text-secondary mb-4 flex-grow-1 leading-relaxed">{item.description}</p>
                <button
                  onClick={() => speakInstruction(`${item.title}. ${item.description}`)}
                  className="btn btn-outline-danger fw-bold rounded-pill py-2 text-rose fs-5"
                >
                  <i className="bi bi-volume-up-fill me-2"></i> Read Out Loud
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PatientMemoryAssistance;
