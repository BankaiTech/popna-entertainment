import type { User } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import apiClient from '@/lib/apiClient';
import { isMockMode, toCamelCase, toSnakeCase, unwrapApiData } from '@/lib/apiHelpers';
import { mockUsers } from './mockData';
import { endpoints } from './endpoints';

let usersData: User[] = [...mockUsers];

function mapUser(raw: Record<string, unknown>): User {
  const u = toCamelCase<Record<string, unknown>>(raw);
  return {
    id: Number(u.id),
    organizationId: String(u.organizationId ?? MOCK_ORGANIZATION_ID),
    name: String(u.name ?? ''),
    username: String(u.username ?? ''),
    password: String(u.password ?? ''),
    role: (u.role === 'super_admin' ? 'admin' : u.role) as User['role'],
    status: (u.status as User['status']) ?? 'active',
    allowedModules: u.allowedModules as User['allowedModules'],
    branchId: u.branchId != null ? Number(u.branchId) : undefined,
    createdAt: String(u.createdAt ?? new Date().toISOString()),
  };
}

export const usersApi = {
  getAll: async (): Promise<User[]> => {
    if (isMockMode()) {
      return [...usersData];
    }
    const response = await apiClient.get(endpoints.users);
    const list = unwrapApiData<Record<string, unknown>[]>(response);
    return (Array.isArray(list) ? list : []).map(mapUser);
  },

  getById: async (id: number): Promise<User> => {
    if (isMockMode()) {
      const user = usersData.find((u) => u.id === id);
      if (!user) throw new Error('User not found');
      return user;
    }
    const response = await apiClient.get(`${endpoints.users}/${id}`);
    return mapUser(unwrapApiData<Record<string, unknown>>(response));
  },

  create: async (user: Omit<User, 'id' | 'createdAt'>): Promise<User> => {
    if (isMockMode()) {
      const existing = usersData.find((u) => u.username.toLowerCase() === user.username.toLowerCase());
      if (existing) {
        throw new Error('Username already exists. Please choose a different username.');
      }
      const newUser: User = {
        ...user,
        organizationId: user.organizationId ?? MOCK_ORGANIZATION_ID,
        status: user.status ?? 'active',
        id: Math.max(...usersData.map((u) => u.id), 0) + 1,
        createdAt: new Date().toISOString(),
      };
      usersData.push(newUser);
      return newUser;
    }
    const response = await apiClient.post(endpoints.users, toSnakeCase(user as Record<string, unknown>));
    return mapUser(unwrapApiData<Record<string, unknown>>(response));
  },

  update: async (id: number, updates: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User> => {
    if (isMockMode()) {
      const index = usersData.findIndex((u) => u.id === id);
      if (index === -1) throw new Error('User not found');
      usersData[index] = { ...usersData[index], ...updates };
      return usersData[index];
    }
    const response = await apiClient.patch(`${endpoints.users}/${id}`, toSnakeCase(updates as Record<string, unknown>));
    return mapUser(unwrapApiData<Record<string, unknown>>(response));
  },

  delete: async (id: number): Promise<void> => {
    if (isMockMode()) {
      const index = usersData.findIndex((u) => u.id === id);
      if (index === -1) throw new Error('User not found');
      usersData.splice(index, 1);
      return;
    }
    await apiClient.delete(`${endpoints.users}/${id}`);
  },
};
