import type { Lead } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import { activitiesResource } from '@/api/resources';
import { useMockApi } from '@/lib/http';
import { useAuthStore } from '@/store/useAuthStore';
import { getIndustryLeads } from './industryMockData';

function getCurrentOrgId(): string {
  return useAuthStore.getState().organizationId ?? MOCK_ORGANIZATION_ID;
}

const now = new Date().toISOString();

// ISP leads (org_001)
const ispLeads: Lead[] = [
  { id: 1, organizationId: MOCK_ORGANIZATION_ID, name: 'Acme Corp', email: 'contact@acme.com', mobile: '9876543210', source: 'website', stage: 'qualified', value: 50000, assignedTo: 'Sales1', followUps: [{ id: 1, date: '2026-03-08', type: 'call', notes: 'Initial call - interested', outcome: 'Positive' }], notes: 'Enterprise deal', tags: ['enterprise', 'hot'], createdAt: now },
  { id: 2, organizationId: MOCK_ORGANIZATION_ID, name: 'Jane Smith', mobile: '9876543211', source: 'walk-in', stage: 'new', followUps: [], createdAt: now },
  { id: 3, organizationId: MOCK_ORGANIZATION_ID, name: 'Retail Co', email: 'info@retail.co', mobile: '9876543212', source: 'referral', stage: 'proposal', value: 25000, assignedTo: 'Sales2', followUps: [], createdAt: now },
];

let leadsData: Lead[] = [...ispLeads, ...getIndustryLeads()];
let nextId = Math.max(0, ...leadsData.map((l) => l.id)) + 1;
let nextFollowUpId = 1000;

export const leadsApi = {
  getAll: async (): Promise<Lead[]> => {
    if (useMockApi()) {
      const orgId = getCurrentOrgId();
      return Promise.resolve(JSON.parse(JSON.stringify(leadsData.filter((l) => l.organizationId === orgId))));
    }
    return activitiesResource.list<Lead>('lead');
  },
  getById: async (id: number): Promise<Lead> => {
    if (useMockApi()) {
      const item = leadsData.find((l) => l.id === id);
      if (!item) throw new Error('Lead not found');
      return Promise.resolve(JSON.parse(JSON.stringify(item)));
    }
    return activitiesResource.get<Lead>(id);
  },
  create: async (lead: Omit<Lead, 'id' | 'createdAt'>): Promise<Lead> => {
    if (useMockApi()) {
      const withIds = {
        ...lead,
        followUps: (lead.followUps || []).map((f) => ({ ...f, id: nextFollowUpId++ })),
      };
      const newLead: Lead = {
        ...withIds,
        organizationId: lead.organizationId ?? getCurrentOrgId(),
        id: nextId++,
        createdAt: new Date().toISOString(),
      };
      leadsData.push(newLead);
      return Promise.resolve(JSON.parse(JSON.stringify(newLead)));
    }
    return activitiesResource.create<Lead>({ kind: 'lead', ...lead });
  },
  update: async (id: number, lead: Partial<Lead>): Promise<Lead> => {
    if (useMockApi()) {
      const index = leadsData.findIndex((l) => l.id === id);
      if (index === -1) throw new Error('Lead not found');
      if (lead.followUps) {
        lead.followUps = lead.followUps.map((f) => (f.id ? f : { ...f, id: nextFollowUpId++ }));
      }
      leadsData[index] = { ...leadsData[index], ...lead };
      return Promise.resolve(JSON.parse(JSON.stringify(leadsData[index])));
    }
    return activitiesResource.update<Lead>(id, { ...lead });
  },
  delete: async (id: number): Promise<void> => {
    if (useMockApi()) {
      const index = leadsData.findIndex((l) => l.id === id);
      if (index === -1) throw new Error('Lead not found');
      leadsData.splice(index, 1);
      return Promise.resolve();
    }
    await activitiesResource.remove(id);
  },
};
