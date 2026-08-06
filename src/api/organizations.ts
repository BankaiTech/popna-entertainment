// SaaS Master Controller - Organizations API
import type { Organization, ModuleKey, SettingsTabKey, OrganizationStatus, IndustryType, User } from '@/models/types';
import { ALL_MODULES, ALL_SETTINGS_TABS } from '@/models/types';
import { apiGetList, apiGetOne, apiPatch, apiPost } from '@/api/resources';
import { useMockApi } from '@/lib/http';
import { getTemplateById } from '@/config/industryTemplates';
import { usersApi } from '@/api/users';

export interface OrgAdminCredentials {
  username: string;
  email: string;
  password: string;
  /** Display name; defaults to organization name + " Admin" */
  name?: string;
}

export type CreateOrganizationInput = Omit<Organization, 'id'> & {
  admin: OrgAdminCredentials;
};

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
    name: 'Popna ISP',
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

export const organizationsApi = {
  getAll: async (): Promise<Organization[]> => {
    if (useMockApi()) {
      return [...organizations];
    }
    return apiGetList<Organization>('/organizations');
  },

  getById: async (id: string): Promise<Organization | null> => {
    if (useMockApi()) {
      return organizations.find((org) => org.id === id) || null;
    }
    try {
      return await apiGetOne<Organization>(`/organizations/${id}`);
    } catch {
      return null;
    }
  },

  create: async (input: CreateOrganizationInput): Promise<Organization> => {
    const { admin, ...org } = input;
    const adminName = admin.name?.trim() || `${org.name} Admin`;
    const adminPayload = {
      name: adminName,
      username: admin.username.trim(),
      email: admin.email.trim(),
      password: admin.password,
      role: 'admin' as const,
      status: 'active' as const,
    };

    if (useMockApi()) {
      const newOrg: Organization = {
        ...org,
        id: `org_${String(organizations.length + 1).padStart(3, '0')}`,
      };
      organizations.push(newOrg);
      await usersApi.create({
        ...adminPayload,
        organizationId: newOrg.id,
      });
      return newOrg;
    }

    // 1) Create organization
    const created = await apiPost<Organization>('/organizations', org);

    // 2) Create organization admin so they can log in to this org
    await apiPost<User>('/users', {
      ...adminPayload,
      organizationId: created.id,
    });

    return created;
  },

  update: async (id: string, data: Partial<Organization>): Promise<Organization | null> => {
    if (useMockApi()) {
      const index = organizations.findIndex((org) => org.id === id);
      if (index === -1) return null;
      organizations[index] = { ...organizations[index], ...data };
      return organizations[index];
    }
    try {
      return await apiPatch<Organization>(`/organizations/${id}`, data);
    } catch {
      return null;
    }
  },

  updateStatus: async (id: string, status: OrganizationStatus): Promise<Organization | null> => {
    if (useMockApi()) {
      const index = organizations.findIndex((org) => org.id === id);
      if (index === -1) return null;
      organizations[index] = { ...organizations[index], status };
      return organizations[index];
    }
    try {
      return await apiPatch<Organization>(`/organizations/${id}/status`, { status });
    } catch {
      return null;
    }
  },

  updateModules: async (id: string, modules: ModuleKey[]): Promise<Organization | null> => {
    if (useMockApi()) {
      const index = organizations.findIndex((org) => org.id === id);
      if (index === -1) return null;
      organizations[index] = { ...organizations[index], allowedModules: modules };
      return organizations[index];
    }
    try {
      return await apiPatch<Organization>(`/organizations/${id}/modules`, { allowedModules: modules });
    } catch {
      return null;
    }
  },

  updateSettingsTabs: async (id: string, tabs: SettingsTabKey[]): Promise<Organization | null> => {
    if (useMockApi()) {
      const index = organizations.findIndex((org) => org.id === id);
      if (index === -1) return null;
      organizations[index] = { ...organizations[index], allowedSettingsTabs: tabs };
      return organizations[index];
    }
    try {
      return await apiPatch<Organization>(`/organizations/${id}/settings-tabs`, {
        allowedSettingsTabs: tabs,
      });
    } catch {
      return null;
    }
  },

  delete: async (id: string): Promise<boolean> => {
    if (useMockApi()) {
      const index = organizations.findIndex((org) => org.id === id);
      if (index === -1) return false;
      organizations = organizations.filter((org) => org.id !== id);
      return true;
    }
    // No DELETE in collection — disable via status
    const updated = await organizationsApi.updateStatus(id, 'disabled');
    return updated != null;
  },

  /**
   * Renew subscription by advancing subscriptionEnd by `months` (default: 1).
   * Uses max(today, currentEnd) as the base so it's always safe to call.
   */
  renewSubscription: async (id: string, months = 1): Promise<Organization | null> => {
    if (useMockApi()) {
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

    const org = await organizationsApi.getById(id);
    if (!org) return null;
    const currentEnd = new Date(org.subscriptionEnd);
    const today = new Date();
    const base = currentEnd > today ? currentEnd : today;
    base.setMonth(base.getMonth() + months);
    const newEnd = base.toISOString().split('T')[0];
    return organizationsApi.update(id, { subscriptionEnd: newEnd });
  },
};
