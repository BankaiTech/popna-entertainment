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
      // Supports both flat auth-storage and zustand-persist `{ state: { token } }` shapes
      const parsed = JSON.parse(raw) as {
        token?: string;
        accessToken?: string;
        organizationId?: string | null;
        state?: { token?: string; accessToken?: string; organizationId?: string | null };
      };
      const token =
        parsed.token ??
        parsed.accessToken ??
        parsed.state?.token ??
        parsed.state?.accessToken;
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      const orgFromAuth = parsed.organizationId ?? parsed.state?.organizationId;
      if (orgFromAuth && !localStorage.getItem('current_org_id')) {
        config.headers['X-Organization-Id'] = orgFromAuth;
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

/** Response interceptor — handle 401 (session lost). Do not redirect on CORS/network/5xx. */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;

      // CORS / offline: no response — never treat as logout
      if (!error.response) {
        return Promise.reject(error);
      }

      if (status === 401) {
        // Avoid redirect loop if already on login or login request itself failed
        const url = String(error.config?.url ?? '');
        const onLoginPage = window.location.pathname === '/login';
        if (!url.includes('/auth/login') && !onLoginPage) {
          localStorage.removeItem('auth-storage');
          localStorage.removeItem('customer_auth');
          window.location.replace('/login');
        }
        return Promise.reject(error);
      }

      if (status != null && status >= 500) {
        const serverError = new Error(
          `API ${error.config?.method?.toUpperCase()} ${error.config?.url} → ${status}: ${error.message}`
        );
        // Report only — redirecting here caused login ↔ dashboard loops when APIs failed
        void reportError(serverError, 'API server error');
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
