import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useVoice } from '../context/VoiceContext';
import { remindersAPI, caregiverRequestsAPI } from '../services/api';

// Robust helper to parse any 12h/24h time string into total minutes from midnight
// Handles: "9:00 PM", "9:00pm", "9 PM", "9pm", "09:00 PM", "21:00", "9:00", "09:00:00", "9.00 PM"
export const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return null;
  const str = String(timeStr).trim().toUpperCase();

  // 1) 12-hour format with AM/PM (e.g. "9:00 PM", "9:00pm", "9 PM", "9pm", "09:00 AM")
  const ampmMatch = str.match(/^(\d{1,2})(?:[:\.\s-](\d{1,2}))?(?:[:\.\s-](\d{1,2}))?\s*(AM|PM)$/);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10) % 12;
    const minutes = ampmMatch[2] ? parseInt(ampmMatch[2], 10) : 0;
    if (ampmMatch[4] === 'PM') hours += 12;
    return hours * 60 + minutes;
  }

  // 2) 24-hour format: "21:00", "09:00", "9:00", "21:00:00"
  const match24 = str.match(/^(\d{1,2})[:\.\s-](\d{1,2})(?:[:\.\s-](\d{1,2}))?$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return hours * 60 + minutes;
    }
  }

  // 3) Standalone single hour number like "21"
  const singleHour = str.match(/^(\d{1,2})$/);
  if (singleHour) {
    const hours = parseInt(singleHour[1], 10);
    if (hours >= 0 && hours < 24) return hours * 60;
  }

  return null;
};

