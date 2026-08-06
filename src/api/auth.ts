/**
 * Real backend auth endpoints (Postman: Auth & Users).
 * POST /auth/login, /auth/logout, /auth/refresh, GET /auth/me
 */

import apiClient from '@/lib/apiClient';
import { toCamel, toSnake, unwrapOne } from '@/lib/http';
import type { ModuleKey, SAPermissionKey, SuperAdminRole } from '@/models/types';

export type AuthApiRole = 'superadmin' | 'super_admin' | 'admin' | 'employee' | 'customer' | 'manager';

export interface AuthUser {
  id?: number;
  username: string;
  name?: string;
  role: AuthApiRole | string;
  status?: string;
  organizationId?: string | null;
  allowedModules?: ModuleKey[] | null;
  allowedPermissions?: SAPermissionKey[] | null;
  superAdminRole?: SuperAdminRole | null;
  customerId?: number | null;
  mobile?: string | null;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  user: AuthUser;
}

function normalizeLoginPayload(raw: unknown): LoginResponse {
  const data = unwrapOne<Record<string, unknown>>(raw);
  const nestedUser = (data.user ?? data.profile ?? data) as Record<string, unknown>;
  const user = toCamel<AuthUser>(nestedUser);

  const accessToken = String(
    data.accessToken ??
      data.access ??
      data.token ??
      (data as { access_token?: string }).access_token ??
      ''
  );
  const refreshToken = (data.refreshToken ?? data.refresh ?? (data as { refresh_token?: string }).refresh_token) as
    | string
    | undefined;

  if (!accessToken) {
    throw new Error('Login succeeded but no access token was returned');
  }

  // Normalize role aliases from backend
  const roleRaw = String(user.role ?? 'employee').toLowerCase();
  let role: AuthApiRole = 'employee';
  if (roleRaw === 'super_admin' || roleRaw === 'superadmin') role = 'superadmin';
  else if (roleRaw === 'manager') role = 'superadmin';
  else if (roleRaw === 'admin' || roleRaw === 'employee' || roleRaw === 'customer') {
    role = roleRaw as AuthApiRole;
  }

  return {
    accessToken,
    refreshToken: refreshToken ? String(refreshToken) : undefined,
    user: {
      ...user,
      role,
      organizationId: (user.organizationId ?? (nestedUser.organization_id as string | undefined) ?? null) as
        | string
        | null,
    },
  };
}

export const authApi = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const { data } = await apiClient.post('/auth/login', { username, password });
    return normalizeLoginPayload(data);
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Best-effort — still clear local session
    }
  },

  refresh: async (refreshToken: string): Promise<{ accessToken: string; refreshToken?: string }> => {
    const { data } = await apiClient.post('/auth/refresh', toSnake({ refresh: refreshToken }));
    const parsed = unwrapOne<Record<string, unknown>>(data);
    const accessToken = String(parsed.accessToken ?? parsed.access ?? parsed.token ?? '');
    const nextRefresh = (parsed.refreshToken ?? parsed.refresh) as string | undefined;
    if (!accessToken) throw new Error('Token refresh failed');
    return { accessToken, refreshToken: nextRefresh ? String(nextRefresh) : undefined };
  },

  me: async (): Promise<AuthUser> => {
    const { data } = await apiClient.get('/auth/me');
    const user = unwrapOne<AuthUser>(data);
    return toCamel<AuthUser>(user);
  },
};
