// SaaS Master Controller - Organizations API
import type { Organization, ModuleKey, SettingsTabKey, OrganizationStatus, IndustryType, SubscriptionState } from '@/models/types';
import { ALL_MODULES, ALL_SETTINGS_TABS } from '@/models/types';
import { getTemplateById } from '@/config/industryTemplates';
import apiClient from '@/lib/apiClient';
import { isMockMode, toCamelCase, toSnakeCase, unwrapApiData } from '@/lib/apiHelpers';
import { endpoints } from './endpoints';

function templateDefaults(type: IndustryType) {
    const tpl = getTemplateById(type);
    return {
        industryType: type,
        terminology: tpl?.terminology ?? {},
        allowedModules: (tpl?.enabledModules ?? [...ALL_MODULES]) as ModuleKey[],
        allowedSettingsTabs: (tpl?.enabledSettingsTabs ?? [...ALL_SETTINGS_TABS]) as SettingsTabKey[],
    };
}

let organizations: Organization[] = [
    {
        id: 'org_001',
        name: 'Demo Cable & Net',
        status: 'active',
        subscriptionStart: '2025-01-01',
        subscriptionEnd: '2026-12-31',
        ...templateDefaults('isp-cable'),
    },
    {
        id: 'org_002',
        name: 'Urban Retail Store',
        status: 'active',
        subscriptionStart: '2025-01-01',
        subscriptionEnd: '2026-12-31',
        ...templateDefaults('retail'),
    },
    {
        id: 'org_003',
        name: 'Glow Salon & Spa',
        status: 'active',
        subscriptionStart: '2025-01-01',
        subscriptionEnd: '2026-12-31',
        ...templateDefaults('salon-spa'),
    },
    {
        id: 'org_004',
        name: 'Spice Kitchen Restaurant',
        status: 'active',
        subscriptionStart: '2025-01-01',
        subscriptionEnd: '2026-12-31',
        ...templateDefaults('restaurant-cafe'),
    },
    {
        id: 'org_005',
        name: 'CareWell Pharmacy',
        status: 'active',
        subscriptionStart: '2025-01-01',
        subscriptionEnd: '2026-12-31',
        ...templateDefaults('healthcare-pharmacy'),
    },
    {
        id: 'org_006',
        name: 'FitZone Gym',
        status: 'active',
        subscriptionStart: '2025-01-01',
        subscriptionEnd: '2026-12-31',
        ...templateDefaults('gym-fitness'),
    },
];

function mapOrganization(raw: Record<string, unknown>): Organization {
    const o = toCamelCase<Record<string, unknown>>(raw);
    return {
        id: String(o.id),
        name: String(o.name ?? ''),
        status: (o.status as OrganizationStatus) ?? 'active',
        allowedModules: (o.allowedModules as ModuleKey[]) ?? [...ALL_MODULES],
        allowedSettingsTabs: (o.allowedSettingsTabs as SettingsTabKey[]) ?? [...ALL_SETTINGS_TABS],
        subscriptionStart: String(o.subscriptionStart ?? ''),
        subscriptionEnd: String(o.subscriptionEnd ?? ''),
        industryType: o.industryType as IndustryType | undefined,
        terminology: o.terminology as Record<string, string> | undefined,
        code: o.code ? String(o.code) : undefined,
        maxProviders: o.maxProviders == null ? null : Number(o.maxProviders),
        maxPlans: o.maxPlans == null ? null : Number(o.maxPlans),
        providersUsed: Number(o.providersUsed ?? 0),
        plansUsed: Number(o.plansUsed ?? 0),
        subscriptionState: o.subscriptionState as SubscriptionState | undefined,
        daysLeft: o.daysLeft == null ? null : Number(o.daysLeft),
        ownerLogin: o.ownerLogin == null ? null : String(o.ownerLogin),
    };
}

/** Extra fields used only when the app owner creates a new operator. */
export interface NewOrganizationOwner {
    ownerName?: string;
    ownerUsername?: string;
    ownerPassword?: string;
    ownerMobile?: string;
}