const ReminderNotificationModal = () => {
  const { user } = useAuth();
  const { speakInstruction } = useVoice();
  const navigate = useNavigate();

  const [activeNotification, setActiveNotification] = useState(null);
  const activeNotificationRef = useRef(null);

  const [reminders, setReminders] = useState([]);
  const remindersRef = useRef([]);

  // Track triggered events so we don't spam in the same minute: "remId_YYYY-MM-DD_minutes"
  const triggeredEventsRef = useRef(new Set());
  // Track snoozed reminders: remId -> timestampMs
  const snoozedRemindersRef = useRef({});

  // Play audio chime when alarm triggers
  const playAlarmSound = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Pleasant 2-burst alarm chime: [C5, E5, G5, C6] twice
      const notes = [523.25, 659.25, 783.99, 1046.50, 523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const start = ctx.currentTime + idx * 0.16;
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.01, start);
        gain.gain.exponentialRampToValueAtTime(0.3, start + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.16);
      });
    } catch (err) {
      console.warn("Alarm chime could not play automatically:", err);
    }
  };

  const triggerAlarm = (rem) => {
    setActiveNotification(rem);
    activeNotificationRef.current = rem;

    playAlarmSound();

    const timeMsg = rem.reminder_time ? `at ${rem.reminder_time}` : 'now';
    const msg = `Attention! It is ${timeMsg}, time for ${rem.title}. ${rem.description || ''}`;
    speakInstruction(msg);
  };

  // Fetch reminders list from backend API (works for both patient and caregiver)
  const fetchRemindersList = async () => {
    if (!user) return;
    try {
      let targetPatientId = user.id;
      if (user.role === 'caregiver') {
        // If caregiver, monitor reminders for the primary managed patient
        try {
          const accRes = await caregiverRequestsAPI.getAcceptedPatients(user.id);
          const list = accRes.data || [];
          if (list.length > 0) {
            targetPatientId = list[0].patient_id || list[0].id || 2;
          } else {
            targetPatientId = 2; // Default demo patient
          }
        } catch {
          targetPatientId = 2;
        }
      }

      const res = await remindersAPI.getByPatientId(targetPatientId);
      const list = res.data || [];
      setReminders(list);
      remindersRef.current = list;
    } catch (err) {
      console.error("Error fetching reminders for alarm monitor:", err);
    }
  };

  // Check laptop device timer every 1 second against reminders
  const checkSystemTimer = () => {
    if (!user) return;
    // If a modal is already active on screen, don't overlap with another
    if (activeNotificationRef.current) return;

    // Read current laptop device clock
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const laptopTotalMinutes = currentHours * 60 + currentMinutes;
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const currentList = remindersRef.current;
    if (!currentList || currentList.length === 0) return;

    for (const rem of currentList) {
      if (rem.status === 'Completed') continue;

      // Check if snoozed
      const snoozedUntil = snoozedRemindersRef.current[rem.id];
      if (snoozedUntil) {
        if (Date.now() >= snoozedUntil) {
          delete snoozedRemindersRef.current[rem.id];
          triggerAlarm(rem);
          break;
        }
        continue;
      }

      const remMinutes = parseTimeToMinutes(rem.reminder_time);
      if (remMinutes === null) continue;

      // Check date: if reminder_date is set and repeat_option is 'None', it should match today's date
      if (rem.reminder_date && rem.repeat_option === 'None') {
        const remDateStr = String(rem.reminder_date).split('T')[0].split(' ')[0].trim();
        if (remDateStr !== todayStr) continue;
      }

      // Exact match with laptop's clock:
      // When laptop's local time reaches remMinutes (e.g. 9:00 PM -> 1260 min)
      // Check both current minute and within 60s of arrival
      const isDueNow = (laptopTotalMinutes === remMinutes) || (laptopTotalMinutes === remMinutes + 1);

      const eventKey = `${rem.id}_${todayStr}_${remMinutes}`;

      if (isDueNow && !triggeredEventsRef.current.has(eventKey)) {
        triggeredEventsRef.current.add(eventKey);
        triggerAlarm(rem);
        break;
      }
    }
  };

  // Set up data polling, 1-second laptop clock ticker, and test alarm listener
  useEffect(() => {
    if (user) {
      fetchRemindersList();

      // Poll API periodically (every 20 seconds) to catch newly added caregiver reminders
      const apiInterval = setInterval(fetchRemindersList, 20000);

      // Check laptop clock every 1 second (1000ms) for real-time alarm trigger
      const clockInterval = setInterval(checkSystemTimer, 1000);

      // Also re-check when window regains focus or visibility
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          fetchRemindersList();
          checkSystemTimer();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleVisibilityChange);

      return () => {
        clearInterval(apiInterval);
        clearInterval(clockInterval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleVisibilityChange);
      };
    } else {
      setActiveNotification(null);
      activeNotificationRef.current = null;
    }
  }, [user]);

  if (!activeNotification || !user) {
    return null;
  }


  const handleMarkDone = async () => {
    if (!activeNotification) return;
    const remToComplete = activeNotification;

    // 1. Immediately dismiss modal so user is never stuck
    setActiveNotification(null);
    activeNotificationRef.current = null;

    // 2. Mark completed in memory so timer never re-triggers it
    const updated = remindersRef.current.map(r => r.id === remToComplete.id ? { ...r, status: 'Completed' } : r);
    setReminders(updated);
    remindersRef.current = updated;

    // 3. Audio confirmation
    speakInstruction(`Great job! Marked ${remToComplete.title} as completed.`);

    // 4. Asynchronously persist to server
    try {
      await remindersAPI.update(remToComplete.id, { status: 'Completed' });
    } catch (err) {
      console.warn("Could not sync completed status to server:", err);
    }
  };

  const handleStartActivity = async () => {
    if (!activeNotification) return;
    const remToComplete = activeNotification;

    // 1. Immediately dismiss modal
    setActiveNotification(null);
    activeNotificationRef.current = null;

    // 2. Mark completed in memory
    const updated = remindersRef.current.map(r => r.id === remToComplete.id ? { ...r, status: 'Completed' } : r);
    setReminders(updated);
    remindersRef.current = updated;

    // 3. Audio confirmation
    speakInstruction(`Starting activities for ${remToComplete.title}.`);

    // 4. Navigate appropriately depending on user role
    if (user?.role === 'caregiver') {
      navigate('/caregiver/dashboard');
    } else {
      navigate('/patient/activities');
    }

    // 5. Asynchronously persist to server
    try {
      await remindersAPI.update(remToComplete.id, { status: 'Completed' });
    } catch (err) {
      console.warn("Could not sync completed status to server:", err);
    }
  };

  const handleDismiss = () => {
    if (!activeNotification) return;
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const remMinutes = parseTimeToMinutes(activeNotification.reminder_time) || (currentHours * 60 + currentMinutes);
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const eventKey = `${activeNotification.id}_${todayStr}_${remMinutes}`;
    triggeredEventsRef.current.add(eventKey);

    setActiveNotification(null);
    activeNotificationRef.current = null;
  };

  const handleSnooze = () => {
    if (!activeNotification) return;
    // Snooze for 5 minutes
    snoozedRemindersRef.current[activeNotification.id] = Date.now() + 5 * 60 * 1000;
    speakInstruction("Reminder snoozed for 5 minutes.");
    setActiveNotification(null);
    activeNotificationRef.current = null;
  };

  const titleStr = (activeNotification && activeNotification.title) ? String(activeNotification.title).toLowerCase() : '';
  const isCognitive = titleStr.includes('cognitive') ||
                      titleStr.includes('activity') ||
                      titleStr.includes('game') ||
                      titleStr.includes('memory');

  const isHydration = titleStr.includes('hydration') ||
                      titleStr.includes('water');

  return (
    <div 
      className="modal fade show d-block" 
      tabIndex="-1" 
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', zIndex: 1060 }}
      id="reminder-notification-modal"
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content border-0 rounded-4 shadow-lg overflow-hidden" style={{ background: '#FFFDF9' }}>
          {/* Top Header Strip */}
          <div 
            className="p-4 text-white d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3" 
            style={{ 
              background: isHydration 
                ? 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)' 
                : isCognitive 
                ? 'linear-gradient(135deg, #4B3F3F 0%, #2D2525 100%)'
                : 'linear-gradient(135deg, #D97706 0%, #B45309 100%)' 
            }}
          >
            <div className="d-flex align-items-center gap-3 flex-grow-1">
              <div className="bg-white bg-opacity-25 rounded-circle p-3 d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '56px', height: '56px' }}>
                <i className={`bi ${isHydration ? 'bi-droplet-fill' : isCognitive ? 'bi-controller' : 'bi-bell-fill'} fs-1 text-white`}></i>
              </div>
              <div>
                <span className="badge bg-white text-dark fw-bold text-uppercase px-3 py-1 rounded-pill mb-1">
                  {user?.role === 'caregiver' ? 'Caregiver Alert • Patient Reminder' : 'Daily Reminder Alert'}
                </span>
                <h3 className="modal-title fw-extrabold mb-0 fs-2 text-white">
                  Time for {activeNotification.title || 'Your Reminder'}!
                </h3>
              </div>
            </div>
            
            {/* Alarm Time Badge & Close Button */}
            <div className="d-flex align-items-center gap-2 flex-shrink-0 align-self-start align-self-md-center">
              <span 
                className="badge bg-white shadow fs-4 px-3 py-2 rounded-pill font-monospace fw-bold d-inline-flex align-items-center gap-2 border border-2 border-white"
                style={{ color: '#1e293b', backgroundColor: '#ffffff' }}
              >
                <span>⏰</span>
                <span>{activeNotification.reminder_time || 'Now'}</span>
              </span>
              <button
                type="button"
                className="btn btn-sm btn-light rounded-circle p-1 d-flex align-items-center justify-content-center shadow-sm"
                style={{ width: '38px', height: '38px' }}
                onClick={handleDismiss}
                title="Dismiss Alarm"
                aria-label="Dismiss Alarm"
              >
                <i className="bi bi-x-lg text-dark fs-5"></i>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="modal-body p-4 p-md-5">
            <div className="card border-0 rounded-4 p-4 mb-4" style={{ backgroundColor: '#F8F4F0' }}>
              <div className="d-flex align-items-start gap-3">
                <i className="bi bi-quote fs-1 text-rose opacity-50"></i>
                <div className="w-100">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h4 className="fw-bold text-dark mb-0">Instructions:</h4>
                    <span className="badge bg-rose text-white fs-6 px-3 py-1 rounded-pill font-monospace fw-bold">
                      ⏰ {activeNotification.reminder_time || 'Now'}
                    </span>
                  </div>
                  <p className="fs-4 text-secondary mb-0 leading-relaxed">
                    {activeNotification.description || "It's time for your scheduled daily activity!"}
                  </p>
                </div>
              </div>
            </div>

            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 text-muted fs-5 px-2 pt-2 border-top">
              <div className="d-flex align-items-center">
                <i className="bi bi-alarm-fill me-2 text-warning fs-4"></i>
                <strong>Alarm Time:</strong>
                <span className="badge bg-warning-subtle text-dark border border-warning fs-5 ms-2 px-3 py-1 rounded-pill font-monospace fw-bold">
                  ⏰ {activeNotification.reminder_time || 'Now'}
                </span>
              </div>
              <div>
                <i className="bi bi-repeat me-2 text-rose"></i>
                <strong>Repeat Schedule:</strong> {activeNotification.repeat_option || 'Daily'}
              </div>
              <div>
                <i className="bi bi-calendar-event me-2 text-rose"></i>
                <strong>Date:</strong> {activeNotification.reminder_date || 'Today'}
              </div>
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="modal-footer border-top-0 p-4 bg-light d-flex flex-column flex-sm-row justify-content-end gap-3">
            <button
              id="reminder-snooze-btn"
              type="button"
              onClick={handleSnooze}
              className="btn btn-outline-secondary btn-lg fw-bold px-4 py-3 rounded-3 w-100 w-sm-auto"
            >
              <i className="bi bi-clock-history me-2"></i> Remind Later
            </button>

            {isCognitive && (
              <button
                id="reminder-start-activity-btn"
                type="button"
                onClick={handleStartActivity}
                className="btn btn-primary btn-lg fw-bold px-4 py-3 rounded-3 w-100 w-sm-auto shadow-sm"
              >
                <i className="bi bi-play-circle-fill me-2"></i> Start Cognitive Games Now
              </button>
            )}

            <button
              id="reminder-complete-btn"
              type="button"
              onClick={handleMarkDone}
              className="btn btn-success btn-lg fw-bold px-4 py-3 rounded-3 w-100 w-sm-auto shadow-sm"
            >
              <i className="bi bi-check-circle-fill me-2"></i> Mark as Completed
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReminderNotificationModal;
