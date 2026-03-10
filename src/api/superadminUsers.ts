import type { SuperAdminUser } from '@/models/types';

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
    return [...superadminUsersData];
  },

  create: async (user: Omit<SuperAdminUser, 'id' | 'createdAt'>): Promise<SuperAdminUser> => {
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
  },

  update: async (id: number, updates: Partial<Omit<SuperAdminUser, 'id' | 'createdAt'>>): Promise<SuperAdminUser> => {
    const index = superadminUsersData.findIndex((u) => u.id === id);
    if (index === -1) throw new Error('User not found');
    superadminUsersData[index] = { ...superadminUsersData[index], ...updates };
    return superadminUsersData[index];
  },
};