export const organizationsApi = {
    getAll: async (): Promise<Organization[]> => {
        if (isMockMode()) return [...organizations];
        const response = await apiClient.get(endpoints.organizations);
        const list = unwrapApiData<Record<string, unknown>[]>(response);
        return (Array.isArray(list) ? list : []).map(mapOrganization);
    },

    getById: async (id: string): Promise<Organization | null> => {
        if (isMockMode()) return organizations.find((org) => org.id === id) || null;
        const response = await apiClient.get(`${endpoints.organizations}/${id}`);
        return mapOrganization(unwrapApiData<Record<string, unknown>>(response));
    },

    create: async (org: Omit<Organization, 'id'> & { id?: string } & NewOrganizationOwner): Promise<Organization> => {
        if (isMockMode()) {
            const newOrg: Organization = {
                ...org,
                id: org.id ?? `org_${String(organizations.length + 1).padStart(3, '0')}`,
            };
            organizations.push(newOrg);
            return newOrg;
        }
        const response = await apiClient.post(endpoints.organizations, toSnakeCase(org as unknown as Record<string, unknown>));
        return mapOrganization(unwrapApiData<Record<string, unknown>>(response));
    },

    update: async (id: string, data: Partial<Organization>): Promise<Organization | null> => {
        if (isMockMode()) {
            const index = organizations.findIndex((org) => org.id === id);
            if (index === -1) return null;
            organizations[index] = { ...organizations[index], ...data };
            return organizations[index];
        }
        const response = await apiClient.patch(`${endpoints.organizations}/${id}`, toSnakeCase(data as Record<string, unknown>));
        return mapOrganization(unwrapApiData<Record<string, unknown>>(response));
    },

    updateStatus: async (id: string, status: OrganizationStatus): Promise<Organization | null> => {
        if (isMockMode()) {
            const index = organizations.findIndex((org) => org.id === id);
            if (index === -1) return null;
            organizations[index] = { ...organizations[index], status };
            return organizations[index];
        }
        const response = await apiClient.patch(`${endpoints.organizations}/${id}/status`, { status });
        return mapOrganization(unwrapApiData<Record<string, unknown>>(response));
    },

    updateModules: async (id: string, modules: ModuleKey[]): Promise<Organization | null> => {
        if (isMockMode()) {
            const index = organizations.findIndex((org) => org.id === id);
            if (index === -1) return null;
            organizations[index] = { ...organizations[index], allowedModules: modules };
            return organizations[index];
        }
        const response = await apiClient.patch(`${endpoints.organizations}/${id}`, { allowed_modules: modules });
        return mapOrganization(unwrapApiData<Record<string, unknown>>(response));
    },

    updateSettingsTabs: async (id: string, tabs: SettingsTabKey[]): Promise<Organization | null> => {
        if (isMockMode()) {
            const index = organizations.findIndex((org) => org.id === id);
            if (index === -1) return null;
            organizations[index] = { ...organizations[index], allowedSettingsTabs: tabs };
            return organizations[index];
        }
        const response = await apiClient.patch(`${endpoints.organizations}/${id}`, { allowed_settings_tabs: tabs });
        return mapOrganization(unwrapApiData<Record<string, unknown>>(response));
    },

    delete: async (id: string): Promise<boolean> => {
        if (isMockMode()) {
            const index = organizations.findIndex((org) => org.id === id);
            if (index === -1) return false;
            organizations = organizations.filter((org) => org.id !== id);
            return true;
        }
        await apiClient.delete(`${endpoints.organizations}/${id}`);
        return true;
    },

    /** Permanently delete an inactive operator and all its data. `confirmCode` must equal its code. */
    deleteWithData: async (id: string, confirmCode: string): Promise<void> => {
        await apiClient.delete(`${endpoints.organizations}/${id}`, { params: { confirm: confirmCode } });
    },

    /** Set a new owner password (generated if empty). The password is returned once and never stored readable. */
    resetOwnerPassword: async (id: string, password = ''): Promise<{ username: string; password: string }> => {
        const response = await apiClient.post(`${endpoints.organizations}/${id}/reset-owner-password`, { password });
        return unwrapApiData<{ username: string; password: string }>(response);
    },

    renewSubscription: async (id: string, months = 1): Promise<Organization | null> => {
        if (isMockMode()) {
            const index = organizations.findIndex((org) => org.id === id);
            if (index === -1) return null;
            const currentEnd = new Date(organizations[index].subscriptionEnd);
            const today = new Date();
            const base = currentEnd > today ? currentEnd : today;
            base.setMonth(base.getMonth() + months);
            const newEnd = base.toISOString().split('T')[0];
            organizations[index] = { ...organizations[index], subscriptionEnd: newEnd };
            return organizations[index];
        }
        const response = await apiClient.patch(`${endpoints.organizations}/${id}`, { renew_months: months });
        return mapOrganization(unwrapApiData<Record<string, unknown>>(response));
    },
};
