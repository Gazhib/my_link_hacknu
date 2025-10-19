import axios from 'axios';

// Single API client for FastAPI backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

console.log('API_BASE_URL:', API_BASE_URL); // Debug log to see what URL is being used

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable sending cookies
});

// Handle responses and errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, redirect to login
      console.error('Authentication failed - redirecting to login');
      window.location.href = '/auth?mode=login';
    } else if (error.response?.status === 403) {
      // Forbidden - user doesn't have the right permissions
      console.error('Access forbidden - insufficient permissions');
    }
    return Promise.reject(error);
  }
);

// Auth client uses same backend but without /api/v1 prefix for auth endpoints
export const authClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable sending cookies
});

authClient.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);
