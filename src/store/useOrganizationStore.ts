// Module access controlled by organization permissions
import { create } from 'zustand';
import { organizationsApi } from '@/api/organizations';
import type { Organization, ModuleKey, SettingsTabKey, IndustryType } from '@/models/types';
import { getTemplateById } from '@/config/industryTemplates';
import { stickyOnce, clearAsyncOnce, clearAsyncOncePrefix } from '@/lib/asyncOnce';

interface OrganizationState {
  currentOrganization: Organization | null;
  organizations: Organization[];
  loading: boolean;
  /** Fetch organization by ID and set as current (cached until force / clear) */
  fetchOrganization: (id: string, opts?: { force?: boolean }) => Promise<void>;
  /** Fetch all organizations (for Super Admin) */
  fetchAllOrganizations: () => Promise<void>;
  /** Drop cached org fetch (call on logout / org switch) */
  clearOrganizationCache: (id?: string) => void;
  isModuleAllowed: (module: ModuleKey) => boolean;
  isSettingsTabAllowed: (tab: SettingsTabKey) => boolean;
  getAllowedModules: () => ModuleKey[];
  getAllowedSettingsTabs: () => SettingsTabKey[];
  setIndustryType: (type: IndustryType) => void;
  getTerminology: (key: string) => string | undefined;
}

export const useOrganizationStore = create<OrganizationState>((set, get) => ({
  currentOrganization: null,
  organizations: [],
  loading: false,

  clearOrganizationCache: (id?: string) => {
    if (id) {
      clearAsyncOnce(`org:get:${id}`);
      if (get().currentOrganization?.id === id) {
        set({ currentOrganization: null });
      }
      return;
    }
    clearAsyncOncePrefix('org:get:');
    clearAsyncOnce('org:list');
    set({ currentOrganization: null });
  },

  fetchOrganization: async (id: string, opts?: { force?: boolean }) => {
    if (!opts?.force && get().currentOrganization?.id === id) {
      return;
    }
    if (opts?.force) {
      clearAsyncOnce(`org:get:${id}`);
    }

    return stickyOnce(`org:get:${id}`, async () => {
      if (!opts?.force && get().currentOrganization?.id === id) {
        return;
      }
      set({ loading: true });
      try {
        const org = await organizationsApi.getById(id);
        set({ currentOrganization: org, loading: false });
      } catch {
        set({ loading: false });
      }
    });
  },

  fetchAllOrganizations: async () => {
    return stickyOnce('org:list', async () => {
      set({ loading: true });
      try {
        const orgs = await organizationsApi.getAll();
        set({ organizations: orgs, loading: false });
      } catch {
        set({ loading: false });
      }
    });
  },

  isModuleAllowed: (module: ModuleKey) => {
    const org = get().currentOrganization;
    if (!org) return true;
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
