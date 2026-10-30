import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { caregiverRequestsAPI, familiarPeopleAPI } from '../../services/api';

const FamiliarFacesManager = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [people, setPeople] = useState([]);
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [description, setDescription] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const sampleAvatars = [
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=400',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=400'
  ];

  useEffect(() => {
    if (user && user.role === 'caregiver') {
      fetchPatients();
    }
  }, [user]);

  useEffect(() => {
    if (selectedPatientId) {
      fetchFamiliarPeople(selectedPatientId);
    }
  }, [selectedPatientId]);

  const fetchPatients = async () => {
    try {
      const res = await caregiverRequestsAPI.getAcceptedPatients(user.id);
      const list = res.data || [];
      setPatients(list);
      if (list.length > 0) {
        setSelectedPatientId(list[0].id);
      } else {
        setSelectedPatientId('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFamiliarPeople = async (patientId) => {
    try {
      const res = await familiarPeopleAPI.getByPatientId(patientId);
      setPeople(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400;
          const MAX_HEIGHT = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setPhotoUrl(dataUrl);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddPerson = async (e) => {
    e.preventDefault();
    setStatusMsg('');

    if (!selectedPatientId || !name || !relationship || !photoUrl) {
      setStatusMsg('Please select a photo from your gallery/files, enter Name, and Relationship.');
      return;
    }

    try {
      await familiarPeopleAPI.add({
        patient_id: selectedPatientId,
        caregiver_id: user.id,
        name: name.trim(),
        relationship: relationship.trim(),
        photo_path: photoUrl.trim(),
        description: description.trim()
      });

      setStatusMsg(`Successfully added ${name} for your patient!`);
      setName('');
      setRelationship('');
      setPhotoUrl('');
      setDescription('');
      fetchFamiliarPeople(selectedPatientId);
      setTimeout(() => setStatusMsg(''), 5000);
    } catch (err) {
      setStatusMsg(`Failed to add person: ${err.message}`);
    }
  };

  const handleDelete = async (id, personName) => {
    try {
      await familiarPeopleAPI.delete(id);
      setStatusMsg(`Removed ${personName} from familiar faces.`);
      setPeople((prev) => prev.filter(p => p.id !== id));
      setTimeout(() => setStatusMsg(''), 4000);
    } catch (err) {
      setStatusMsg('Failed to delete person.');
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <span className="badge bg-rose-light text-rose border border-rose fs-6 px-3 py-2 rounded-pill mb-2">
            Caregiver Photo Management
          </span>
          <h1 className="fw-bold text-dark mb-1">Manage Familiar People</h1>
          <p className="text-secondary mb-0">Upload photos of family and friends so your patient can practice memory recognition games.</p>
        </div>
      </div>

      {statusMsg && (
        <div className="alert alert-info border-2 rounded-4 p-3 mb-4 shadow-sm fs-5" role="alert">
          <i className="bi bi-info-circle-fill me-2"></i> {statusMsg}
        </div>
      )}

      <div className="row g-4 mb-5">
        {/* Add Person Form */}
        <div className="col-lg-5">
          <div className="card border-rose rounded-4 p-4 shadow-sm bg-white" style={{ borderLeft: '6px solid #4B3F3F' }}>
            <h3 className="fw-bold text-rose mb-3">Add Familiar Person</h3>
            <form onSubmit={handleAddPerson}>
              <div className="mb-3">
                <label className="form-label fw-bold fs-6 text-dark">Target Patient</label>
                <select 
                  className="form-select form-select-lg fs-6 rounded-3 border-rose"
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(parseInt(e.target.value, 10))}
                  required
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

              <div className="mb-3">
                <label className="form-label fw-bold fs-6 text-dark">Person Name</label>
                <input 
                  type="text" 
                  className="form-control form-control-lg fs-6 rounded-3 border-rose"
                  placeholder="e.g. Anitha Miller"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-bold fs-6 text-dark">Relationship</label>
                <input 
                  type="text" 
                  className="form-control form-control-lg fs-6 rounded-3 border-rose"
                  placeholder="e.g. Daughter"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-bold fs-6 text-dark">Upload Photo from Gallery / Device Files</label>
                <input 
                  type="file" 
                  accept="image/*"
                  className="form-control form-control-lg fs-6 rounded-3 border-rose"
                  onChange={handleFileChange}
                />
                
                {/* Selected Photo Live Preview */}
                {photoUrl ? (
                  <div className="mt-3 p-3 bg-rose-light border border-rose rounded-3 text-center">
                    <div className="text-muted fs-6 mb-2">Photo Preview:</div>
                    <img 
                      src={photoUrl} 
                      alt="Preview"
                      className="rounded-circle border border-3 border-rose shadow-sm mx-auto"
                      style={{ width: '90px', height: '90px', objectFit: 'cover' }}
                    />
                  </div>
                ) : (
                  <div className="mt-2 text-muted fs-6">Or quick select a sample avatar:</div>
                )}

                <div className="d-flex gap-2 mt-2">
                  {sampleAvatars.map((url, idx) => (
                    <img 
                      key={idx}
                      src={url}
                      alt="avatar"
                      onClick={() => setPhotoUrl(url)}
                      className={`rounded-circle cursor-pointer border ${photoUrl === url ? 'border-3 border-rose scale-110' : 'border-secondary'}`}
                      style={{ width: '42px', height: '42px', objectFit: 'cover' }}
                      title="Quick Sample Avatar"
                    />
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label fw-bold fs-6 text-dark">Description / Memory Note</label>
                <textarea 
                  className="form-control fs-6 rounded-3 border-rose"
                  rows="3"
                  placeholder="e.g. Calls every evening at 6:00 PM. Lives in Chicago."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                ></textarea>
              </div>

              <button type="submit" className="btn patient-btn-primary w-100 py-3 fw-bold fs-5">
                Save Familiar Person
              </button>
            </form>
          </div>
        </div>

        {/* Familiar People List */}
        <div className="col-lg-7">
          <div className="card border-0 rounded-4 p-4 shadow-sm bg-white">
            <h3 className="fw-bold text-dark mb-3">Existing Familiar People ({people.length})</h3>

            {people.length === 0 ? (
              <p className="text-secondary fs-6 py-4 text-center">No familiar people added yet for this patient. Add their first family member or friend on the left!</p>
            ) : (
              <div className="row g-3">
                {people.map((person) => (
                  <div key={person.id} className="col-md-6">
                    <div className="card h-100 border-rose rounded-3 p-3 bg-rose-light">
                      <div className="d-flex gap-3 align-items-center mb-2">
                        <img 
                          src={person.photo_path} 
                          alt={person.name}
                          className="rounded-circle border border-2 border-rose shadow-sm"
                          style={{ width: '70px', height: '70px', objectFit: 'cover' }}
                        />
                        <div>
                          <h4 className="fw-bold fs-5 text-dark mb-0">{person.name}</h4>
                          <span className="badge bg-rose-light text-rose border border-rose fs-6">{person.relationship}</span>
                        </div>
                      </div>
                      <p className="text-secondary fs-6 mb-3">{person.description || 'No additional note.'}</p>
                      <button 
                        onClick={() => handleDelete(person.id, person.name)}
                        className="btn patient-btn-danger btn-sm align-self-start fs-6 py-1 px-3"
                      >
                        <i className="bi bi-trash-fill me-1"></i> Remove
                      </button>
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

export default FamiliarFacesManager;
