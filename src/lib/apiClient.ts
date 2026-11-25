/**
 * Axios HTTP client for the LCO Desk Django API.
 *
 * Dev:  VITE_USE_MOCK_API=false and VITE_API_BASE_URL=/api  (Vite proxies /api to Django on :8000)
 * Prod: VITE_API_BASE_URL=https://<your-api-domain>/api
 */

import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { env } from './env';
import { GPS_HELP } from './geo';
import { tr } from './lt';
import i18n from '@/i18n';
import { reportError } from './errorReporter';
import { SUBSCRIPTION_EVENT, SUBSCRIPTION_MSG_KEY, isGateMounted, subscriptionMessage } from './subscription';

export const apiClient = axios.create({
  baseURL: env.API_BASE_URL,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

type StoredAuth = {
  state?: { token?: string; refreshToken?: string; role?: string };
  token?: string; refreshToken?: string; role?: string;
};

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
  const a = readAuth();
  // Also by the page: two calls can fail together, and the second one finds the session already cleared.
  const wasCustomer = (a?.state?.role ?? a?.role) === 'customer' || window.location.pathname.startsWith('/customer');
  localStorage.removeItem('auth-storage');
  localStorage.removeItem('customer_auth');
  localStorage.removeItem('current_org_id');
  const loginPage = wasCustomer ? '/customer/login' : '/login';  // customers have their own login page
  if (window.location.pathname !== loginPage) {
    window.location.replace(loginPage);
  }
}

/**
 * Modules the Django backend does not have yet. GET requests return an empty list instead of
 * hitting the network (so screens stay usable); writes fail with a clear message.
 * Remove an entry here when its backend endpoint is built.
 */
const NOT_BUILT_YET = [
  '/superadmin/users', '/inventory', '/activities', '/invoices', '/pos', '/documents', '/subscriptions',
  '/settings', '/audit-log', '/sms/send', '/customer/dashboard',
];

function isNotBuiltYet(url?: string): boolean {
  if (!url) return false;
  const path = url.replace(/^https?:\/\/[^/]+/, '').replace(/^\/api/, '').split('?')[0];
  return NOT_BUILT_YET.some((prefix) => path === prefix || path.startsWith(prefix + '/'));
}

/** Attach the access token. The organization comes from the token on the server — never from the client. */
/** Logged in as a customer (customer app). */
function isCustomerSession(): boolean {
  const a = readAuth();
  return (a?.state?.role ?? a?.role) === 'customer';
}

apiClient.interceptors.request.use((config) => {
  // A customer token only works on /customer/*. Never send it to a staff URL: the server answers 401
  // and that would log the customer out (this is what happened when changing the language).
  if (isCustomerSession() && !/^\/?(customer\/|auth\/login|signup-requests)/.test(config.url ?? '')) {
    config.adapter = async () => {
      throw new axios.AxiosError('Not available in the customer app.', 'ERR_CUSTOMER_SCOPE', config);
    };
    return config;
  }
  const token = getAccessToken();
  // The public sign-up form is sent without login; an old expired token would only get it rejected.
  const publicSignup = (config.method ?? 'get').toLowerCase() === 'post' && /\/signup-requests\/?$/.test(config.url ?? '');
  if (token && !publicSignup) {
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
    // Customers have their own refresh endpoint; the staff one refuses customer tokens (and vice versa).
    const a = readAuth();
    const isCustomer = (a?.state?.role ?? a?.role) === 'customer';
    const url = `${env.API_BASE_URL}/${isCustomer ? 'customer/auth' : 'auth'}/refresh`;
    const res = await axios.post(url, { refresh }, { timeout: 15_000 });
    const access = res.data?.access as string | undefined;
    if (!access) return null;
    saveTokens(access, res.data?.refresh);
    return access;
  } catch {
    return null;
  }
}

/**
 * Subscription ended/not started: let the dashboard show its "subscription ended" screen.
 * On a fresh page load the dashboard may still be loading, so wait up to ~3 s for it.
 * Anywhere else (or if it never appears): log out and show the message on the login page.
 */
function notifySubscriptionInactive(code: string, message: string, attempt = 0) {
  if (isGateMounted()) {
    window.dispatchEvent(new CustomEvent(SUBSCRIPTION_EVENT, { detail: { code, message } }));
    return;
  }
  if (attempt < 10 && window.location.pathname.startsWith('/admin')) {
    window.setTimeout(() => notifySubscriptionInactive(code, message, attempt + 1), 300);
    return;
  }
  sessionStorage.setItem(SUBSCRIPTION_MSG_KEY, message);
  clearAuthAndGoToLogin();
}

/** Server sentences we have translations for (public/locales): shown in the user's language. */
function translated(message: string): string | null {
  return i18n.exists(message, { nsSeparator: false, keySeparator: false }) ? tr(message) : null;
}

/**
 * Turn Django error bodies into one readable sentence, so screens can show `error.message`.
 * The server answers in English; known sentences are translated here (English text = key).
 */
function readableMessage(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const body = data as Record<string, unknown>;
  if (typeof body.detail === 'string') return tr(body.detail);
  for (const [field, value] of Object.entries(body)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (typeof first === 'string') {
      // A missing or bad GPS point: same help text as the app shows when location is off.
      if (field === 'latitude' || field === 'longitude') return tr(GPS_HELP);
      if (field === 'non_field_errors' || field === 'detail') return tr(first);
      return translated(first) ?? `${field.replace(/_/g, ' ')}: ${first}`;
    }
  }
  return null;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const body = error.response?.data as { code?: string; detail?: string } | undefined;
      const friendly = readableMessage(body);
      if (friendly) error.message = friendly;

      if (status === 403 && body?.code?.startsWith('subscription_')) {
        const sub = body as { subscription_start?: string; subscription_end?: string };
        const state = body.code === 'subscription_not_started' ? 'not_started' : 'expired';
        notifySubscriptionInactive(body.code, subscriptionMessage(state, sub.subscription_start, sub.subscription_end));
        return Promise.reject(error);
      }
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

/**
 * Identical GET requests that are already running share one network call
 * (e.g. two parts of a screen asking for /contacts at the same moment).
 * Requests with an abort signal are left alone.
 */
const inflightGets = new Map<string, Promise<unknown>>();
/** A finished answer is reused for 2 seconds (menu + screen opening together ask for the same thing). */
const RECENT_MS = 2000;
const recentGets = new Map<string, { at: number; response: unknown }>();
const rawGet = apiClient.get.bind(apiClient);
apiClient.get = ((url: string, config?: Parameters<typeof rawGet>[1]) => {
  if (config?.signal) return rawGet(url, config);
  const key = `${url}?${JSON.stringify(config?.params ?? {})}`;
  const recent = recentGets.get(key);
  if (recent && Date.now() - recent.at < RECENT_MS) return Promise.resolve(recent.response);
  const running = inflightGets.get(key);
  if (running) return running;
  const request = rawGet(url, config)
    .then((response) => {
      recentGets.set(key, { at: Date.now(), response });
      return response;
    })
    .finally(() => inflightGets.delete(key));
  inflightGets.set(key, request);
  return request;
}) as typeof apiClient.get;

/** Any change (save, delete...) or a new login makes stored answers out of date. */
apiClient.interceptors.request.use((config) => {
  if ((config.method ?? 'get').toLowerCase() !== 'get') recentGets.clear();
  return config;
});

/**
 * Saves (POST / PUT / PATCH / DELETE) still on their way. The app never updates itself to a new
 * version while one is running, so a payment or a save is never cut off by a reload.
 */
let writesInFlight = 0;
export const pendingWrites = () => writesInFlight;
const isWrite = (m?: string) => (m ?? 'get').toLowerCase() !== 'get';
apiClient.interceptors.request.use((config) => {
  if (isWrite(config.method)) {
    writesInFlight += 1;
    (config as InternalAxiosRequestConfig & { _counted?: boolean })._counted = true;
  }
  return config;
});
const doneWrite = (config?: InternalAxiosRequestConfig & { _counted?: boolean }) => {
  if (config?._counted) {
    config._counted = false;
    writesInFlight = Math.max(0, writesInFlight - 1);
  }
};
apiClient.interceptors.response.use(
  (response) => { doneWrite(response.config); return response; },
  (error: AxiosError) => { doneWrite(error.config ?? undefined); return Promise.reject(error); },
);

export default apiClient;
