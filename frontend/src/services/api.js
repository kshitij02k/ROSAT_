import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor - add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
  logout: () => api.post('/auth/logout')
};

// Patient API
export const patientAPI = {
  joinQueue: (data) => api.post('/patient/join-queue', data),
  getQueueStatus: () => api.get('/patient/queue-status'),
  getHistory: () => api.get('/patient/history'),
  leaveQueue: () => api.post('/patient/leave-queue'),
  getAvailableDoctors: () => api.get('/patient/available-doctors')
};

// Doctor API
export const doctorAPI = {
  getProfile: () => api.get('/doctor/profile'),
  getQueue: () => api.get('/doctor/queue'),
  getCurrentPatient: () => api.get('/doctor/current-patient'),
  startConsultation: (data) => api.post('/doctor/start-consultation', data),
  endConsultation: (data) => api.post('/doctor/end-consultation', data),
  getHistory: () => api.get('/doctor/history'),
  updateAvailability: (data) => api.put('/doctor/availability', data)
};

// Admin API
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getQueueMonitor: () => api.get('/admin/queue-monitor'),
  getDoctors: () => api.get('/admin/doctors'),
  updateDoctor: (id, data) => api.put(`/admin/doctors/${id}`, data),
  getAnalytics: () => api.get('/admin/analytics'),
  runSimulation: (data) => api.post('/admin/simulate', data)
};

export default api;
