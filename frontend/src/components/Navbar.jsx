import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from './LanguageSelector';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isPatient = user?.role === 'patient';
  const isCaregiver = user?.role === 'caregiver';

  const getNavLinkClass = (path) => {
    const isActive = location.pathname === path;
    return `bubble-nav-link nav-option ${isActive ? 'active-bubble-link active' : ''}`;
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-bubble-wrapper sticky-top">
      <div className="container-fluid px-3 px-md-4">
        <div className="navbar-bubble-container d-flex align-items-center justify-content-between w-100 flex-nowrap">

          {/* Brand "MindCareAi" - Top Left Corner */}
          <div className="d-flex align-items-center gap-2 gap-lg-3 flex-grow-1 flex-nowrap overflow-hidden">
            <Link className="navbar-brand-bubble d-flex align-items-center gap-2 text-decoration-none flex-shrink-0" to="/">
              <i className="bi bi-heart-pulse-fill fs-4 text-rose"></i>
              <span className="brand-text fs-4 fw-extrabold">{t('brand', 'MindCareAi')}</span>
            </Link>

            {/* Nav Items Group directly touching/adjacent to Brand in ONE single line */}
            <div className="collapse navbar-collapse flex-nowrap" id="navbarContent">
              {user ? (
                <div className="d-flex flex-row align-items-center justify-content-between w-100 gap-2 flex-nowrap">
                  <ul className="navbar-nav d-flex flex-row flex-nowrap align-items-center gap-1 gap-xl-2 mb-0 ms-lg-2 overflow-x-auto no-scrollbar py-1">
                    {isPatient && (
                      <>
                        <li className="nav-item flex-shrink-0">
                          <Link className={getNavLinkClass('/patient/dashboard')} to="/patient/dashboard">
                            {t('home', 'Home')}
                          </Link>
                        </li>
                        <li className="nav-item flex-shrink-0">
                          <Link className={getNavLinkClass('/patient/activities')} to="/patient/activities">
                            {t('activities', 'Activities')}
                          </Link>
                        </li>
                        <li className="nav-item flex-shrink-0">
                          <Link className={getNavLinkClass('/patient/familiar-faces')} to="/patient/familiar-faces">
                            {t('familiarFaces', 'Familiar Faces')}
                          </Link>
                        </li>
                        <li className="nav-item flex-shrink-0">
                          <Link className={getNavLinkClass('/patient/memory')} to="/patient/memory">
                            {t('memoryCare', 'Memory Care')}
                          </Link>
                        </li>
                        <li className="nav-item flex-shrink-0">
                          <Link className={getNavLinkClass('/patient/reminders')} to="/patient/reminders">
                            {t('reminders', 'Reminders & Medicines')}
                          </Link>
                        </li>
                      </>
                    )}

                    {isCaregiver && (
                      <>
                        <li className="nav-item flex-shrink-0">
                          <Link className={getNavLinkClass('/caregiver/dashboard')} to="/caregiver/dashboard">
                            {t('patients', 'Patients')}
                          </Link>
                        </li>
                        <li className="nav-item flex-shrink-0">
                          <Link className={getNavLinkClass('/caregiver/familiar-faces')} to="/caregiver/familiar-faces">
                            {t('familiarPeople', 'Familiar People')}
                          </Link>
                        </li>
                        <li className="nav-item flex-shrink-0">
                          <Link className={getNavLinkClass('/caregiver/memory')} to="/caregiver/memory">
                            {t('memoryCare', 'Memory Care')}
                          </Link>
                        </li>
                        <li className="nav-item flex-shrink-0">
                          <Link className={getNavLinkClass('/caregiver/reminders')} to="/caregiver/reminders">
                            {t('reminders', 'Reminders & Medicines')}
                          </Link>
                        </li>
                        <li className="nav-item flex-shrink-0">
                          <Link className={getNavLinkClass('/caregiver/assistance')} to="/caregiver/assistance">
                            {t('helpRequests', 'Help Requests')}
                          </Link>
                        </li>
                      </>
                    )}
                  </ul>

                  {/* Right Actions */}
                  <div className="d-flex align-items-center gap-2 flex-nowrap ms-auto flex-shrink-0">
                    <Link to={isPatient ? "/patient/account" : "/caregiver/account"} className="badge badge-bubble-rose px-3 py-2 fs-6 text-decoration-none cursor-pointer flex-shrink-0" title="Manage Account">
                      <i className="bi bi-person-circle me-1"></i> {user.name}
                    </Link>
                    <button onClick={handleLogout} className="btn bubble-btn-secondary btn-sm px-3 py-1 fs-6 flex-shrink-0">
                      <i className="bi bi-box-arrow-right me-1"></i> {t('logout', 'Logout')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="d-flex align-items-center gap-2 ms-auto flex-nowrap flex-shrink-0">
                  <Link to="/login" className="btn bubble-btn-secondary px-4 py-2 fw-bold fs-6 flex-shrink-0">{t('login', 'Login')}</Link>
                  <Link to="/register" className="btn bubble-btn-primary px-4 py-2 fw-bold fs-6 flex-shrink-0">{t('register', 'Register')}</Link>
                </div>
              )}
            </div>
          </div>

          {/* Language Selector, Theme Toggle & Mobile Toggler */}
          <div className="d-flex align-items-center gap-2 ms-2">
            <LanguageSelector />

            <button
              onClick={toggleTheme}
              className="btn theme-toggle-icon-btn p-2 rounded-circle border-0 d-flex align-items-center justify-content-center"
              title={theme === 'dark' ? t('lightMode', "Switch to Light Mode") : t('darkMode', "Switch to Dark Mode")}
              aria-label="Toggle Light/Dark Theme"
            >
              <i className={`bi ${theme === 'dark' ? 'bi-sun-fill text-warning fs-4' : 'bi-moon-stars-fill text-dark fs-4'}`}></i>
            </button>

            <button
              className="navbar-toggler bubble-toggler border-0 p-2"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#navbarContent"
              aria-controls="navbarContent"
              aria-expanded="false"
              aria-label="Toggle navigation"
            >
              <span className="navbar-toggler-icon"></span>
            </button>
          </div>

        </div>
      </div>
    </nav>
  );
};

export default Navbar;
