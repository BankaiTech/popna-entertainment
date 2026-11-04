/**
 * Axios HTTP client for the LCO Desk Django API.
 *
 * Dev:  VITE_USE_MOCK_API=false and VITE_API_BASE_URL=/api  (Vite proxies /api to Django on :8000)
 * Prod: VITE_API_BASE_URL=https://<your-api-domain>/api
 */

import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { env } from './env';
import { reportError } from './errorReporter';

export const apiClient = axios.create({
  baseURL: env.API_BASE_URL,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

type StoredAuth = { state?: { token?: string; refreshToken?: string }; token?: string; refreshToken?: string };

function readAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem('auth-storage');
    return raw ? (JSON.parse(raw) as StoredAuth) : null;
  } catch {
    return null;
  }
}

function getAccessToken(): string | undefined {
  const a = readAuth();
  return a?.state?.token ?? a?.token;
}

function getRefreshToken(): string | undefined {
  const a = readAuth();
  return a?.state?.refreshToken ?? a?.refreshToken;
}

function saveTokens(access: string, refresh?: string) {
  const a = readAuth() ?? {};
  const next = { ...a, token: access, ...(refresh ? { refreshToken: refresh } : {}) };
  localStorage.setItem('auth-storage', JSON.stringify(next));
}

function clearAuthAndGoToLogin() {
  localStorage.removeItem('auth-storage');
  localStorage.removeItem('customer_auth');
  localStorage.removeItem('current_org_id');
  if (window.location.pathname !== '/login') {
    window.location.replace('/login');
  }
}

/**
 * Modules the Django backend does not have yet. GET requests return an empty list instead of
 * hitting the network (so screens stay usable); writes fail with a clear message.
 * Remove an entry here when its backend endpoint is built.
 */
const NOT_BUILT_YET = [
  '/superadmin/users', '/inventory', '/activities', '/invoices', '/pos', '/documents', '/subscriptions',
  '/settings', '/audit-log', '/sms/send', '/signup-requests', '/customer/dashboard',
];

function isNotBuiltYet(url?: string): boolean {
  if (!url) return false;
  const path = url.replace(/^https?:\/\/[^/]+/, '').replace(/^\/api/, '').split('?')[0];
  return NOT_BUILT_YET.some((prefix) => path === prefix || path.startsWith(prefix + '/'));
}

/** Attach the access token. The organization comes from the token on the server — never from the client. */
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  if (!env.USE_MOCK_API && isNotBuiltYet(config.url)) {
    const method = (config.method ?? 'get').toLowerCase();
    config.adapter = async () => {
      if (method === 'get') {
        return { data: [], status: 200, statusText: 'OK', headers: {}, config };
      }
      throw new axios.AxiosError('This feature is not available yet.', 'ERR_NOT_BUILT', config);
    };
  }
  return config;
});

// One refresh at a time; other 401s wait for it.
let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;
  try {
    const res = await axios.post(`${env.API_BASE_URL}/auth/refresh`, { refresh }, { timeout: 15_000 });
    const access = res.data?.access as string | undefined;
    if (!access) return null;
    saveTokens(access, res.data?.refresh);
    return access;
  } catch {
    return null;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
      const url = original?.url ?? '';

      if (status === 401 && original && !original._retried && !url.includes('/auth/')) {
        original._retried = true;
        refreshing = refreshing ?? refreshAccessToken().finally(() => { refreshing = null; });
        const newToken = await refreshing;
        if (newToken) {
          original.headers['Authorization'] = `Bearer ${newToken}`;
          return apiClient(original);
        }
        clearAuthAndGoToLogin();
        return Promise.reject(error);
      }

      if (status === 401 && !url.includes('/auth/login')) {
        clearAuthAndGoToLogin();
        return Promise.reject(error);
      }

      if (status && status >= 500) {
        const serverError = new Error(
          `API ${original?.method?.toUpperCase()} ${url} → ${status}: ${error.message}`
        );
        reportError(serverError, 'API server error');
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
