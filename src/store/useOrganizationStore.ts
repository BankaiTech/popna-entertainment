// Module access controlled by organization permissions
import { create } from 'zustand';
import { organizationsApi } from '@/api/organizations';
import type { Organization, ModuleKey, SettingsTabKey, IndustryType } from '@/models/types';
import { getTemplateById } from '@/config/industryTemplates';

interface OrganizationState {
    currentOrganization: Organization | null;
    organizations: Organization[];
    loading: boolean;
    /** Fetch organization by ID and set as current */
    fetchOrganization: (id: string) => Promise<void>;
    /** Fetch all organizations (for Super Admin) */
    fetchAllOrganizations: () => Promise<void>;
    /** Check if a module is allowed for current org */
    isModuleAllowed: (module: ModuleKey) => boolean;
    /** Check if a settings tab is allowed for current org */
    isSettingsTabAllowed: (tab: SettingsTabKey) => boolean;
    /** Get allowed modules for current org */
    getAllowedModules: () => ModuleKey[];
    /** Get allowed settings tabs for current org */
    getAllowedSettingsTabs: () => SettingsTabKey[];
    /** Set industry type and apply template defaults */
    setIndustryType: (type: IndustryType) => void;
    /** Get terminology override for a key */
    getTerminology: (key: string) => string | undefined;
}

export const useOrganizationStore = create<OrganizationState>((set, get) => ({
    currentOrganization: null,
    organizations: [],
    loading: false,

    fetchOrganization: async (id: string) => {
        set({ loading: true });
        try {
            const org = await organizationsApi.getById(id);
            set({ currentOrganization: org, loading: false });
        } catch {
            set({ loading: false });
        }
    },

    fetchAllOrganizations: async () => {
        set({ loading: true });
        try {
            const orgs = await organizationsApi.getAll();
            set({ organizations: orgs, loading: false });
        } catch {
            set({ loading: false });
        }
    },

    isModuleAllowed: (module: ModuleKey) => {
        const org = get().currentOrganization;
        if (!org) return true; // No org loaded = allow all (superadmin or fallback)
        return org.allowedModules.includes(module);
    },

    isSettingsTabAllowed: (tab: SettingsTabKey) => {
        const org = get().currentOrganization;
        if (!org) return true;
        return org.allowedSettingsTabs.includes(tab);
    },

    getAllowedModules: () => {
        const org = get().currentOrganization;
        if (!org) return [];
        return org.allowedModules;
    },

    getAllowedSettingsTabs: () => {
        const org = get().currentOrganization;
        if (!org) return [];
        return org.allowedSettingsTabs;
    },

    setIndustryType: (type: IndustryType) => {
        const org = get().currentOrganization;
        if (!org) return;
        const template = getTemplateById(type);
        set({
            currentOrganization: {
                ...org,
                industryType: type,
                terminology: template?.terminology ?? {},
            },
        });
    },

    getTerminology: (key: string) => {
        const org = get().currentOrganization;
        return org?.terminology?.[key];
    },
}));
