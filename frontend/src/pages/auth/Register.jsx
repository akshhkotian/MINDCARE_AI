import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('patient');
  const [age, setAge] = useState('');
  const [caregiverCode, setCaregiverCode] = useState('');
  const [errMessage, setErrMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [slowLoading, setSlowLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    let timer;
    if (loading) {
      timer = setTimeout(() => setSlowLoading(true), 3500);
    } else {
      setSlowLoading(false);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  const { register, login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const res = await register({
        name,
        email,
        password,
        role,
        age: age ? parseInt(age, 10) : null,
        caregiver_code: caregiverCode ? caregiverCode.trim().toUpperCase() : null
      });

      setSuccessMessage('Account ready! Signing you in automatically...');
      
      try {
        await login(email, password, role);
        navigate(role === 'caregiver' ? '/caregiver/dashboard' : '/patient/dashboard');
      } catch (loginErr) {
        setTimeout(() => navigate('/login'), 1500);
      }
    } catch (err) {
      setErrMessage(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-bg py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-8 col-lg-6">
            <div className="card login-glass-card rounded-4">
              <div className="card-body p-4 p-md-5">
              <div className="text-center mb-4">
                <i className="bi bi-heart-pulse-fill text-rose display-4 mb-2 d-inline-block"></i>
                <h2 className="fw-bold text-rose">{t('createAccount', 'Create an Account')}</h2>
                <p className="text-secondary fs-5">{t('joinPlatform', 'Join MindCare AI Platform')}</p>
              </div>

              {errMessage && (
                <div className={`alert ${errMessage.toLowerCase().includes('already taken') || errMessage.toLowerCase().includes('already registered') ? 'alert-warning border-warning' : 'alert-danger'} rounded-3 fs-6 mb-4 shadow-sm`} role="alert">
                  <div className="d-flex align-items-start gap-2">
                    <i className="bi bi-exclamation-triangle-fill fs-5 mt-1 flex-shrink-0"></i>
                    <div>
                      <strong>{errMessage.toLowerCase().includes('already taken') ? 'Email Already Taken:' : 'Notice:'}</strong> {errMessage}
                      {(errMessage.toLowerCase().includes('already taken') || errMessage.toLowerCase().includes('already registered')) && (
                        <div className="mt-2">
                          <Link to="/login" className="btn btn-sm btn-outline-dark fw-bold rounded-pill">
                            <i className="bi bi-box-arrow-in-right me-1"></i> {t('loginHere', 'Go to Login Page')}
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {successMessage && (
                <div className="alert alert-success rounded-3 fs-6 mb-4" role="alert">
                  <i className="bi bi-check-circle-fill me-2"></i>
                  {successMessage}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label fw-bold fs-5">{t('accountType', 'Account Type')}</label>
                  <select
                    className="form-select form-select-lg fs-5 rounded-3 border-rose"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="patient">{t('patient', 'Patient')} (Cognitive Activities & Memory Care)</option>
                    <option value="caregiver">{t('caregiver', 'Caregiver')} (Healthcare Provider / Family Guardian)</option>
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-bold fs-5">{t('fullName', 'Full Name')}</label>
                  <input
                    type="text"
                    className="form-control form-control-lg fs-5 rounded-3 border-rose"
                    placeholder="Enter full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-bold fs-5">{t('emailAddress', 'Email Address')}</label>
                  <input
                    type="email"
                    className="form-control form-control-lg fs-5 rounded-3 border-rose"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-bold fs-5">{t('password', 'Password')}</label>
                  <div className="input-group">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="form-control form-control-lg fs-5 rounded-start-3 border-rose"
                      placeholder="Minimum 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary rounded-end-3 border-rose"
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? "Hide Password" : "Show Password"}
                    >
                      <i className={`bi ${showPassword ? 'bi-eye-slash-fill' : 'bi-eye-fill'}`}></i>
                    </button>
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label fw-bold fs-5">{t('age', 'Age')}</label>
                    <input
                      type="number"
                      className="form-control form-control-lg fs-5 rounded-3 border-rose"
                      placeholder="e.g. 74"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                    />
                  </div>

                  {role === 'patient' && (
                    <div className="col-md-6">
                      <label className="form-label fw-bold fs-5">{t('caregiverIdCode', 'Caregiver ID Code')}</label>
                      <input
                        type="text"
                        className="form-control form-control-lg fs-5 rounded-3 border-rose"
                        placeholder="e.g. MC-CG-1001"
                        value={caregiverCode}
                        onChange={(e) => setCaregiverCode(e.target.value)}
                      />
                      <small className="text-secondary">{t('askCaregiverCode', 'Ask your caregiver for their ID code to connect.')}</small>
                    </div>
                  )}

                  {role === 'caregiver' && (
                    <div className="col-md-6 d-flex align-items-center">
                      <div className="p-3 bg-rose-light rounded-3 text-rose fs-6">
                        <i className="bi bi-info-circle-fill me-1"></i> {t('caregiverNotePrompt', 'A unique Caregiver ID Code (e.g. MC-CG-1001) will be generated for you to share with your patients.')}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn patient-btn-primary btn-lg w-100 py-3 fw-bold fs-4 rounded-3 shadow-sm mt-3"
                >
                  {loading ? (
                    <span>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      {slowLoading ? 'Connecting to Cloud Server...' : t('creatingAccount', 'Creating Account...')}
                    </span>
                  ) : t('register', 'Register')}
                </button>
                {slowLoading && (
                  <div className="text-secondary small mt-2 text-center">
                    <i className="bi bi-cloud-arrow-up me-1 text-primary"></i> 
                    Waking up cloud server from idle sleep... please hold on a few seconds.
                  </div>
                )}
              </form>

              <div className="mt-4 text-center fs-5">
                {t('alreadyRegistered', 'Already registered?')} <Link to="/login" className="fw-bold text-rose">{t('loginHere', 'Login Here')}</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};

export default Register;
