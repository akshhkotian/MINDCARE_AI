import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useVoice } from '../context/VoiceContext';
import LanguageSelector from '../components/LanguageSelector';
import { authAPI, caregiverRequestsAPI } from '../services/api';

const AccountSettings = () => {
  const { user, login } = useAuth();
  const { t } = useLanguage();
  const { activeIndicVoice, preferredGender, setPreferredGender, testIndicVoice, isPlayingTest } = useVoice();

  const [name, setName] = useState(user?.name || '');
  const [age, setAge] = useState(user?.age || '');
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordErr, setPasswordErr] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Caregiver Connection state for patients
  const [connStatus, setConnStatus] = useState(null);
  const [cgCodeInput, setCgCodeInput] = useState('');
  const [cgMsg, setCgMsg] = useState('');
  const [cgErr, setCgErr] = useState('');
  const [cgLoading, setCgLoading] = useState(false);

  const fetchConnectionStatus = async () => {
    if (user?.role === 'patient') {
      try {
        const res = await caregiverRequestsAPI.getPatientStatus(user.id);
        setConnStatus(res.data || null);
      } catch (err) {
        console.error("Caregiver status fetch error:", err);
      }
    }
  };

  useEffect(() => {
    fetchConnectionStatus();
  }, [user]);

  const handleConnectCaregiver = async (e) => {
    e.preventDefault();
    if (!cgCodeInput.trim()) return;
    setCgLoading(true);
    setCgMsg('');
    setCgErr('');
    try {
      const res = await caregiverRequestsAPI.connect(user.id, cgCodeInput.trim().toUpperCase());
      setCgMsg(res.data.message || 'Connection request sent successfully!');
      setCgCodeInput('');
      fetchConnectionStatus();
    } catch (err) {
      setCgErr(err.response?.data?.error || 'Failed to send request. Check code.');
    } finally {
      setCgLoading(false);
    }
  };

  const handleDisconnectCaregiver = async () => {
    if (!window.confirm("Are you sure you want to disconnect from your current caregiver?")) return;
    try {
      await caregiverRequestsAPI.disconnect(user.id);
      fetchConnectionStatus();
      setCgMsg("Caregiver disconnected successfully.");
      setTimeout(() => setCgMsg(''), 4000);
    } catch (err) {
      setCgErr("Failed to disconnect caregiver.");
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileMsg('');
    setProfileErr('');
    setProfileLoading(true);

    try {
      const res = await authAPI.updateProfile({
        user_id: user.id,
        name: name.trim(),
        age: age ? parseInt(age, 10) : null
      });

      const updatedUser = res.data.user;
      // Update session storage
      const stored = JSON.parse(sessionStorage.getItem('mindcare_user') || '{}');
      const newUserData = { ...stored, ...updatedUser };
      sessionStorage.setItem('mindcare_user', JSON.stringify(newUserData));

      setProfileMsg('Profile details updated successfully!');
      setTimeout(() => setProfileMsg(''), 4000);
      window.location.reload(); // Refresh session
    } catch (err) {
      setProfileErr(err.response?.data?.error || 'Failed to update profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMsg('');
    setPasswordErr('');

    if (newPassword !== confirmPassword) {
      setPasswordErr('New password and confirm password do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordErr('New password must be at least 6 characters long.');
      return;
    }

    setPasswordLoading(true);

    try {
      await authAPI.changePassword({
        user_id: user.id,
        current_password: currentPassword,
        new_password: newPassword
      });

      setPasswordMsg('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordMsg(''), 5000);
    } catch (err) {
      setPasswordErr(err.response?.data?.error || 'Failed to change password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const isCaregiver = user?.role === 'caregiver';

  return (
    <div className="container py-4">
      <div className="mb-4">
        <span className="badge bg-rose-light text-rose border border-rose fs-6 px-3 py-2 rounded-pill mb-2">
          Account Management
        </span>
        <h1 className="fw-bold text-dark mb-1">
          {user?.role === 'caregiver' ? 'Caregiver Account Settings' : 'Patient Account Settings'}
        </h1>
      </div>

      <div className="row g-4">
        {/* Left Column: Profile Summary & Update */}
        <div className="col-lg-6">
          <div className="card border-rose rounded-4 p-4 shadow-sm bg-white mb-4" style={{ borderLeft: '6px solid #4B3F3F' }}>
            <h3 className="fw-bold text-rose mb-3">
              <i className="bi bi-person-badge-fill me-2"></i> Account Details
            </h3>

            <div className="p-3 bg-rose-light rounded-3 mb-4 border border-rose">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-secondary fs-6">Account Role:</span>
                <span className="badge bg-rose-light text-rose border border-rose fs-6 text-capitalize fw-bold">{user?.role}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-secondary fs-6">Registered Email:</span>
                <strong className="text-dark fs-6">{user?.email}</strong>
              </div>
              {isCaregiver && user?.caregiver_code && (
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-secondary fs-6">Caregiver ID Code:</span>
                  <span className="badge bg-warning text-dark border border-warning fs-6">
                    {user.caregiver_code}
                  </span>
                </div>
              )}
              {!isCaregiver && (
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-secondary fs-6">Caregiver Link:</span>
                  <span className={`badge fs-6 ${
                    connStatus?.status === 'accepted' ? 'bg-success' :
                    connStatus?.status === 'pending' ? 'bg-warning text-dark' :
                    connStatus?.status === 'rejected' ? 'bg-danger' : 'bg-secondary'
                  }`}>
                    {connStatus?.status === 'accepted' ? `Connected (${connStatus.caregiver_name})` :
                     connStatus?.status === 'pending' ? 'Pending Approval' :
                     connStatus?.status === 'rejected' ? 'Declined' : 'Not Connected'}
                  </span>
                </div>
              )}
            </div>

            {profileMsg && (
              <div className="alert alert-success rounded-3 p-3 mb-3 fs-6">
                <i className="bi bi-check-circle-fill me-2"></i>{profileMsg}
              </div>
            )}
            {profileErr && (
              <div className="alert alert-danger rounded-3 p-3 mb-3 fs-6">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>{profileErr}
              </div>
            )}

            <form onSubmit={handleUpdateProfile}>
              <div className="mb-3">
                <label className="form-label fw-bold fs-6">Full Name</label>
                <input 
                  type="text" 
                  className="form-control form-control-lg fs-6 rounded-3 border-rose"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="mb-4">
                <label className="form-label fw-bold fs-6">Age</label>
                <input 
                  type="number" 
                  className="form-control form-control-lg fs-6 rounded-3 border-rose"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 74"
                />
              </div>

              <button 
                type="submit" 
                disabled={profileLoading} 
                className="btn patient-btn-primary w-100 py-3 fw-bold fs-5 rounded-3"
              >
                {profileLoading ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </form>
          </div>

          {/* Caregiver Connection Management (For Patients) */}
          {!isCaregiver && (
            <div className="card border-rose rounded-4 p-4 shadow-sm bg-white mb-4" style={{ borderLeft: '6px solid #D98A6C' }}>
              <h3 className="fw-bold text-rose mb-3 fs-5">
                <i className="bi bi-people-fill me-2"></i> Caregiver Connection
              </h3>

              {cgMsg && (
                <div className="alert alert-success rounded-3 p-3 mb-3 fs-6">
                  <i className="bi bi-check-circle-fill me-2"></i>{cgMsg}
                </div>
              )}
              {cgErr && (
                <div className="alert alert-danger rounded-3 p-3 mb-3 fs-6">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>{cgErr}
                </div>
              )}

              {connStatus?.status === 'accepted' ? (
                <div className="p-3 bg-success-subtle rounded-3 border border-success-subtle d-flex justify-content-between align-items-center">
                  <div>
                    <strong className="text-success fs-6 d-block">
                      <i className="bi bi-check-circle-fill me-1"></i> Connected to {connStatus.caregiver_name}
                    </strong>
                    <span className="text-secondary small">Caregiver Code: {connStatus.caregiver_code || 'Linked'}</span>
                  </div>
                  <button
                    onClick={handleDisconnectCaregiver}
                    className="btn btn-sm btn-outline-danger rounded-pill px-3"
                  >
                    Disconnect
                  </button>
                </div>
              ) : connStatus?.status === 'pending' ? (
                <div className="p-3 bg-warning-subtle rounded-3 border border-warning-subtle">
                  <strong className="text-warning-emphasis fs-6 d-block">
                    <i className="bi bi-hourglass-split me-1"></i> Connection Request Pending
                  </strong>
                  <span className="text-secondary small">
                    Sent to {connStatus.caregiver_name} {connStatus.caregiver_code ? `(${connStatus.caregiver_code})` : ''}. Waiting for approval.
                  </span>
                </div>
              ) : (
                <form onSubmit={handleConnectCaregiver}>
                  {connStatus?.status === 'rejected' && (
                    <div className="alert alert-danger p-2 mb-3 small rounded-3">
                      <i className="bi bi-exclamation-circle me-1"></i> Your previous request was declined. You can enter a new Caregiver Code below.
                    </div>
                  )}
                  <label className="form-label fw-bold fs-6">Caregiver ID Code</label>
                  <div className="input-group mb-2">
                    <input
                      type="text"
                      className="form-control fs-6 border-rose"
                      placeholder="e.g. MC-CG-1001"
                      value={cgCodeInput}
                      onChange={(e) => setCgCodeInput(e.target.value.toUpperCase())}
                      disabled={cgLoading}
                      required
                    />
                    <button
                      type="submit"
                      disabled={cgLoading || !cgCodeInput.trim()}
                      className="btn patient-btn-primary px-3 fs-6"
                    >
                      {cgLoading ? 'Sending...' : 'Connect'}
                    </button>
                  </div>
                  <small className="text-muted">Ask your caregiver for their unique Caregiver ID Code.</small>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Language Preferences & Change Password */}
        <div className="col-lg-6">
          {/* Language & Indic Voice Preferences Card */}
          <div className="card border-rose rounded-4 p-4 shadow-sm bg-white mb-4" style={{ borderLeft: '6px solid #8FAF9A' }}>
            <h3 className="fw-bold text-rose mb-2">
              <i className="bi bi-translate me-2"></i> {t('languagePreferences', 'Language & Indic Voice Preferences')}
            </h3>
            <p className="text-secondary fs-6 mb-3">
              {t('selectPreferredLanguage', 'Select your preferred Indian language for text display and native voice speech:')}
            </p>
            <LanguageSelector variant="select" className="mb-3" />

            {/* Indic Voice Status & Controls */}
            <div className="p-3 bg-rose-light rounded-3 border border-rose mt-2">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold text-dark fs-7">
                  <i className="bi bi-soundwave text-rose me-1"></i> {t('indicVoice', 'Indic Voice Engine')}
                </span>
                <span className="badge bg-white text-rose border border-rose fs-7 fw-bold">
                  🇮🇳 {activeIndicVoice ? activeIndicVoice.name.split('-')[0].trim() : 'Native Indic TTS'}
                </span>
              </div>
              <p className="text-muted fs-7 mb-2">
                {activeIndicVoice?.name || 'Authentic Indian language speech synthesis tuned for elder cognitive care.'}
              </p>

              {/* Voice Gender Switch */}
              <div className="mb-3">
                <label className="form-label fs-7 fw-bold text-secondary mb-1">
                  {t('voiceGender', 'Voice Preference')}
                </label>
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPreferredGender('female')}
                    className={`btn btn-sm rounded-pill px-3 py-1 fs-7 fw-bold ${
                      preferredGender === 'female' 
                        ? 'btn-danger text-white' 
                        : 'btn-outline-secondary bg-white'
                    }`}
                  >
                    🌸 {t('femaleVoice', 'Warm Female Voice')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreferredGender('male')}
                    className={`btn btn-sm rounded-pill px-3 py-1 fs-7 fw-bold ${
                      preferredGender === 'male' 
                        ? 'btn-danger text-white' 
                        : 'btn-outline-secondary bg-white'
                    }`}
                  >
                    🌿 {t('maleVoice', 'Gentle Male Voice')}
                  </button>
                </div>
              </div>

              {/* Test Voice Button */}
              <button
                type="button"
                onClick={() => testIndicVoice()}
                disabled={isPlayingTest}
                className="btn btn-outline-danger w-100 rounded-pill py-2 fw-bold fs-6 d-flex align-items-center justify-content-center gap-2 bg-white"
              >
                <i className={`bi ${isPlayingTest ? 'bi-volume-up-fill animate-pulse text-danger' : 'bi-play-circle-fill'}`}></i>
                <span>{isPlayingTest ? 'Speaking sample in Indic voice...' : t('testIndicVoice', 'Listen to Indic Voice')}</span>
              </button>
            </div>
          </div>

          <div className="card border-rose rounded-4 p-4 shadow-sm bg-white" style={{ borderLeft: '6px solid #D4A5A5' }}>
            <h3 className="fw-bold text-rose mb-3">
              <i className="bi bi-shield-lock-fill me-2"></i> Change Password
            </h3>

            {passwordMsg && (
              <div className="alert alert-success rounded-3 p-3 mb-3 fs-6">
                <i className="bi bi-check-circle-fill me-2"></i>{passwordMsg}
              </div>
            )}
            {passwordErr && (
              <div className="alert alert-danger rounded-3 p-3 mb-3 fs-6">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>{passwordErr}
              </div>
            )}

            <form onSubmit={handleChangePassword}>
              <div className="mb-3 position-relative">
                <label className="form-label fw-bold fs-6">Current Password</label>
                <div className="input-group">
                  <input 
                    type={showCurrentPassword ? "text" : "password"} 
                    className="form-control form-control-lg fs-6 rounded-start-3 border-rose"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                  <button 
                    type="button" 
                    className="btn btn-outline-secondary rounded-end-3 border-rose"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    title={showCurrentPassword ? "Hide Password" : "Show Password"}
                  >
                    <i className={`bi ${showCurrentPassword ? 'bi-eye-slash-fill' : 'bi-eye-fill'}`}></i>
                  </button>
                </div>
              </div>

              <div className="mb-3 position-relative">
                <label className="form-label fw-bold fs-6">New Password</label>
                <div className="input-group">
                  <input 
                    type={showNewPassword ? "text" : "password"} 
                    className="form-control form-control-lg fs-6 rounded-start-3 border-rose"
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <button 
                    type="button" 
                    className="btn btn-outline-secondary rounded-end-3 border-rose"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    title={showNewPassword ? "Hide Password" : "Show Password"}
                  >
                    <i className={`bi ${showNewPassword ? 'bi-eye-slash-fill' : 'bi-eye-fill'}`}></i>
                  </button>
                </div>
              </div>

              <div className="mb-4 position-relative">
                <label className="form-label fw-bold fs-6">Confirm New Password</label>
                <div className="input-group">
                  <input 
                    type={showConfirmPassword ? "text" : "password"} 
                    className="form-control form-control-lg fs-6 rounded-start-3 border-rose"
                    placeholder="Re-type new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button 
                    type="button" 
                    className="btn btn-outline-secondary rounded-end-3 border-rose"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    title={showConfirmPassword ? "Hide Password" : "Show Password"}
                  >
                    <i className={`bi ${showConfirmPassword ? 'bi-eye-slash-fill' : 'bi-eye-fill'}`}></i>
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={passwordLoading} 
                className="btn patient-btn-secondary w-100 py-3 fw-bold fs-5 rounded-3"
              >
                {passwordLoading ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;
