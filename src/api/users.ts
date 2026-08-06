import type { User } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import { apiDelete, apiGetList, apiGetOne, apiPatch, apiPost } from '@/api/resources';
import { useMockApi } from '@/lib/http';
import { mockUsers } from './mockData';

/**
 * Users API (Admin/Employee management).
 * Mock when useMockApi(); otherwise GET/POST/PATCH/DELETE /users.
 */

let usersData: User[] = [...mockUsers];

export const usersApi = {
  getAll: async (): Promise<User[]> => {
    if (useMockApi()) {
      return Promise.resolve([...usersData]);
    }
    return apiGetList<User>('/users');
  },

  getById: async (id: number): Promise<User> => {
    if (useMockApi()) {
      const user = usersData.find((u) => u.id === id);
      if (!user) throw new Error('User not found');
      return Promise.resolve(user);
    }
    return apiGetOne<User>(`/users/${id}`);
  },

  create: async (user: Omit<User, 'id' | 'createdAt'>): Promise<User> => {
    if (useMockApi()) {
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
      return Promise.resolve(newUser);
    }
    return apiPost<User>('/users', user);
  },

  update: async (id: number, updates: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User> => {
    if (useMockApi()) {
      const index = usersData.findIndex((u) => u.id === id);
      if (index === -1) {
        throw new Error('User not found');
      }
      usersData[index] = { ...usersData[index], ...updates };
      return Promise.resolve(usersData[index]);
    }
    return apiPatch<User>(`/users/${id}`, updates);
  },

  delete: async (id: number): Promise<void> => {
    if (useMockApi()) {
      const index = usersData.findIndex((u) => u.id === id);
      if (index === -1) throw new Error('User not found');
      usersData.splice(index, 1);
      return Promise.resolve();
    }
    await apiDelete(`/users/${id}`);
  },
};
