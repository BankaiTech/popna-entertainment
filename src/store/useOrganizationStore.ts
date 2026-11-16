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

const ORG_TTL_MS = 60_000;
let orgLoadedAt = 0;
let orgRequest: { id: string; promise: Promise<void> } | null = null;

export const useOrganizationStore = create<OrganizationState>((set, get) => ({
    currentOrganization: null,
    organizations: [],
    loading: false,

    fetchOrganization: async (id: string) => {
        // Already loaded for this operator a moment ago, or loading right now: don't ask again.
        const cur = get().currentOrganization;
        if (cur && String(cur.id) === String(id) && Date.now() - orgLoadedAt < ORG_TTL_MS) return;
        if (orgRequest && orgRequest.id === id) return orgRequest.promise;
        set({ loading: true });
        const promise = (async () => {
            try {
                const org = await organizationsApi.getById(id);
                orgLoadedAt = Date.now();
                set({ currentOrganization: org, loading: false });
            } catch {
                set({ loading: false });
            } finally {
                orgRequest = null;
            }
        })();
        orgRequest = { id, promise };
        return promise;
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
                allowedModules: template?.enabledModules ?? org.allowedModules,
                allowedSettingsTabs: template?.enabledSettingsTabs ?? org.allowedSettingsTabs,
            },
        });
    },

    getTerminology: (key: string) => {
        const org = get().currentOrganization;
        return org?.terminology?.[key];
    },
}));
