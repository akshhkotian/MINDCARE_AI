import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useVoice } from '../context/VoiceContext';
import { useLanguage } from '../context/LanguageContext';
import { assistanceAPI } from '../services/api';

const HelpButton = ({ className = "", isFixed = false, onHelpSent }) => {
  const { user } = useAuth();
  const { speakInstruction } = useVoice();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errMessage, setErrMessage] = useState('');

  const handleHelpClick = async () => {
    if (!user || user.role !== 'patient') return;
    setLoading(true);
    setErrMessage('');
    try {
      await assistanceAPI.requestHelp({
        patient_id: user.id,
        message: 'Patient requested immediate assistance via I Need Help button.'
      });
      setSent(true);
      speakInstruction(t('emergencySent', "Emergency request sent. Your caregiver has been notified."));
      if (onHelpSent) onHelpSent();
      setTimeout(() => setSent(false), 8000);
    } catch (err) {
      setErrMessage('Unable to send request right now. Please notify your caregiver.');
      setTimeout(() => setErrMessage(''), 6000);
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'patient') return null;

  const containerClass = isFixed 
    ? 'fixed-help-widget' 
    : `help-button-container ${className}`;

  return (
    <div className={containerClass}>
      <button 
        onClick={handleHelpClick} 
        disabled={loading} 
        className="help-emergency-btn d-inline-flex align-items-center gap-2 shadow-lg"
        aria-label={t('iNeedHelp', "I Need Help")}
      >
        <i className={`bi ${sent ? 'bi-check-circle-fill' : 'bi-bell-fill'} fs-3`}></i>
        <span className="fw-bold fs-5">{sent ? t('notifiedCaregiver', "Notified Caregiver!") : t('iNeedHelp', "I Need Help")}</span>
      </button>

      {sent && (
        <div className="mt-2 text-success fw-bold fs-6 bg-white p-2 rounded-3 border border-success shadow-md text-center">
          <i className="bi bi-check-circle-fill me-1"></i> {t('caregiverNotifiedMsg', "Caregiver notified!")}
        </div>
      )}

      {errMessage && (
        <div className="mt-2 text-danger fw-bold fs-6 bg-white p-2 rounded-3 border border-danger shadow-md text-center">
          <i className="bi bi-exclamation-circle-fill me-1"></i> {errMessage}
        </div>
      )}
    </div>
  );
};

export default HelpButton;
