import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { caregiverRequestsAPI } from '../services/api';

const CaregiverPatientContext = createContext(null);

const STORAGE_KEY = 'mindcare_caregiver_selected_patient_id';

export const CaregiverPatientProvider = ({ children }) => {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientIdState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? parseInt(saved, 10) : null;
    } catch {
      return null;
    }
  });
  const [loadingPatients, setLoadingPatients] = useState(false);

  const fetchAcceptedPatients = useCallback(async () => {
    if (!user || user.role !== 'caregiver') {
      setPatients([]);
      return;
    }

    setLoadingPatients(true);
    try {
      const res = await caregiverRequestsAPI.getAcceptedPatients(user.id);
      const list = res.data || [];
      setPatients(list);

      // Restore previously chosen patient from localStorage across refreshes
      let savedId = null;
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) savedId = parseInt(saved, 10);
      } catch {}

      if (savedId && list.some(p => p.id === savedId)) {
        setSelectedPatientIdState(savedId);
      } else if (list.length > 0) {
        // If no prior selection or saved patient not in list, default to first patient
        const defaultId = list[0].id;
        setSelectedPatientIdState(defaultId);
        try {
          localStorage.setItem(STORAGE_KEY, String(defaultId));
        } catch {}
      } else {
        setSelectedPatientIdState(null);
      }
    } catch (err) {
      console.error("CaregiverPatientContext: Error fetching accepted patients:", err);
    } finally {
      setLoadingPatients(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAcceptedPatients();
  }, [fetchAcceptedPatients]);

  const setSelectedPatientId = useCallback((id) => {
    const numId = id ? parseInt(id, 10) : null;
    setSelectedPatientIdState(numId);
    try {
      if (numId) {
        localStorage.setItem(STORAGE_KEY, String(numId));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
  }, []);

  const selectedPatient = patients.find(p => p.id === selectedPatientId) || null;

  return (
    <CaregiverPatientContext.Provider value={{
      patients,
      selectedPatientId,
      selectedPatient,
      setSelectedPatientId,
      refreshPatients: fetchAcceptedPatients,
      loadingPatients
    }}>
      {children}
    </CaregiverPatientContext.Provider>
  );
};

export const useCaregiverPatient = () => {
  const context = useContext(CaregiverPatientContext);
  if (!context) {
    throw new Error('useCaregiverPatient must be used within a CaregiverPatientProvider');
  }
  return context;
};

