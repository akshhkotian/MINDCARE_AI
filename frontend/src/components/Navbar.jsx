import React, { useState, useEffect } from 'react';
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

  const [isNavOpen, setIsNavOpen] = useState(false);

  // Auto-close mobile navigation menu when route changes
  useEffect(() => {
    setIsNavOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    setIsNavOpen(false);
    logout();
    navigate('/login');
  };

  const toggleNav = () => {
    setIsNavOpen(prev => !prev);
  };

  const closeNav = () => {
    setIsNavOpen(false);
  };

  const isPatient = user?.role === 'patient';
  const isCaregiver = user?.role === 'caregiver';

  const getNavLinkClass = (path) => {
    const isActive = location.pathname === path;
    return `bubble-nav-link nav-option ${isActive ? 'active-bubble-link active' : ''}`;
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-bubble-wrapper sticky-top">
      <div className="container-fluid px-2 px-sm-3 px-md-4">
        {/* Brand "MindCareAi" - Top Left */}
        <Link 
          className="navbar-brand-bubble d-flex align-items-center gap-2 text-decoration-none" 
          to="/"
          onClick={closeNav}
        >
          <i className="bi bi-heart-pulse-fill fs-4 text-rose"></i>
          <span className="brand-text fs-4 fw-extrabold">{t('brand', 'MindCareAi')}</span>
        </Link>

        {/* Mobile Header Controls: Language, Theme & Hamburger Toggler (visible on screens < 992px) */}
        <div className="d-flex align-items-center gap-2 d-lg-none">
          <LanguageSelector />

          <button
            onClick={toggleTheme}
            className="btn theme-toggle-icon-btn p-1 rounded-circle border-0 d-flex align-items-center justify-content-center"
            title={theme === 'dark' ? t('lightMode', "Switch to Light Mode") : t('darkMode', "Switch to Dark Mode")}
            aria-label="Toggle Light/Dark Theme"
          >
            <i className={`bi ${theme === 'dark' ? 'bi-sun-fill text-warning fs-5' : 'bi-moon-stars-fill text-dark fs-5'}`}></i>
          </button>

          <button
            className="btn bubble-mobile-toggler border-0 p-2 d-flex align-items-center justify-content-center"
            type="button"
            onClick={toggleNav}
            aria-expanded={isNavOpen}
            aria-label="Toggle navigation"
          >
            <i className={`bi ${isNavOpen ? 'bi-x-lg text-danger' : 'bi-list text-primary'} fs-3`}></i>
          </button>
        </div>

        {/* Collapsible Content: Inlined on desktop, expands smoothly in mobile drawer */}
        <div className={`collapse navbar-collapse ${isNavOpen ? 'show mobile-nav-drawer' : ''}`} id="navbarContent">
          {user ? (
            <div className="d-flex flex-column flex-lg-row align-items-stretch align-items-lg-center justify-content-between w-100 gap-2 mt-3 mt-lg-0">
              {/* Navigation Links */}
              <ul className="navbar-nav d-flex flex-column flex-lg-row align-items-stretch align-items-lg-center gap-1 gap-xl-2 mb-0 ms-lg-2">
                {isPatient && (
                  <>
                    <li className="nav-item">
                      <Link className={getNavLinkClass('/patient/dashboard')} to="/patient/dashboard" onClick={closeNav}>
                        <i className="bi bi-house-door me-2 d-lg-none"></i>
                        {t('home', 'Home')}
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link className={getNavLinkClass('/patient/activities')} to="/patient/activities" onClick={closeNav}>
                        <i className="bi bi-controller me-2 d-lg-none"></i>
                        {t('activities', 'Activities')}
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link className={getNavLinkClass('/patient/familiar-faces')} to="/patient/familiar-faces" onClick={closeNav}>
                        <i className="bi bi-people me-2 d-lg-none"></i>
                        {t('familiarFaces', 'Familiar Faces')}
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link className={getNavLinkClass('/patient/memory')} to="/patient/memory" onClick={closeNav}>
                        <i className="bi bi-journal-bookmark me-2 d-lg-none"></i>
                        {t('memoryCare', 'Memory Care')}
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link className={getNavLinkClass('/patient/reminders')} to="/patient/reminders" onClick={closeNav}>
                        <i className="bi bi-alarm me-2 d-lg-none"></i>
                        {t('reminders', 'Reminders & Medicines')}
                      </Link>
                    </li>
                  </>
                )}

                {isCaregiver && (
                  <>
                    <li className="nav-item">
                      <Link className={getNavLinkClass('/caregiver/dashboard')} to="/caregiver/dashboard" onClick={closeNav}>
                        <i className="bi bi-people-fill me-2 d-lg-none"></i>
                        {t('patients', 'Patients')}
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link className={getNavLinkClass('/caregiver/familiar-faces')} to="/caregiver/familiar-faces" onClick={closeNav}>
                        <i className="bi bi-person-bounding-box me-2 d-lg-none"></i>
                        {t('familiarPeople', 'Familiar People')}
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link className={getNavLinkClass('/caregiver/memory')} to="/caregiver/memory" onClick={closeNav}>
                        <i className="bi bi-journal-text me-2 d-lg-none"></i>
                        {t('memoryCare', 'Memory Care')}
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link className={getNavLinkClass('/caregiver/reminders')} to="/caregiver/reminders" onClick={closeNav}>
                        <i className="bi bi-clock-history me-2 d-lg-none"></i>
                        {t('reminders', 'Reminders & Medicines')}
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link className={getNavLinkClass('/caregiver/assistance')} to="/caregiver/assistance" onClick={closeNav}>
                        <i className="bi bi-bell-fill me-2 d-lg-none"></i>
                        {t('helpRequests', 'Help Requests')}
                      </Link>
                    </li>
                  </>
                )}
              </ul>

              {/* User Account & Actions */}
              <div className="d-flex flex-column flex-lg-row align-items-stretch align-items-lg-center gap-2 pt-2 pt-lg-0 border-top border-lg-0 border-rose mt-2 mt-lg-0">
                <Link 
                  to={isPatient ? "/patient/account" : "/caregiver/account"} 
                  className="badge badge-bubble-rose px-3 py-2 fs-6 text-decoration-none cursor-pointer d-flex align-items-center justify-content-center gap-2" 
                  title="Manage Account"
                  onClick={closeNav}
                >
                  <i className="bi bi-person-circle fs-5"></i> 
                  <span>{user.name}</span>
                </Link>

                <button 
                  onClick={handleLogout} 
                  className="btn bubble-btn-secondary btn-sm px-3 py-2 fs-6 d-flex align-items-center justify-content-center gap-2"
                >
                  <i className="bi bi-box-arrow-right"></i> {t('logout', 'Logout')}
                </button>

                {/* Desktop-only Language & Theme buttons */}
                <div className="d-none d-lg-flex align-items-center gap-2 ms-xl-2">
                  <LanguageSelector />
                  <button
                    onClick={toggleTheme}
                    className="btn theme-toggle-icon-btn p-2 rounded-circle border-0 d-flex align-items-center justify-content-center"
                    title={theme === 'dark' ? t('lightMode', "Switch to Light Mode") : t('darkMode', "Switch to Dark Mode")}
                    aria-label="Toggle Light/Dark Theme"
                  >
                    <i className={`bi ${theme === 'dark' ? 'bi-sun-fill text-warning fs-4' : 'bi-moon-stars-fill text-dark fs-4'}`}></i>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="d-flex flex-column flex-lg-row align-items-stretch align-items-lg-center gap-2 ms-auto mt-3 mt-lg-0">
              <Link to="/login" className="btn bubble-btn-secondary px-4 py-2 fw-bold fs-6 text-center" onClick={closeNav}>
                {t('login', 'Login')}
              </Link>
              <Link to="/register" className="btn bubble-btn-primary px-4 py-2 fw-bold fs-6 text-center" onClick={closeNav}>
                {t('register', 'Register')}
              </Link>

              {/* Desktop-only Language & Theme buttons for guests */}
              <div className="d-none d-lg-flex align-items-center gap-2 ms-xl-2">
                <LanguageSelector />
                <button
                  onClick={toggleTheme}
                  className="btn theme-toggle-icon-btn p-2 rounded-circle border-0 d-flex align-items-center justify-content-center"
                  title={theme === 'dark' ? t('lightMode', "Switch to Light Mode") : t('darkMode', "Switch to Dark Mode")}
                  aria-label="Toggle Light/Dark Theme"
                >
                  <i className={`bi ${theme === 'dark' ? 'bi-sun-fill text-warning fs-4' : 'bi-moon-stars-fill text-dark fs-4'}`}></i>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
