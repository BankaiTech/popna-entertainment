import type { SuperAdminUser } from '@/models/types';
import apiClient from '@/lib/apiClient';
import { isMockMode, toCamelCase, toSnakeCase, unwrapApiData } from '@/lib/apiHelpers';
import { endpoints } from './endpoints';

let superadminUsersData: SuperAdminUser[] = [
  {
    id: 1,
    name: 'Super Admin',
    username: 'superadmin',
    password: 'test123',
    role: 'super_admin',
    status: 'active',
    createdAt: new Date().toISOString(),
  },
];

let nextId = 2;

function mapSuperAdminUser(raw: Record<string, unknown>): SuperAdminUser {
  const u = toCamelCase<Record<string, unknown>>(raw);
  return {
    id: Number(u.id),
    name: String(u.name ?? ''),
    username: String(u.username ?? ''),
    password: String(u.password ?? ''),
    role: (u.role as SuperAdminUser['role']) ?? 'super_admin',
    status: (u.status as SuperAdminUser['status']) ?? 'active',
    allowedPermissions: u.allowedPermissions as SuperAdminUser['allowedPermissions'],
    createdAt: String(u.createdAt ?? new Date().toISOString()),
  };
}

export const superadminUsersApi = {
  getAll: async (): Promise<SuperAdminUser[]> => {
    if (isMockMode()) {
      return [...superadminUsersData];
    }
    const response = await apiClient.get(endpoints.superadminUsers);
    const list = unwrapApiData<Record<string, unknown>[]>(response);
    return (Array.isArray(list) ? list : []).map(mapSuperAdminUser);
  },

  create: async (user: Omit<SuperAdminUser, 'id' | 'createdAt'>): Promise<SuperAdminUser> => {
    if (isMockMode()) {
      const existing = superadminUsersData.find(
        (u) => u.username.toLowerCase() === user.username.toLowerCase()
      );
      if (existing) throw new Error('Username already exists.');
      const newUser: SuperAdminUser = {
        ...user,
        id: nextId++,
        createdAt: new Date().toISOString(),
      };
      superadminUsersData.push(newUser);
      return newUser;
    }
    const response = await apiClient.post(endpoints.users, toSnakeCase(user as Record<string, unknown>));
    return mapSuperAdminUser(unwrapApiData<Record<string, unknown>>(response));
  },

  update: async (id: number, updates: Partial<Omit<SuperAdminUser, 'id' | 'createdAt'>>): Promise<SuperAdminUser> => {
    if (isMockMode()) {
      const index = superadminUsersData.findIndex((u) => u.id === id);
      if (index === -1) throw new Error('User not found');
      superadminUsersData[index] = { ...superadminUsersData[index], ...updates };
      return superadminUsersData[index];
    }
    const response = await apiClient.patch(`${endpoints.users}/${id}`, toSnakeCase(updates as Record<string, unknown>));
    return mapSuperAdminUser(unwrapApiData<Record<string, unknown>>(response));
  },
};
