import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const auth = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me')
};

export const patient = {
  joinQueue: (data) => api.post('/patient/join-queue', data),
  getMyQueue: () => api.get('/patient/my-queue'),
  getHistory: () => api.get('/patient/history'),
  bookAppointment: (data) => api.post('/patient/appointment', data),
  getMyAppointments: () => api.get('/patient/appointments')
};

export const doctor = {
  getQueue: () => api.get('/doctor/queue'),
  toggleStatus: () => api.post('/doctor/toggle-status'),
  startSession: (id) => api.post(`/doctor/start-session/${id}`),
  endSession: (id) => api.post(`/doctor/end-session/${id}`),
  getCurrentPatient: () => api.get('/doctor/current-patient'),
  getDoctors: (params) => api.get('/doctor/doctors', { params })
};

export const admin = {
  getGlobalQueues: () => api.get('/admin/global-queues'),
  getAnalytics: () => api.get('/admin/analytics'),
  getAllDoctors: () => api.get('/admin/doctors'),
  getAllPatients: () => api.get('/admin/patients'),
  simulate: (data) => api.post('/admin/simulate', data)
};

export default api;
