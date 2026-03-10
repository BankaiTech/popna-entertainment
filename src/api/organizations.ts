// SaaS Master Controller - Organizations mock API
import type { Organization, ModuleKey, SettingsTabKey, OrganizationStatus } from '@/models/types';
import { ALL_MODULES, ALL_SETTINGS_TABS } from '@/models/types';

// Mock organizations data
let organizations: Organization[] = [
    {
        id: 'org_001',
        name: 'Popna',
        status: 'active',
        allowedModules: [...ALL_MODULES],
        allowedSettingsTabs: [...ALL_SETTINGS_TABS],
        subscriptionStart: '2025-01-01',
        subscriptionEnd: '2026-12-31',
    },
];
// Note: ALL_SETTINGS_TABS includes 'billing' for UPI/payment settings

export const organizationsApi = {
    getAll: async (): Promise<Organization[]> => {
        return [...organizations];
    },

    getById: async (id: string): Promise<Organization | null> => {
        return organizations.find((org) => org.id === id) || null;
    },

    create: async (org: Omit<Organization, 'id'>): Promise<Organization> => {
        const newOrg: Organization = {
            ...org,
            id: `org_${String(organizations.length + 1).padStart(3, '0')}`,
        };
        organizations.push(newOrg);
        return newOrg;
    },

    update: async (id: string, data: Partial<Organization>): Promise<Organization | null> => {
        const index = organizations.findIndex((org) => org.id === id);
        if (index === -1) return null;
        organizations[index] = { ...organizations[index], ...data };
        return organizations[index];
    },

    updateStatus: async (id: string, status: OrganizationStatus): Promise<Organization | null> => {
        const index = organizations.findIndex((org) => org.id === id);
        if (index === -1) return null;
        organizations[index] = { ...organizations[index], status };
        return organizations[index];
    },

    updateModules: async (id: string, modules: ModuleKey[]): Promise<Organization | null> => {
        const index = organizations.findIndex((org) => org.id === id);
        if (index === -1) return null;
        organizations[index] = { ...organizations[index], allowedModules: modules };
        return organizations[index];
    },

    updateSettingsTabs: async (id: string, tabs: SettingsTabKey[]): Promise<Organization | null> => {
        const index = organizations.findIndex((org) => org.id === id);
        if (index === -1) return null;
        organizations[index] = { ...organizations[index], allowedSettingsTabs: tabs };
        return organizations[index];
    },

    delete: async (id: string): Promise<boolean> => {
        const index = organizations.findIndex((org) => org.id === id);
        if (index === -1) return false;
        organizations = organizations.filter((org) => org.id !== id);
        return true;
    },

    /**
     * Renew subscription by advancing subscriptionEnd by `months` (default: 1).
     * Uses max(today, currentEnd) as the base so it's always safe to call.
     */
    renewSubscription: async (id: string, months = 1): Promise<Organization | null> => {
        const index = organizations.findIndex((org) => org.id === id);
        if (index === -1) return null;

        const currentEnd = new Date(organizations[index].subscriptionEnd);
        const today = new Date();
        // Start from whichever is later - today or current expiry
        const base = currentEnd > today ? currentEnd : today;
        base.setMonth(base.getMonth() + months);
        const newEnd = base.toISOString().split('T')[0];

        organizations[index] = { ...organizations[index], subscriptionEnd: newEnd };
        return organizations[index];
    },
};
