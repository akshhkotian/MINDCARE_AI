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
  timeout: 60000
});

// Lightweight in-memory cache for ultra-fast tab switches and instant clicks
const responseCache = new Map();
const CACHE_TTL_MS = 25000; // 25 seconds of instant cache

export const clearApiCache = (filterPattern) => {
  if (!filterPattern) {
    responseCache.clear();
    return;
  }
  for (const key of responseCache.keys()) {
    if (key.includes(filterPattern)) {
      responseCache.delete(key);
    }
  }
};

// 1. Interceptor to return cached GET requests immediately (0ms instant response)
api.interceptors.request.use((config) => {
  const method = (config.method || 'get').toLowerCase();
  if (method === 'get' && !config.params?._fresh) {
    const key = `${config.url}_${JSON.stringify(config.params || {})}`;
    const cached = responseCache.get(key);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      config.adapter = () => Promise.resolve({
        data: JSON.parse(JSON.stringify(cached.data)),
        status: 200,
        statusText: 'OK (Cached)',
        headers: cached.headers || {},
        config,
        request: {}
      });
    }
  }
  return config;
});

// 2. Interceptor to save successful GET results & invalidate cache on mutations
api.interceptors.response.use(
  (response) => {
    const method = (response.config.method || 'get').toLowerCase();
    if (method === 'get' && !response.config.params?._fresh && response.status === 200) {
      const key = `${response.config.url}_${JSON.stringify(response.config.params || {})}`;
      responseCache.set(key, {
        data: response.data,
        headers: response.headers,
        timestamp: Date.now()
      });
    }

    // Invalidate related cache entries when mutations happen
    if (['post', 'put', 'delete', 'patch'].includes(method)) {
      const url = response.config.url || '';
      if (url.includes('/reminders')) clearApiCache('/reminders');
      if (url.includes('/familiar-people')) clearApiCache('/familiar-people');
      if (url.includes('/memory')) clearApiCache('/memory');
      if (url.includes('/caregiver-requests')) clearApiCache('/caregiver-requests');
      if (url.includes('/sessions')) {
        clearApiCache('/sessions');
        clearApiCache('/recommendations');
        clearApiCache('/performance-profile');
      }
      if (url.includes('/assistance')) clearApiCache('/assistance');
      if (url.includes('/auth')) clearApiCache();
    }

    return response;
  },
  (error) => Promise.reject(error)
);

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
