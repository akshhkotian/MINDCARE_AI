import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('patient');
  const [errMessage, setErrMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrMessage('');
    setLoading(true);

    try {
      sessionStorage.removeItem('mindcare_greeted_login');
      const loggedUser = await login(email, password, role);
      if (loggedUser.role === 'caregiver') {
        navigate('/caregiver/dashboard');
      } else {
        navigate('/patient/dashboard');
      }
    } catch (err) {
      setErrMessage(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoPatient = () => {
    setEmail('patient@mindcare.ai');
    setPassword('password123');
    setRole('patient');
  };

  const fillDemoCaregiver = () => {
    setEmail('caregiver@mindcare.ai');
    setPassword('password123');
    setRole('caregiver');
  };

  return (
    <div className="login-page-bg py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-8 col-lg-5">
            <div className="card login-glass-card rounded-4">
              <div className="card-body p-4 p-md-5">
              <div className="text-center mb-4">
                <div className="login-brand-icon">
                  <i className="bi bi-heart-pulse-fill fs-2"></i>
                </div>
                <h2 className="fw-bold text-rose mb-1">{t('welcomeTitle', 'Welcome')}</h2>
              </div>

              {errMessage && (
                <div className="alert alert-danger rounded-3 fs-6 mb-4" role="alert">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  {errMessage}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label fw-bold fs-5">{t('accountType', 'Account Type')}</label>
                  <div className="d-flex gap-3">
                    <button
                      type="button"
                      className={`btn flex-fill py-3 fs-5 fw-bold rounded-3 ${role === 'patient' ? 'patient-btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => setRole('patient')}
                    >
                      <i className="bi bi-person-fill me-1"></i> {t('patient', 'Patient')}
                    </button>
                    <button
                      type="button"
                      className={`btn flex-fill py-3 fs-5 fw-bold rounded-3 ${role === 'caregiver' ? 'patient-btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => setRole('caregiver')}
                    >
                      <i className="bi bi-person-heart me-1"></i> {t('caregiver', 'Caregiver')}
                    </button>
                  </div>
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

                <div className="mb-4">
                  <label className="form-label fw-bold fs-5">{t('password', 'Password')}</label>
                  <div className="input-group">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="form-control form-control-lg fs-5 rounded-start-3 border-rose"
                      placeholder="Enter password"
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

                <button
                  type="submit"
                  disabled={loading}
                  className="btn patient-btn-primary btn-lg w-100 py-3 fw-bold fs-4 rounded-3 shadow-sm"
                >
                  {loading ? t('signingIn', 'Signing In...') : t('signIn', 'Sign In')}
                </button>
              </form>

              <div className="mt-4 pt-3 border-top text-center">
                <p className="text-secondary mb-2 fs-6">{t('quickDemo', 'Quick Demo One-Click Login Credentials:')}</p>
                <div className="d-flex justify-content-center gap-2">
                  <button type="button" onClick={fillDemoPatient} className="btn btn-sm patient-btn-success rounded-pill fw-bold fs-6">
                    {t('demoPatient', 'Demo Patient')}
                  </button>
                  <button type="button" onClick={fillDemoCaregiver} className="btn btn-sm patient-btn-primary rounded-pill fw-bold fs-6">
                    {t('demoCaregiver', 'Demo Caregiver')}
                  </button>
                </div>
              </div>

              <div className="mt-4 text-center fs-5">
                {t('dontHaveAccount', "Don't have an account?")} <Link to="/register" className="fw-bold text-rose">{t('registerHere', 'Register Here')}</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};

export default Login;
