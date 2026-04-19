import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bounty_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('bounty_token');
      localStorage.removeItem('bounty_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  googleSignIn: (token: string) => api.post('/auth/google', { token }),
  logout: () => api.post('/auth/logout'),
};

export const usersApi = {
  getMe: () => api.get('/users/me'),
  updateMe: (data: { email?: string }) => api.put('/users/me', data),
};

export const walletApi = {
  getWallet: () => api.get('/wallet'),
  generateWallet: () => api.post('/wallet/generate'),
};

export const bountiesApi = {
  list: (params?: { status?: string; page?: number }) => api.get('/bounties', { params }),
  get: (id: string) => api.get(`/bounties/${id}`),
  create: (data: object) => api.post('/bounties', data),
  update: (id: string, data: object) => api.put(`/bounties/${id}`, data),
  fund: (id: string) => api.post(`/bounties/${id}/fund`),
};
