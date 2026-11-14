import type { SuperAdminUser } from '@/models/types';
import apiClient from '@/lib/apiClient';
import { isMockMode, toCamelCase, unwrapApiData } from '@/lib/apiHelpers';
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
    password: '',
    role: u.role === 'manager' ? 'manager' : 'super_admin',
    status: u.status === 'inactive' || u.isActive === false ? 'inactive' : 'active',
    allowedPermissions: u.allowedPermissions as SuperAdminUser['allowedPermissions'],
    createdAt: String(u.createdAt ?? new Date().toISOString()),
  };
}

export const superadminUsersApi = {
  getAll: async (): Promise<SuperAdminUser[]> => {
    if (isMockMode()) {
      return [...superadminUsersData];
    }
    // LCO Desk server: platform admins are ordinary users with role platform_admin (full access).
    const response = await apiClient.get(endpoints.users);
    const data = unwrapApiData<Record<string, unknown>[] | { results: Record<string, unknown>[] }>(response);
    const list = Array.isArray(data) ? data : data?.results ?? [];
    return list.filter((u) => u.role === 'platform_admin').map(mapSuperAdminUser);
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
    const response = await apiClient.post(endpoints.users, {
      username: user.username, name: user.name, password: user.password,
      role: 'platform_admin', is_active: user.status !== 'inactive',
    });
    return mapSuperAdminUser(unwrapApiData<Record<string, unknown>>(response));
  },

  update: async (id: number, updates: Partial<Omit<SuperAdminUser, 'id' | 'createdAt'>>): Promise<SuperAdminUser> => {
    if (isMockMode()) {
      const index = superadminUsersData.findIndex((u) => u.id === id);
      if (index === -1) throw new Error('User not found');
      superadminUsersData[index] = { ...superadminUsersData[index], ...updates };
      return superadminUsersData[index];
    }
    const body: Record<string, unknown> = {};
    if (updates.name !== undefined) body.name = updates.name;
    if (updates.username !== undefined) body.username = updates.username;
    if (updates.password) body.password = updates.password;
    if (updates.status !== undefined) body.is_active = updates.status === 'active';
    const response = await apiClient.patch(`${endpoints.users}/${id}`, body);
    return mapSuperAdminUser(unwrapApiData<Record<string, unknown>>(response));
  },
};
