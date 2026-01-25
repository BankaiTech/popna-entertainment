import type { User } from '@/models/types';
import { mockUsers } from './mockData';

/**
 * Mock Users API (Admin/Employee management).
 * Replace with real backend auth & user management later.
 */

// In-memory store; initial state from mockUsers
let usersData: User[] = [...mockUsers];

export const usersApi = {
  getAll: async (): Promise<User[]> => {
    // Replace with real API call later
    return Promise.resolve([...usersData]);
  },

  create: async (user: Omit<User, 'id' | 'createdAt'>): Promise<User> => {
    // Replace with real API call later
    const existing = usersData.find((u) => u.username.toLowerCase() === user.username.toLowerCase());
    if (existing) {
      throw new Error('Username already exists. Please choose a different username.');
    }
    const newUser: User = {
      ...user,
      id: Math.max(...usersData.map((u) => u.id), 0) + 1,
      createdAt: new Date().toISOString(),
    };
    usersData.push(newUser);
    return Promise.resolve(newUser);
  },
};
