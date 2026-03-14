import type { Lead } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';

const now = new Date().toISOString();

let leadsData: Lead[] = [
  {
    id: 1,
    organizationId: MOCK_ORGANIZATION_ID,
    name: 'Acme Corp',
    email: 'contact@acme.com',
    mobile: '9876543210',
    source: 'website',
    stage: 'qualified',
    value: 50000,
    assignedTo: 'Sales1',
    followUps: [
      { id: 1, date: '2026-03-08', type: 'call', notes: 'Initial call - interested', outcome: 'Positive' },
    ],
    notes: 'Enterprise deal',
    tags: ['enterprise', 'hot'],
    createdAt: now,
  },
  {
    id: 2,
    organizationId: MOCK_ORGANIZATION_ID,
    name: 'Jane Smith',
    mobile: '9876543211',
    source: 'walk-in',
    stage: 'new',
    followUps: [],
    createdAt: now,
  },
  {
    id: 3,
    organizationId: MOCK_ORGANIZATION_ID,
    name: 'Retail Co',
    email: 'info@retail.co',
    mobile: '9876543212',
    source: 'referral',
    stage: 'proposal',
    value: 25000,
    assignedTo: 'Sales2',
    followUps: [],
    createdAt: now,
  },
];

let nextId = 4;
let nextFollowUpId = 10;

export const leadsApi = {
  getAll: async (): Promise<Lead[]> => {
    return Promise.resolve(JSON.parse(JSON.stringify(leadsData)));
  },
  getById: async (id: number): Promise<Lead> => {
    const item = leadsData.find((l) => l.id === id);
    if (!item) throw new Error('Lead not found');
    return Promise.resolve(JSON.parse(JSON.stringify(item)));
  },
  create: async (lead: Omit<Lead, 'id' | 'createdAt'>): Promise<Lead> => {
    const withIds = {
      ...lead,
      followUps: (lead.followUps || []).map((f) => ({ ...f, id: nextFollowUpId++ })),
    };
    const newLead: Lead = {
      ...withIds,
      organizationId: lead.organizationId ?? MOCK_ORGANIZATION_ID,
      id: nextId++,
      createdAt: new Date().toISOString(),
    };
    leadsData.push(newLead);
    return Promise.resolve(JSON.parse(JSON.stringify(newLead)));
  },
  update: async (id: number, lead: Partial<Lead>): Promise<Lead> => {
    const index = leadsData.findIndex((l) => l.id === id);
    if (index === -1) throw new Error('Lead not found');
    if (lead.followUps) {
      lead.followUps = lead.followUps.map((f) => (f.id ? f : { ...f, id: nextFollowUpId++ }));
    }
    leadsData[index] = { ...leadsData[index], ...lead };
    return Promise.resolve(JSON.parse(JSON.stringify(leadsData[index])));
  },
  delete: async (id: number): Promise<void> => {
    const index = leadsData.findIndex((l) => l.id === id);
    if (index === -1) throw new Error('Lead not found');
    leadsData.splice(index, 1);
    return Promise.resolve();
  },
};
