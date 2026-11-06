import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';

import { AuthProvider, useAuth } from './context/AuthContext';
import { VoiceProvider, useVoice } from './context/VoiceContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { CaregiverPatientProvider } from './context/CaregiverPatientContext';

import api from './services/api';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import VoiceAssistant from './components/VoiceAssistant';

import HelpButton from './components/HelpButton';
import ReminderNotificationModal from './components/ReminderNotificationModal';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Patient Pages
import PatientDashboard from './pages/patient/PatientDashboard';
import ActivitySelection from './pages/patient/ActivitySelection';
import PatientReminders from './pages/patient/PatientReminders';
import PatientMemoryAssistance from './pages/patient/PatientMemoryAssistance';
import PatientProgress from './pages/patient/PatientProgress';
import PatientHelp from './pages/patient/PatientHelp';

// 8 Cognitive Activities
import MemoryMatching from './activities/MemoryMatching';
import PictureRecall from './activities/PictureRecall';
import SequenceMemory from './activities/SequenceMemory';
import ObjectRecognition from './activities/ObjectRecognition';
import WordMemory from './activities/WordMemory';
import NameFaceRecognition from './activities/NameFaceRecognition';
import DailyEventSequencing from './activities/DailyEventSequencing';
import SimplePuzzles from './activities/SimplePuzzles';

import FamiliarFaces from './pages/patient/FamiliarFaces';

// Caregiver Pages
import CaregiverDashboard from './pages/caregiver/CaregiverDashboard';
import PatientDetails from './pages/caregiver/PatientDetails';
import CaregiverReminders from './pages/caregiver/CaregiverReminders';
import CaregiverAssistance from './pages/caregiver/CaregiverAssistance';
import CaregiverMemoryManagement from './pages/caregiver/CaregiverMemoryManagement';
import FamiliarFacesManager from './pages/caregiver/FamiliarFacesManager';
import AccountSettings from './pages/AccountSettings';

const RootRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return user.role === 'patient' ? <Navigate to="/patient/dashboard" replace /> : <Navigate to="/caregiver/dashboard" replace />;
};

const RouteSpeechStopper = () => {
  const location = useLocation();
  const { stopSpeaking } = useVoice();

  useEffect(() => {
    // Immediately stop any text-to-speech audio and voice recognition when user changes the page
    stopSpeaking();
  }, [location.pathname, stopSpeaking]);

  return null;
};

const BackendWarmer = () => {
  useEffect(() => {
    // Non-blocking pre-warm ping to wake up cloud backend and DB pool upon visit
    api.get('/health').catch(() => {});
  }, []);
  return null;
};

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <CaregiverPatientProvider>
            <VoiceProvider>
              <Router>
                <BackendWarmer />
                <RouteSpeechStopper />
                <div className="d-flex flex-column min-vh-100 app-container">
              <Navbar />
              <div className="flex-grow-1">
                <Routes>
                  <Route path="/" element={<RootRedirect />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />

                  {/* Patient Routes */}
                  <Route path="/patient/dashboard" element={
                    <ProtectedRoute allowedRole="patient"><PatientDashboard /></ProtectedRoute>
                  } />
                  <Route path="/patient/activities" element={
                    <ProtectedRoute allowedRole="patient"><ActivitySelection /></ProtectedRoute>
                  } />
                  <Route path="/patient/activities/matching" element={
                    <ProtectedRoute allowedRole="patient"><MemoryMatching /></ProtectedRoute>
                  } />
                  <Route path="/patient/activities/picture-recall" element={
                    <ProtectedRoute allowedRole="patient"><PictureRecall /></ProtectedRoute>
                  } />
                  <Route path="/patient/activities/sequence" element={
                    <ProtectedRoute allowedRole="patient"><SequenceMemory /></ProtectedRoute>
                  } />
                  <Route path="/patient/activities/object-recognition" element={
                    <ProtectedRoute allowedRole="patient"><ObjectRecognition /></ProtectedRoute>
                  } />
                  <Route path="/patient/activities/word-memory" element={
                    <ProtectedRoute allowedRole="patient"><WordMemory /></ProtectedRoute>
                  } />
                  <Route path="/patient/activities/name-face" element={
                    <ProtectedRoute allowedRole="patient"><NameFaceRecognition /></ProtectedRoute>
                  } />
                  <Route path="/patient/activities/event-sequence" element={
                    <ProtectedRoute allowedRole="patient"><DailyEventSequencing /></ProtectedRoute>
                  } />
                  <Route path="/patient/activities/puzzles" element={
                    <ProtectedRoute allowedRole="patient"><SimplePuzzles /></ProtectedRoute>
                  } />
                  <Route path="/patient/reminders" element={
                    <ProtectedRoute allowedRole="patient"><PatientReminders /></ProtectedRoute>
                  } />
                  <Route path="/patient/memory" element={
                    <ProtectedRoute allowedRole="patient"><PatientMemoryAssistance /></ProtectedRoute>
                  } />
                  <Route path="/patient/progress" element={
                    <ProtectedRoute allowedRole="patient"><PatientProgress /></ProtectedRoute>
                  } />
                  <Route path="/patient/familiar-faces" element={
                    <ProtectedRoute allowedRole="patient"><FamiliarFaces /></ProtectedRoute>
                  } />
                  <Route path="/patient/help" element={
                    <ProtectedRoute allowedRole="patient"><PatientHelp /></ProtectedRoute>
                  } />
                  <Route path="/patient/account" element={
                    <ProtectedRoute allowedRole="patient"><AccountSettings /></ProtectedRoute>
                  } />

                  {/* Caregiver Routes */}
                  <Route path="/caregiver/dashboard" element={
                    <ProtectedRoute allowedRole="caregiver"><CaregiverDashboard /></ProtectedRoute>
                  } />
                  <Route path="/caregiver/familiar-faces" element={
                    <ProtectedRoute allowedRole="caregiver"><FamiliarFacesManager /></ProtectedRoute>
                  } />
                  <Route path="/caregiver/patient/:id" element={
                    <ProtectedRoute allowedRole="caregiver"><PatientDetails /></ProtectedRoute>
                  } />
                  <Route path="/caregiver/reminders" element={
                    <ProtectedRoute allowedRole="caregiver"><CaregiverReminders /></ProtectedRoute>
                  } />
                  <Route path="/caregiver/assistance" element={
                    <ProtectedRoute allowedRole="caregiver"><CaregiverAssistance /></ProtectedRoute>
                  } />
                  <Route path="/caregiver/memory" element={
                    <ProtectedRoute allowedRole="caregiver"><CaregiverMemoryManagement /></ProtectedRoute>
                  } />
                  <Route path="/caregiver/account" element={
                    <ProtectedRoute allowedRole="caregiver"><AccountSettings /></ProtectedRoute>
                  } />

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
              <ReminderNotificationModal />
              <HelpButton isFixed={true} />
              <VoiceAssistant />
              <Footer />
            </div>
          </Router>
        </VoiceProvider>
        </CaregiverPatientProvider>
      </AuthProvider>
    </LanguageProvider>
  </ThemeProvider>
  );
}

export default App;
