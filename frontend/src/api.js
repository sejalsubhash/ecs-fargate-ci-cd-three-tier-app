import axios from 'axios';

const api = axios.create({
  baseURL: '/api/auth',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const register = (data) => api.post('/register', data);
export const login    = (data) => api.post('/login', data);
export const profile  = ()     => api.get('/profile');
export const getUsers = ()     => api.get('/users');

export default api;
