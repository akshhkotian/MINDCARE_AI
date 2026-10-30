import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { memoryAPI, caregiverRequestsAPI } from '../../services/api';

const PRESETS = [
  {
    title: 'Home Address & Location',
    category: 'Place',
    description: '142 Maplewood Drive, Apartment 4B. Emergency landmark: Green Park across the street.'
  },
  {
    title: 'Emergency Contact',
    category: 'Family',
    description: 'Primary Contact: Anitha (Daughter) - (555) 019-2831. Lives 10 minutes away.'
  },
  {
    title: 'Morning Routine & Medication',
    category: 'Routine',
    description: 'Take morning medication with a full glass of water at 8:00 AM after breakfast.'
  },
  {
    title: 'Doctor & Clinic Notes',
    category: 'Note',
    description: 'Dr. Sarah Jenkins (Neurology Clinic) - Appointment every 2nd Tuesday of the month.'
  }
];

const CaregiverMemoryManagement = () => {
  const { user } = useAuth();
  const location = useLocation();

  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState(null);

  // Form & Editing states
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Family');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (user && user.role === 'caregiver') {
      fetchPatients();
    }
  }, [user]);

  useEffect(() => {
    if (selectedPatientId) {
      fetchMemoryItems(selectedPatientId);
      handleCancelEdit();
    } else {
      setItems([]);
      setLoading(false);
    }
  }, [selectedPatientId]);

  const fetchPatients = async () => {
    try {
      const res = await caregiverRequestsAPI.getAcceptedPatients(user.id);
      const list = res.data || [];
      setPatients(list);

      const passedPatientId = location.state?.patientId;
      if (passedPatientId && list.some(p => String(p.id) === String(passedPatientId))) {
        setSelectedPatientId(String(passedPatientId));
      } else if (list.length > 0) {
        setSelectedPatientId(String(list[0].id));
      }
    } catch (err) {
      console.error("Fetch patients error:", err);
    }
  };

  const fetchMemoryItems = async (patientId) => {
    setLoading(true);
    try {
      const res = await memoryAPI.getByPatientId(patientId);
      setItems(res.data || []);
    } catch (err) {
      console.error("Fetch memory items error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!selectedPatientId) {
      setStatusMsg({ type: 'danger', text: 'Please select a patient first.' });
      return;
    }
    if (!title.trim() || !description.trim()) return;

    try {
      if (editingId) {
        await memoryAPI.update(editingId, {
          title: title.trim(),
          category,
          description: description.trim()
        });
        setStatusMsg({ type: 'success', text: '🎉 Memory Care card updated successfully!' });
      } else {
        await memoryAPI.create({
          patient_id: selectedPatientId,
          title: title.trim(),
          category,
          description: description.trim()
        });
        setStatusMsg({ type: 'success', text: '🎉 Memory Care card added successfully!' });
      }

      handleCancelEdit();
      fetchMemoryItems(selectedPatientId);
      setTimeout(() => setStatusMsg(null), 5000);
    } catch (err) {
      setStatusMsg({ type: 'danger', text: `Failed to ${editingId ? 'update' : 'add'} memory card. Please try again.` });
    }
  };

  const handleEditClick = (item) => {
    setEditingId(item.id);
    setTitle(item.title);
    setCategory(item.category || 'Family');
    setDescription(item.description);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTitle('');
    setCategory('Family');
    setDescription('');
  };

  const handleDeleteItem = async (id, cardTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${cardTitle}"?`)) return;
    try {
      await memoryAPI.delete(id);
      setItems(items.filter((item) => item.id !== id));
      if (editingId === id) {
        handleCancelEdit();
      }
      setStatusMsg({ type: 'success', text: 'Memory Care card deleted successfully.' });
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err) {
      setStatusMsg({ type: 'danger', text: 'Failed to delete memory card.' });
    }
  };

  const applyPreset = (preset) => {
    setTitle(preset.title);
    setCategory(preset.category);
    setDescription(preset.description);
  };

  const selectedPatient = patients.find(p => String(p.id) === String(selectedPatientId));

  const getCategoryBadgeClass = (cat) => {
    switch (cat) {
      case 'Family': return 'bg-danger text-white';
      case 'Routine': return 'bg-warning text-dark';
      case 'Place': return 'bg-success text-white';
      default: return 'bg-rose-light text-rose border border-rose';
    }
  };

  const getCategoryIcon = (cat) => {
    switch (cat) {
      case 'Family': return 'bi-person-heart';
      case 'Routine': return 'bi-alarm-fill';
      case 'Place': return 'bi-geo-alt-fill';
      default: return 'bi-journal-bookmark-fill';
    }
  };

  return (
    <div className="container py-4">
      {/* Header & Patient Selector */}
      <div className="card border-rose rounded-4 shadow-sm bg-white p-4 mb-4" style={{ borderLeft: '6px solid #4B3F3F' }}>
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div>
            <span className="badge bg-rose-light text-rose border border-rose fs-6 px-3 py-2 rounded-pill mb-2">
              Caregiver Memory Care Hub
            </span>
            <h1 className="fw-bold text-dark mb-1">Patient Memory Care & Assistance Cards</h1>
          </div>

          {/* Patient Dropdown Selector */}
          <div style={{ minWidth: '260px' }}>
            <label className="form-label fw-bold fs-6 text-dark mb-1">Select Patient</label>
            {patients.length === 0 ? (
              <div className="alert alert-warning py-2 px-3 mb-0 fs-6 rounded-3">
                <i className="bi bi-exclamation-triangle me-1"></i> No connected patients yet.
              </div>
            ) : (
              <select
                className="form-select form-select-lg rounded-3 border-rose shadow-sm fw-bold fs-6"
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    👤 {p.name} (ID: #{p.id})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {statusMsg && (
        <div className={`alert alert-${statusMsg.type} alert-dismissible fade show rounded-4 mb-4 shadow-sm fs-5`} role="alert">
          <i className="bi bi-info-circle-fill me-2"></i> {statusMsg.text}
          <button type="button" className="btn-close" onClick={() => setStatusMsg(null)}></button>
        </div>
      )}

      {/* Main Grid */}
      <div className="row g-4">
        {/* Form Column */}
        <div className="col-lg-5">
          <div className="card border-rose rounded-4 p-4 shadow-sm bg-white" style={{ borderLeft: '6px solid #4B3F3F' }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h3 className="fw-bold text-rose mb-0">
                <i className={`bi ${editingId ? 'bi-pencil-square' : 'bi-plus-circle-fill'} me-2`}></i>
                {editingId ? 'Edit Memory Care Card' : 'Add Memory Care Card'}
              </h3>
              {editingId && (
                <button type="button" onClick={handleCancelEdit} className="btn btn-outline-secondary btn-sm rounded-pill">
                  Cancel Edit
                </button>
              )}
            </div>

            {selectedPatient ? (
              <p className="text-muted fs-6 mb-3">
                {editingId ? 'Editing card' : 'Creating card'} for <strong className="text-dark">{selectedPatient.name}</strong>.
              </p>
            ) : (
              <p className="text-danger fs-6 mb-3">Please select a patient above.</p>
            )}

            {/* Quick Preset Templates */}
            {!editingId && (
              <div className="mb-4">
                <label className="form-label fw-bold fs-6 text-dark mb-2">Quick Preset Templates</label>
                <div className="d-flex flex-wrap gap-2">
                  {PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="btn btn-sm btn-outline-danger rounded-pill fw-semibold fs-6"
                    >
                      + {preset.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSaveItem}>
              <div className="mb-3">
                <label className="form-label fw-bold fs-6 text-dark">Card Title / Subject</label>
                <input
                  type="text"
                  className="form-control form-control-lg fs-6 rounded-3 border-rose"
                  placeholder="e.g. Home Address / Emergency Contact / Daily Routine"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-bold fs-6 text-dark">Category</label>
                <select
                  className="form-select form-select-lg fs-6 rounded-3 border-rose"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="Family">Family Contact & Relationships</option>
                  <option value="Routine">Daily Routine & Medication Schedule</option>
                  <option value="Place">Address, Place & Emergency Landmark</option>
                  <option value="Note">General Memory Care Note</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="form-label fw-bold fs-6 text-dark">Description / Details</label>
                <textarea
                  className="form-control fs-6 rounded-3 border-rose"
                  rows="4"
                  placeholder="Provide detailed information, clear instructions, or notes for the patient..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={!selectedPatientId}
                className="btn patient-btn-primary w-100 fw-bold py-3 fs-5 rounded-3 shadow-sm d-flex align-items-center justify-content-center gap-2"
              >
                <i className={`bi ${editingId ? 'bi-check-circle-fill' : 'bi-journal-plus'} fs-4`}></i>
                {editingId ? 'Update Memory Care Card' : 'Save Memory Care Card'}
              </button>
            </form>
          </div>
        </div>

        {/* Existing Memory Cards List Column */}
        <div className="col-lg-7">
          <div className="card border-0 rounded-4 p-4 shadow-sm bg-white">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h3 className="fw-bold text-dark mb-0">Active Memory Cards</h3>
              {selectedPatient && (
                <span className="badge bg-rose-light text-rose border border-rose fs-6 rounded-pill px-3 py-2">
                  {items.length} Cards for {selectedPatient.name}
                </span>
              )}
            </div>

            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-rose" role="status"></div>
                <p className="text-muted mt-2">Loading memory cards...</p>
              </div>
            ) : !selectedPatientId ? (
              <div className="alert alert-info py-4 text-center rounded-4 fs-5">
                Please select a patient from the dropdown above to view and add memory cards.
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-5 border border-2 border-dashed rounded-4 bg-rose-light">
                <i className="bi bi-journal-x display-3 text-rose mb-2"></i>
                <h4 className="fw-bold text-dark">No Memory Care Cards Yet</h4>
                <p className="text-secondary px-4 fs-6 mb-0">
                  No memory care cards have been created for {selectedPatient.name} yet. Use the form on the left to add their home address, emergency contacts, or routines.
                </p>
              </div>
            ) : (
              <div className="row g-3">
                {items.map((item) => (
                  <div key={item.id} className="col-12">
                    <div className="p-3 border-rose rounded-4 bg-rose-light shadow-sm d-flex justify-content-between align-items-start gap-3">
                      <div className="pe-2 flex-grow-1">
                        <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                          <span className={`badge ${getCategoryBadgeClass(item.category)} fs-6 px-3 py-1 rounded-pill`}>
                            <i className={`bi ${getCategoryIcon(item.category)} me-1`}></i>
                            {item.category}
                          </span>
                          <h4 className="fw-bold fs-5 mb-0 text-dark">{item.title}</h4>
                        </div>
                        <p className="text-secondary mb-0 fs-6 leading-relaxed">{item.description}</p>
                      </div>

                      <div className="d-flex gap-2">
                        <button
                          onClick={() => handleEditClick(item)}
                          className="btn btn-outline-primary btn-sm rounded-circle p-2"
                          title="Edit Card"
                          aria-label="Edit Card"
                        >
                          <i className="bi bi-pencil-fill"></i>
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id, item.title)}
                          className="btn btn-outline-danger btn-sm rounded-circle p-2"
                          title="Delete Card"
                          aria-label="Delete Card"
                        >
                          <i className="bi bi-trash-fill"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaregiverMemoryManagement;
