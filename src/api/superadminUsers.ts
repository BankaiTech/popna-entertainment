import type { SuperAdminUser } from '@/models/types';
import { apiGetList, apiPatch, apiPost } from '@/api/resources';
import { useMockApi } from '@/lib/http';

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

export const superadminUsersApi = {
  getAll: async (): Promise<SuperAdminUser[]> => {
    if (useMockApi()) {
      return [...superadminUsersData];
    }
    return apiGetList<SuperAdminUser>('/superadmin/users');
  },

  create: async (user: Omit<SuperAdminUser, 'id' | 'createdAt'>): Promise<SuperAdminUser> => {
    if (useMockApi()) {
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
    return apiPost<SuperAdminUser>('/superadmin/users', user);
  },

  update: async (id: number, updates: Partial<Omit<SuperAdminUser, 'id' | 'createdAt'>>): Promise<SuperAdminUser> => {
    if (useMockApi()) {
      const index = superadminUsersData.findIndex((u) => u.id === id);
      if (index === -1) throw new Error('User not found');
      superadminUsersData[index] = { ...superadminUsersData[index], ...updates };
      return superadminUsersData[index];
    }
    try {
      return await apiPatch<SuperAdminUser>(`/superadmin/users/${id}`, updates);
    } catch {
      return apiPatch<SuperAdminUser>(`/users/${id}`, updates);
    }
  },
};
