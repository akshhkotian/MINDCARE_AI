import axios from 'axios';

const getBaseUrl = () => {
  // 1. Explicitly configured via environment variable (e.g., decoupled hosting with Vercel frontend + Render backend)
  if (import.meta.env.VITE_API_BASE_URL) {
    let url = import.meta.env.VITE_API_BASE_URL.trim();
    if (!url.endsWith('/api')) {
      url = url.replace(/\/+$/, '') + '/api';
    }
    return url;
  }

  // 2. Production build served by the backend on the same origin (e.g. Render / Railway full-stack deploy)
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    const isLocalDevServer = window.location.port === '5173' || window.location.port === '3000';
    if (!isLocalDevServer && window.location.protocol.startsWith('http')) {
      return `${window.location.origin}/api`;
    }
  }

  // 3. Local development fallback
  const hostname = (typeof window !== 'undefined' && window.location && window.location.hostname) ? window.location.hostname : 'localhost';
  return `http://${hostname}:5000/api`;
};

const API_BASE_URL = getBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000
});

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  updateProfile: (profileData) => api.put('/auth/update-profile', profileData),
  changePassword: (passwordData) => api.post('/auth/change-password', passwordData)
};

export const activitiesAPI = {
  getAll: () => api.get('/activities'),
  getById: (id) => api.get(`/activities/${id}`)
};

export const sessionsAPI = {
  create: (sessionData) => api.post('/sessions', sessionData),
  getByPatientId: (patientId) => api.get(`/sessions/patient/${patientId}`)
};

export const mlAPI = {
  predict: (metrics) => api.post('/ml/predict', metrics)
};

export const recommendationsAPI = {
  getByPatientId: (patientId) => api.get(`/recommendations/${patientId}`),
  getProfile: (patientId) => api.get(`/patients/${patientId}/performance-profile`),
  generate: (patientId) => api.post(`/recommendations/generate/${patientId}`)
};

export const remindersAPI = {
  getByPatientId: (patientId) => api.get(`/reminders/${patientId}`),
  create: (reminderData) => api.post('/reminders', reminderData),
  update: (id, updateData) => api.put(`/reminders/${id}`, updateData),
  delete: (id) => api.delete(`/reminders/${id}`),
  seedDefaults: (patientId) => api.post(`/reminders/seed-defaults/${patientId}`)
};

export const assistanceAPI = {
  requestHelp: (helpData) => api.post('/assistance', helpData),
  getByCaregiverId: (caregiverId) => api.get(`/assistance/caregiver/${caregiverId}`),
  updateStatus: (id, statusData) => api.put(`/assistance/${id}`, statusData)
};

export const memoryAPI = {
  getByPatientId: (patientId) => api.get(`/memory/${patientId}`),
  create: (memoryData) => api.post('/memory', memoryData),
  update: (id, updateData) => api.put(`/memory/${id}`, updateData),
  delete: (id) => api.delete(`/memory/${id}`)
};

export const caregiverRequestsAPI = {
  getByCaregiverId: (caregiverId) => api.get(`/caregiver-requests/caregiver/${caregiverId}`),
  getPatientStatus: (patientId) => api.get(`/caregiver-requests/patient/${patientId}`),
  respond: (requestId, action) => api.post(`/caregiver-requests/${requestId}/respond`, { action }),
  getAcceptedPatients: (caregiverId) => api.get(`/caregiver-requests/caregiver/${caregiverId}/patients`),
  connect: (patientId, caregiverCode) => api.post('/caregiver-requests/connect', { patient_id: patientId, caregiver_code: caregiverCode }),
  disconnect: (patientId) => api.post('/caregiver-requests/disconnect', { patient_id: patientId })
};

export const familiarPeopleAPI = {
  getByPatientId: (patientId) => api.get(`/familiar-people/patient/${patientId}`),
  add: (personData) => api.post('/familiar-people', personData),
  delete: (id) => api.delete(`/familiar-people/${id}`)
};

export default api;
