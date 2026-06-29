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
  };
}

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthTokens> => {
    const response = await apiClient.post(endpoints.auth.login, toSnakeCase(credentials as unknown as Record<string, unknown>));
    const raw = unwrapApiData<Record<string, string>>(response);
    return {
      access: raw.access,
      refresh: raw.refresh,
    };
  },

  logout: async (): Promise<void> => {
    await apiClient.post(endpoints.auth.logout);
  },

  refresh: async (refreshToken: string): Promise<AuthTokens> => {
    const response = await apiClient.post(endpoints.auth.refresh, { refresh: refreshToken });
    const raw = unwrapApiData<Record<string, string>>(response);
    return {
      access: raw.access,
      refresh: raw.refresh ?? refreshToken,
    };
  },

  me: async (): Promise<AuthUser> => {
    const response = await apiClient.get(endpoints.auth.me);
    const raw = unwrapApiData<Record<string, unknown>>(response);
    return mapAuthUser(raw);
  },
};
