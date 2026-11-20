import apiClient from '@/lib/apiClient';
import { toCamelCase, toSnakeCase, unwrapApiData } from '@/lib/apiHelpers';
import type { ModuleKey, SAPermissionKey, SuperAdminRole } from '@/models/types';
import { endpoints } from './endpoints';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface AuthUser {
  id: number;
  name: string;
  username: string;
  role: 'superadmin' | 'admin' | 'employee' | 'customer' | 'super_admin';
  status: string;
  organizationId?: string | null;
  allowedModules?: ModuleKey[] | null;
  superAdminRole?: SuperAdminRole | null;
  saPermissions?: SAPermissionKey[] | null;
  /** App language to open in after login ('' = keep the device's choice). */
  language?: string;
  /** Operator users only. Checked when the dashboard opens. */
  subscription?: {
    state: 'active' | 'expired' | 'not_started';
    start: string | null;
    end: string | null;
    daysLeft: number | null;
  } | null;
}

function normalizeRole(role: string): AuthUser['role'] {
  if (role === 'super_admin') return 'superadmin';
  return role as AuthUser['role'];
}

function mapAuthUser(raw: Record<string, unknown>): AuthUser {
  const user = toCamelCase<Record<string, unknown>>(raw);
  const role = String(user.role ?? 'employee');
  return {
    id: Number(user.id),
    name: String(user.name ?? ''),
    username: String(user.username ?? ''),
    role: normalizeRole(role),
    status: String(user.status ?? 'active'),
    organizationId: (user.organizationId as string | null) ?? null,
    allowedModules: (user.allowedModules as ModuleKey[] | null) ?? null,
    superAdminRole: (user.superAdminRole as SuperAdminRole | null) ?? null,
    saPermissions: (user.saPermissions as SAPermissionKey[] | null) ?? null,
    subscription: (user.subscription as AuthUser['subscription']) ?? null,
    language: String(user.language ?? ''),
  };
}

/** "Who am I" answer shared for a short time: login, the subscription check and the layout all need it. */
const ME_TTL_MS = 30_000;
let meCache: { at: number; promise: Promise<AuthUser> } | null = null;

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthTokens> => {
    meCache = null;
    const response = await apiClient.post(endpoints.auth.login, toSnakeCase(credentials as unknown as Record<string, unknown>));
    const raw = unwrapApiData<Record<string, string>>(response);
    return {
      access: raw.access,
      refresh: raw.refresh,
    };
  },

  logout: async (refreshToken?: string | null): Promise<void> => {
    meCache = null;
    await apiClient.post(endpoints.auth.logout, refreshToken ? { refresh: refreshToken } : {});
  },

  refresh: async (refreshToken: string): Promise<AuthTokens> => {
    const response = await apiClient.post(endpoints.auth.refresh, { refresh: refreshToken });
    const raw = unwrapApiData<Record<string, string>>(response);
    return {
      access: raw.access,
      refresh: raw.refresh ?? refreshToken,
    };
  },

  me: (): Promise<AuthUser> => {
    if (meCache && Date.now() - meCache.at < ME_TTL_MS) return meCache.promise;
    const promise = apiClient.get(endpoints.auth.me).then((response) =>
      mapAuthUser(unwrapApiData<Record<string, unknown>>(response)),
    );
    meCache = { at: Date.now(), promise };
    promise.catch(() => { if (meCache?.promise === promise) meCache = null; });
    return promise;
  },

  /** Remember the app language this person picked (used at their next login, on any device). */
  saveLanguage: async (language: string): Promise<void> => {
    meCache = null;
    await apiClient.patch(endpoints.auth.me, { language });
  },

  /** Forget the cached answer (after logout or when the session changes). */
  clearMeCache: () => { meCache = null; },
};
