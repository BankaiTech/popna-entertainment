// Mock Branches API
import type { Branch } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';

let branchesData: Branch[] = [
    {
        id: 1,
        organizationId: MOCK_ORGANIZATION_ID,
        name: 'Main Office',
        address: '123 Business Park, Mumbai, Maharashtra',
        phone: '022-12345678',
        isActive: true,
        createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: 2,
        organizationId: MOCK_ORGANIZATION_ID,
        name: 'North Branch',
        address: '456 Market Road, Delhi, Delhi',
        phone: '011-87654321',
        isActive: true,
        createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
    },
];

export const branchesApi = {
    getAll: async (): Promise<Branch[]> => {
        return [...branchesData];
    },

    create: async (branch: Omit<Branch, 'id' | 'createdAt'>): Promise<Branch> => {
        const newBranch: Branch = {
            ...branch,
            id: Math.max(...branchesData.map((b) => b.id), 0) + 1,
            createdAt: new Date().toISOString(),
        };
        branchesData.push(newBranch);
        return newBranch;
    },

    update: async (id: number, updates: Partial<Omit<Branch, 'id' | 'createdAt'>>): Promise<Branch> => {
        const index = branchesData.findIndex((b) => b.id === id);
        if (index === -1) throw new Error('Branch not found');
        branchesData[index] = { ...branchesData[index], ...updates };
        return branchesData[index];
    },

    delete: async (id: number): Promise<boolean> => {
        const index = branchesData.findIndex((b) => b.id === id);
        if (index === -1) return false;
        branchesData = branchesData.filter((b) => b.id !== id);
        return true;
    },
};
