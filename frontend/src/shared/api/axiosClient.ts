import axios from 'axios';

// Single API client for FastAPI backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

console.log('API_BASE_URL:', API_BASE_URL); // Debug log to see what URL is being used

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('Authentication failed - redirecting to login');
      window.location.href = '/auth?mode=login';
    } else if (error.response?.status === 403) {
      console.error('Access forbidden - insufficient permissions');
    }
    return Promise.reject(error);
  }
);

export const authClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

authClient.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);
