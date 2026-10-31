import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useVoice } from '../../context/VoiceContext';
import HelpButton from '../../components/HelpButton';
import { remindersAPI } from '../../services/api';

const PatientReminders = () => {
  const { user } = useAuth();
  const { speakInstruction } = useVoice();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    if (user) {
      fetchReminders();
    }
  }, [user]);

  const fetchReminders = async () => {
    try {
      const res = await remindersAPI.getByPatientId(user.id);
      const list = res.data || [];
      setReminders(list);
      const pendingCount = list.filter(r => r.status !== 'Completed').length;
      speakInstruction(`You have ${pendingCount} active reminders scheduled for today.`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async (rem) => {
    const newStatus = rem.status === 'Completed' ? 'Pending' : 'Completed';
    try {
      await remindersAPI.update(rem.id, { status: newStatus });
      setReminders(reminders.map((r) => r.id === rem.id ? { ...r, status: newStatus } : r));
      if (newStatus === 'Completed') {
        speakInstruction(`Great job! Marked ${rem.title} as completed.`);
      } else {
        speakInstruction(`Marked ${rem.title} as pending.`);
      }
    } catch (err) {
      alert("Failed to update reminder status.");
    }
  };

  const handleReadOutLoud = () => {
    const pendingList = reminders.filter(r => r.status !== 'Completed');
    if (pendingList.length === 0) {
      speakInstruction("You have no pending reminders for today. All done!");
      return;
    }
    const text = pendingList.map(r => `${r.title} scheduled for ${r.reminder_time}. ${r.description || ''}`).join(". ");
    speakInstruction(`Here are your daily reminders: ${text}`);
  };

  const filteredReminders = reminders.filter(r => {
    if (filter === 'Pending') return r.status !== 'Completed';
    if (filter === 'Completed') return r.status === 'Completed';
    return true;
  });

  const pendingCount = reminders.filter(r => r.status !== 'Completed').length;
  const completedCount = reminders.filter(r => r.status === 'Completed').length;

  return (
    <div className="container py-4 patient-view">
      {/* Page Header */}
      <div className="card border-0 rounded-4 shadow-sm bg-white p-4 mb-4" style={{ borderLeft: '6px solid #8FAF9A' }}>
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div>
            <span className="badge bg-rose-light text-rose fs-6 px-3 py-2 rounded-pill mb-2 border border-rose">
              <i className="bi bi-bell-fill me-1"></i> Patient Daily Schedule
            </span>
            <h1 className="fw-extrabold text-rose mb-0">Your Daily Reminders</h1>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <button
              id="read-reminders-voice-btn"
              onClick={handleReadOutLoud}
              className="btn btn-outline-danger btn-lg fw-bold rounded-pill px-4 py-2"
            >
              <i className="bi bi-volume-up-fill me-2"></i> Read Out Loud
            </button>
          </div>
        </div>
      </div>

      {/* High-Contrast Filter Tabs */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <div className="reminder-filter-container shadow-sm" role="tablist">
          <button
            type="button"
            onClick={() => setFilter('All')}
            className={`reminder-filter-tab ${filter === 'All' ? 'active' : ''}`}
          >
            All ({reminders.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('Pending')}
            className={`reminder-filter-tab ${filter === 'Pending' ? 'active' : ''}`}
          >
            Pending ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('Completed')}
            className={`reminder-filter-tab ${filter === 'Completed' ? 'active' : ''}`}
          >
            Completed ({completedCount})
          </button>
        </div>

        <span className="fs-5 text-secondary">
          Showing <strong>{filteredReminders.length}</strong> {filter.toLowerCase()} reminders
        </span>
      </div>

      {/* Reminders Grid */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary fs-2" role="status"></div>
          <p className="mt-3 text-muted fs-4">Loading your daily schedule...</p>
        </div>
      ) : filteredReminders.length === 0 ? (
        <div className="card border-0 rounded-4 p-5 text-center my-4 bg-white shadow-sm">
          <i className="bi bi-calendar2-check display-1 text-success mb-3"></i>
          <h2 className="fw-bold text-dark mb-0">No Reminders</h2>
          {filter === 'Completed' && (
            <p className="fs-4 text-muted max-w-lg mx-auto mt-2 mb-0">
              You have not completed any reminders yet today.
            </p>
          )}
          {filter === 'Pending' && (
            <p className="fs-4 text-muted max-w-lg mx-auto mt-2 mb-0">
              Great news! All your daily tasks are completed.
            </p>
          )}
        </div>
      ) : (
        <div className="row g-4">
          {filteredReminders.map((rem) => {
            const isCompleted = rem.status === 'Completed';
            const remTitleStr = (rem && rem.title) ? String(rem.title).toLowerCase() : '';
            const isHydration = remTitleStr.includes('hydration') || remTitleStr.includes('water');
            const isCognitive = remTitleStr.includes('cognitive') || remTitleStr.includes('activity');

            return (
              <div key={rem.id} className="col-md-6 col-lg-4">
                <div 
                  className={`card patient-card h-100 p-4 transition-all ${
                    isCompleted ? 'bg-light border-success opacity-75' : 'bg-white shadow-sm'
                  }`}
                  style={{
                    borderTop: `6px solid ${
                      isCompleted ? '#10B981' : isHydration ? '#0284C7' : isCognitive ? '#4B3F3F' : '#D97706'
                    }`
                  }}
                >
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="badge bg-rose text-white fs-5 px-3 py-2 rounded-pill font-monospace">
                      ⏰ {rem.reminder_time}
                    </span>
                    <span className="badge bg-secondary fs-6 rounded-pill px-3 py-1">
                      {rem.repeat_option || 'Daily'}
                    </span>
                  </div>

                  <h3 className={`fw-bold fs-3 mb-2 ${isCompleted ? 'text-decoration-line-through text-muted' : 'text-dark'}`}>
                    {isHydration && <i className="bi bi-droplet-fill text-info me-2"></i>}
                    {isCognitive && <i className="bi bi-controller text-rose me-2"></i>}
                    {!isHydration && !isCognitive && <i className="bi bi-alarm text-warning me-2"></i>}
                    {rem.title}
                  </h3>

                  <p className="fs-5 text-secondary mb-4 flex-grow-1 leading-relaxed">
                    {rem.description || 'No special instructions.'}
                  </p>

                  <div>
                    <button
                      onClick={() => handleToggleComplete(rem)}
                      className={`btn patient-btn w-100 fs-5 ${
                        isCompleted ? 'btn-outline-success' : 'patient-btn-success'
                      }`}
                    >
                      <i className={`bi ${isCompleted ? 'bi-check-all' : 'bi-circle'} me-2`}></i>
                      {isCompleted ? 'Completed (Click to Undo)' : 'Mark Done'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PatientReminders;
