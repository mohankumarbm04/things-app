import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
});

// ── Request interceptor ───────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    // Sanitize request data — strip script tags from string values
    if (config.data && typeof config.data === 'object') {
      config.data = sanitizeObject(config.data);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor ──────────────────────────────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token));
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      if (error.response.data?.code === 'TOKEN_EXPIRED') {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then(token => {
            original.headers['Authorization'] = `Bearer ${token}`;
            return api(original);
          });
        }

        original._retry = true;
        isRefreshing = true;

        try {
          const rt = sessionStorage.getItem('_rt');
          if (!rt) throw new Error('No refresh token');
          const res = await api.post('/auth/refresh', { refreshToken: rt });
          const { accessToken, refreshToken: newRt } = res.data;
          sessionStorage.setItem('_rt', newRt);
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
          original.headers['Authorization'] = `Bearer ${accessToken}`;
          processQueue(null, accessToken);
          return api(original);
        } catch (err) {
          processQueue(err, null);
          sessionStorage.removeItem('_rt');
          delete api.defaults.headers.common['Authorization'];
          window.location.href = '/login';
          return Promise.reject(err);
        } finally {
          isRefreshing = false;
        }
      }
    }

    // Generic error handling
    const message = error.response?.data?.message || error.message || 'Something went wrong';
    if (error.response?.status === 429) {
      toast.error('Too many requests. Please slow down.');
    } else if (error.response?.status >= 500) {
      toast.error('Server error. Please try again.');
    }

    return Promise.reject(error);
  }
);

// ── Sanitize inputs ───────────────────────────────────────────
const sanitizeString = (str) =>
  typeof str === 'string'
    ? str.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
         .replace(/javascript:/gi, '')
         .replace(/on\w+\s*=/gi, '')
    : str;

const sanitizeObject = (obj) => {
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, sanitizeObject(v)])
    );
  }
  return sanitizeString(obj);
};

// ── API helpers ───────────────────────────────────────────────
export const habitsApi = {
  getAll:   (params) => api.get('/habits', { params }),
  getOne:   (id) => api.get(`/habits/${id}`),
  create:   (data) => api.post('/habits', data),
  update:   (id, data) => api.patch(`/habits/${id}`, data),
  delete:   (id) => api.delete(`/habits/${id}`),
  complete: (id, data) => api.post(`/habits/${id}/complete`, data),
  undo:     (id, data) => api.delete(`/habits/${id}/complete`, { data }),
  stats:    () => api.get('/habits/stats'),
};

export const moodsApi = {
  getAll: (params) => api.get('/moods', { params }),
  log:    (data) => api.post('/moods', data),
  delete: (id) => api.delete(`/moods/${id}`),
};

export const expensesApi = {
  getAll:   (params) => api.get('/expenses', { params }),
  create:   (data) => api.post('/expenses', data),
  delete:   (id) => api.delete(`/expenses/${id}`),
  summary:  (params) => api.get('/expenses/summary', { params }),
};

export const focusApi = {
  getAll: (params) => api.get('/focus', { params }),
  save:   (data) => api.post('/focus', data),
};

export const workoutsApi = {
  getAll: (params) => api.get('/workouts', { params }),
  create: (data) => api.post('/workouts', data),
};

export const insightsApi = {
  get:  () => api.get('/insights'),
  chat: (data) => api.post('/insights/chat', data),
};

export const analyticsApi = {
  overview: (params) => api.get('/analytics/overview', { params }),
};

export const notifApi = {
  subscribe:   (sub) => api.post('/notifications/subscribe', { subscription: sub }),
  unsubscribe: () => api.delete('/notifications/subscribe'),
  getVapidKey: () => api.get('/notifications/vapid-key'),
};

export default api;
