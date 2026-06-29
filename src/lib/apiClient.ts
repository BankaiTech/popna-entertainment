/**
 * Axios HTTP client for real backend API integration.
 *
 * Usage:
 *   Set VITE_USE_MOCK_API=false and VITE_API_BASE_URL=https://api.example.com in .env
 *   Then replace mock API calls with: apiClient.get('/contacts'), apiClient.post('/invoices', data), etc.
 *
 * Currently the app uses in-memory mock APIs (env.USE_MOCK_API === true).
 * When you are ready to connect a real backend, flip the env flag and update
 * each API module to call apiClient instead of the mock functions.
 */

import axios from 'axios';
import { env } from './env';
import { reportError } from './errorReporter';

export const apiClient = axios.create({
  baseURL: env.API_BASE_URL,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/** Inject auth token from localStorage on every request */
apiClient.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem('auth-storage');
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: { token?: string }; token?: string };
      const token = parsed?.state?.token ?? parsed?.token;
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
    // Multi-tenant: attach org id if present
    const orgId = localStorage.getItem('current_org_id');
    if (orgId) {
      config.headers['X-Organization-Id'] = orgId;
    }
  } catch {
    // localStorage not available — continue without token
  }
  return config;
});

/** Response interceptor — handle 401 (redirect to login) and other errors */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;

      if (status === 401) {
        // Token expired or invalid — clear auth and go to login
        localStorage.removeItem('auth-storage');
        localStorage.removeItem('customer_auth');
        if (window.location.pathname !== '/login') {
          window.location.replace('/login');
        }
        return Promise.reject(error);
      }

      if (status && status >= 500) {
        // Server error — report to admin email
        const serverError = new Error(
          `API ${error.config?.method?.toUpperCase()} ${error.config?.url} → ${status}: ${error.message}`
        );
        reportError(serverError, 'API server error');
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
