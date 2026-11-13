import React from 'react';
import { useLanguage, SUPPORTED_LANGUAGES } from '../context/LanguageContext';

const LanguageSelector = ({ variant = 'navbar', className = '' }) => {
  const { language, changeLanguage, currentLanguage, t } = useLanguage();

  if (variant === 'select') {
    // Form select dropdown (useful in settings / forms)
    return (
      <div className={`language-select-wrapper notranslate ${className}`} translate="no">
        <select
          className="form-select form-select-lg fs-5 rounded-3 border-rose notranslate"
          value={language}
          onChange={(e) => changeLanguage(e.target.value)}
          aria-label={t('selectLanguage', 'Select Language')}
          translate="no"
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code} className="notranslate" translate="no">
              {lang.flag} {lang.nativeName} {lang.code !== 'en' ? `(${lang.name})` : ''}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Bootstrap Dropdown Menu for Navbar / Header
  return (
    <div className={`dropdown notranslate ${className}`} translate="no">
      <button
        className="btn bubble-nav-link d-inline-flex align-items-center gap-2 px-3 py-2 rounded-3 border-0 notranslate"
        type="button"
        id="languageDropdown"
        data-bs-toggle="dropdown"
        aria-expanded="false"
        title={t('selectLanguage', 'Select Language')}
        translate="no"
      >
        <i className="bi bi-translate fs-5 text-rose"></i>
        <span className="d-none d-sm-inline fw-bold fs-6 notranslate" translate="no">
          {currentLanguage?.flag} {currentLanguage?.nativeName || 'English'}
        </span>
        <span className="d-inline d-sm-none fw-bold fs-6 notranslate" translate="no">
          {currentLanguage?.flag}
        </span>
        <i className="bi bi-chevron-down fs-7 text-secondary"></i>
      </button>

      <ul 
        className="dropdown-menu dropdown-menu-end shadow-lg border-rose rounded-4 py-2 mt-2 notranslate" 
        aria-labelledby="languageDropdown"
        style={{ minWidth: '220px', zIndex: 1060 }}
        translate="no"
      >
        <li className="px-3 py-1 text-muted fs-7 fw-bold border-bottom mb-1 text-uppercase notranslate" translate="no">
          {t('selectLanguage', 'Select Language')}
        </li>
        {SUPPORTED_LANGUAGES.map((lang) => {
          const isSelected = lang.code === language;
          return (
            <li key={lang.code}>
              <button
                type="button"
                className={`dropdown-item d-flex align-items-center justify-content-between px-3 py-2 fs-6 fw-bold notranslate ${
                  isSelected ? 'active bg-primary text-white rounded-2' : ''
                }`}
                onClick={() => changeLanguage(lang.code)}
                translate="no"
              >
                <span className="d-flex align-items-center gap-2 notranslate" translate="no">
                  <span className="fs-5">{lang.flag}</span>
                  <span>{lang.nativeName}</span>
                  {lang.code !== 'en' && (
                    <small className={isSelected ? 'text-light' : 'text-muted'}>
                      ({lang.name})
                    </small>
                  )}
                </span>
                {isSelected && <i className="bi bi-check-lg ms-2"></i>}
              </button>
            </li>
          );
        })}
        <li className="border-top mt-1 pt-1 px-3 py-1 text-center notranslate" translate="no">
          <small className="text-secondary fw-bold fs-7 d-flex align-items-center justify-content-center gap-1 notranslate" translate="no">
            <i className="bi bi-soundwave text-rose"></i> 🇮🇳 Indic Voice Active
          </small>
        </li>
      </ul>
    </div>
  );
};

export default LanguageSelector;

