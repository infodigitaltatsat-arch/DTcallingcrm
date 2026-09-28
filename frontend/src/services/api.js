import axios from 'axios';

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

export const API_BASE_URL = (
  configuredApiUrl || (import.meta.env.DEV ? 'http://localhost:5000' : '')
)
  .replace(/\/+$/, '')
  .replace(/\/api$/i, '');

export const api = axios.create({
  baseURL: API_BASE_URL || undefined
});

api.interceptors.request.use((config) => {
  if (!API_BASE_URL) {
    return Promise.reject(new Error('VITE_API_URL must point to the deployed backend service.'));
  }

  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export function getBackendUrl(path) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return API_BASE_URL ? `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}` : path;
}
