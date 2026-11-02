import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCaregiverPatient } from '../../context/CaregiverPatientContext';
import { remindersAPI } from '../../services/api';

const CaregiverReminders = () => {
  const { user } = useAuth();
  const { 
    patients, 
    selectedPatientId, 
    selectedPatient, 
    setSelectedPatientId 
  } = useCaregiverPatient();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states for Create
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reminderDate, setReminderDate] = useState(new Date().toISOString().split('T')[0]);
  const [reminderTime, setReminderTime] = useState('09:00 AM');
  const [repeatOption, setRepeatOption] = useState('Daily');

  // Edit Modal states
  const [editingReminder, setEditingReminder] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editRepeat, setEditRepeat] = useState('Daily');
  const [editStatus, setEditStatus] = useState('Pending');

  useEffect(() => {
    if (selectedPatientId) {
      fetchReminders();
    } else {
      setReminders([]);
      setLoading(false);
    }
  }, [selectedPatientId]);

  const fetchReminders = async () => {
    setLoading(true);
    try {
      const res = await remindersAPI.getByPatientId(selectedPatientId);
      setReminders(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReminder = async (e) => {
    if (e) e.preventDefault();
    if (!title.trim()) return;

    try {
      await remindersAPI.create({
        patient_id: selectedPatientId,
        caregiver_id: user.id,
        title: title.trim(),
        description: description.trim(),
        reminder_date: reminderDate,
        reminder_time: reminderTime,
        repeat_option: repeatOption
      });

      setTitle('');
      setDescription('');
      fetchReminders();
    } catch (err) {
      alert("Failed to create reminder.");
    }
  };

  const handleAddPreset = async (preset) => {
    try {
      await remindersAPI.create({
        patient_id: selectedPatientId,
        caregiver_id: user.id,
        title: preset.title,
        description: preset.description,
        reminder_date: new Date().toISOString().split('T')[0],
        reminder_time: preset.time,
        repeat_option: 'Daily'
      });
      fetchReminders();
    } catch (err) {
      alert("Failed to add preset reminder.");
    }
  };

  const handleSetNextMinute = () => {
    const nextMin = new Date(Date.now() + 65 * 1000);
    const timeStr = nextMin.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    setReminderTime(timeStr);
    if (!title.trim()) setTitle('Daily Hydration');
    if (!description.trim()) setDescription('Drink a large glass of fresh water to stay hydrated and refreshed.');
  };

  const handleDeleteReminder = async (id, remTitle) => {
    if (!window.confirm(`Delete reminder "${remTitle}"?`)) return;
    try {
      await remindersAPI.delete(id);
      setReminders(reminders.filter((r) => r.id !== id));
    } catch (err) {
      alert("Failed to delete reminder.");
    }
  };

  const openEditModal = (rem) => {
    setEditingReminder(rem);
    setEditTitle(rem.title);
    setEditDescription(rem.description || '');
    setEditDate(rem.reminder_date || new Date().toISOString().split('T')[0]);
    setEditTime(rem.reminder_time || '09:00 AM');
    setEditRepeat(rem.repeat_option || 'Daily');
    setEditStatus(rem.status || 'Pending');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingReminder) return;

    try {
      await remindersAPI.update(editingReminder.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        reminder_date: editDate,
        reminder_time: editTime,
        repeat_option: editRepeat,
        status: editStatus
      });
      setEditingReminder(null);
      fetchReminders();
    } catch (err) {
      alert("Failed to update reminder.");
    }
  };

  return (
    <div className="container py-4">
      {/* Caregiver Portal Header */}
      <div className="card border-0 rounded-4 shadow-sm bg-white p-4 mb-4" style={{ borderLeft: '6px solid #8FAF9A' }}>
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div>
            <span className="badge bg-dark fs-6 px-3 py-1 rounded-pill mb-2">
              <i className="bi bi-shield-check me-1"></i> Caregiver Portal
            </span>
            <h1 className="fw-bold text-dark mb-1">Patient Reminders & Schedule Management</h1>
          </div>

          {/* Patient Switcher */}
          {patients.length > 0 && (
            <div className="bg-light p-3 rounded-4 border">
              <label className="form-label fw-bold mb-1 fs-6 text-dark">Select Patient:</label>
              <select
                className="form-select rounded-3 fw-bold text-primary"
                value={selectedPatientId || ''}
                onChange={(e) => setSelectedPatientId(Number(e.target.value))}
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    👤 {p.name} (#{p.id})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Preset Quick Add Bar */}
      <div className="card border-0 rounded-4 shadow-sm bg-white p-4 mb-4">
        <div className="mb-3">
          <h4 className="fw-bold text-dark mb-0">
            <i className="bi bi-lightning-charge-fill text-warning me-2"></i> Quick Default Preset Reminders
          </h4>
        </div>
        <div className="row g-3">
          <div className="col-md-3">
            <button
              onClick={() => handleAddPreset({
                title: 'Daily Hydration',
                description: 'Drink a large glass of fresh water to stay hydrated and refreshed.',
                time: '08:00 AM'
              })}
              className="btn btn-outline-primary w-100 p-3 rounded-3 text-start h-100"
            >
              <div className="fw-bold fs-5 text-dark mb-1">💧 Daily Hydration</div>
              <div className="small text-muted">08:00 AM • Daily</div>
              <div className="mt-2 text-primary fw-bold text-sm">+ Add Preset</div>
            </button>
          </div>

          <div className="col-md-3">
            <button
              onClick={() => handleAddPreset({
                title: 'Daily Cognitive Activity',
                description: 'It\'s time to play your daily cognitive training games on MindCare AI.',
                time: '10:30 AM'
              })}
              className="btn btn-outline-primary w-100 p-3 rounded-3 text-start h-100"
            >
              <div className="fw-bold fs-5 text-dark mb-1">🧠 Cognitive Activity</div>
              <div className="small text-muted">10:30 AM • Daily</div>
              <div className="mt-2 text-primary fw-bold text-sm">+ Add Preset</div>
            </button>
          </div>

          <div className="col-md-3">
            <button
              onClick={() => handleAddPreset({
                title: 'Morning Medication',
                description: 'Take morning prescribed pills with water after breakfast.',
                time: '09:00 AM'
              })}
              className="btn btn-outline-primary w-100 p-3 rounded-3 text-start h-100"
            >
              <div className="fw-bold fs-5 text-dark mb-1">💊 Morning Medication</div>
              <div className="small text-muted">09:00 AM • Daily</div>
              <div className="mt-2 text-primary fw-bold text-sm">+ Add Preset</div>
            </button>
          </div>

          <div className="col-md-3">
            <button
              onClick={() => handleAddPreset({
                title: 'Afternoon Walk',
                description: 'Take a 20-minute gentle walk in the garden or living area.',
                time: '04:00 PM'
              })}
              className="btn btn-outline-primary w-100 p-3 rounded-3 text-start h-100"
            >
              <div className="fw-bold fs-5 text-dark mb-1">🚶‍♂️ Afternoon Walk</div>
              <div className="small text-muted">04:00 PM • Daily</div>
              <div className="mt-2 text-primary fw-bold text-sm">+ Add Preset</div>
            </button>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Custom Reminder Form */}
        <div className="col-lg-5">
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
            <h3 className="fw-bold text-primary mb-3">Create Custom Reminder</h3>
            <form onSubmit={handleCreateReminder}>
              <div className="mb-3">
                <label className="form-label fw-bold">Reminder Title *</label>
                <input
                  type="text"
                  className="form-control rounded-3 py-2"
                  placeholder="e.g. Evening Chamomile Tea"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-bold">Description / Instructions</label>
                <textarea
                  className="form-control rounded-3"
                  rows="3"
                  placeholder="Provide helpful context for the patient..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                ></textarea>
              </div>

              <div className="row mb-3">
                <div className="col-6">
                  <label className="form-label fw-bold">Date</label>
                  <input
                    type="date"
                    className="form-control rounded-3 py-2"
                    value={reminderDate}
                    onChange={(e) => setReminderDate(e.target.value)}
                  />
                </div>
                <div className="col-6">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <label className="form-label fw-bold mb-0">Time</label>
                    <button
                      type="button"
                      onClick={handleSetNextMinute}
                      className="btn btn-sm btn-outline-warning py-0 px-2 fw-bold text-dark rounded-pill"
                      style={{ fontSize: '0.75rem' }}
                      title="Sets time to 1 minute from now on your laptop for testing"
                    >
                      ⚡ Next Min
                    </button>
                  </div>
                  <input
                    type="text"
                    className="form-control rounded-3 py-2"
                    placeholder="e.g. 09:00 PM or 21:00"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    required
                  />
                  <small className="text-muted d-block mt-1" style={{ fontSize: '0.75rem' }}>E.g. 09:00 PM, 21:00, 08:30 AM</small>
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label fw-bold">Repeat Frequency</label>
                <select
                  className="form-select rounded-3 py-2"
                  value={repeatOption}
                  onChange={(e) => setRepeatOption(e.target.value)}
                >
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="None">None</option>
                </select>
              </div>

              <button type="submit" className="btn btn-primary w-100 fw-bold py-3 rounded-3 shadow-sm fs-5">
                <i className="bi bi-plus-circle-fill me-2"></i> Save Patient Reminder
              </button>
            </form>
          </div>
        </div>

        {/* Reminders List Table */}
        <div className="col-lg-7">
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h3 className="fw-bold text-dark mb-0">Active Patient Reminders ({reminders.length})</h3>
              <button onClick={fetchReminders} className="btn btn-sm btn-outline-secondary rounded-pill">
                <i className="bi bi-arrow-clockwise me-1"></i> Refresh
              </button>
            </div>

            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary"></div>
              </div>
            ) : reminders.length === 0 ? (
              <div className="p-4 text-center bg-light rounded-4 my-3">
                <i className="bi bi-calendar-x display-4 text-muted mb-2"></i>
                <p className="text-muted fs-5 mb-0">No active reminders configured for this patient yet.</p>
                <p className="small text-secondary">Click any preset above to quickly create standard daily reminders.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Time & Schedule</th>
                      <th>Title & Instructions</th>
                      <th>Status</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reminders.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <div className="fw-bold text-dark">{r.reminder_time}</div>
                          <span className="badge bg-secondary text-xs">{r.repeat_option || 'Daily'}</span>
                        </td>
                        <td>
                          <div className="fw-bold text-primary fs-6">{r.title}</div>
                          <div className="text-secondary small">{r.description || 'No extra notes.'}</div>
                        </td>
                        <td>
                          <span className={`badge ${r.status === 'Completed' ? 'bg-success' : 'bg-warning text-dark'}`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="text-end">
                          <div className="btn-group">
                            <button
                              onClick={() => openEditModal(r)}
                              className="btn btn-sm btn-outline-primary"
                              title="Edit Reminder"
                            >
                              <i className="bi bi-pencil-square"></i>
                            </button>
                            <button
                              onClick={() => handleDeleteReminder(r.id, r.title)}
                              className="btn btn-sm btn-outline-danger"
                              title="Delete Reminder"
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Reminder Modal */}
      {editingReminder && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 p-4">
              <div className="modal-header border-bottom-0">
                <h3 className="modal-title fw-bold text-primary">Edit Reminder</h3>
                <button type="button" className="btn-close" onClick={() => setEditingReminder(null)}></button>
              </div>
              <form onSubmit={handleSaveEdit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-bold">Title</label>
                    <input
                      type="text"
                      className="form-control rounded-3"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold">Description</label>
                    <textarea
                      className="form-control rounded-3"
                      rows="3"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                    ></textarea>
                  </div>

                  <div className="row mb-3">
                    <div className="col-6">
                      <label className="form-label fw-bold">Time</label>
                      <input
                        type="text"
                        className="form-control rounded-3"
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-bold">Repeat</label>
                      <select
                        className="form-select rounded-3"
                        value={editRepeat}
                        onChange={(e) => setEditRepeat(e.target.value)}
                      >
                        <option value="Daily">Daily</option>
                        <option value="Weekly">Weekly</option>
                        <option value="None">None</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold">Status</label>
                    <select
                      className="form-select rounded-3"
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>

                <div className="modal-footer border-top-0 d-flex gap-2">
                  <button type="button" className="btn btn-secondary px-4 py-2" onClick={() => setEditingReminder(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary px-4 py-2">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaregiverReminders;
