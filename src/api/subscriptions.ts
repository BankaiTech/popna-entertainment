import type { Subscription } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import { apiDelete, apiGetList, apiGetOne, apiPatch, apiPost } from '@/api/resources';
import { useMockApi } from '@/lib/http';
import { useAuthStore } from '@/store/useAuthStore';
import { getIndustrySubscriptions } from './industryMockData';

function getCurrentOrgId(): string {
  return useAuthStore.getState().organizationId ?? MOCK_ORGANIZATION_ID;
}

const now = new Date().toISOString();
const nextMonth = new Date();
nextMonth.setMonth(nextMonth.getMonth() + 1);

// ISP subscriptions (org_001)
const ispSubscriptions: Subscription[] = [
  { id: 1, organizationId: MOCK_ORGANIZATION_ID, customerId: 1, customerName: 'Rajesh Kumar', planName: 'Cable Basic 50 Mbps', amount: 499, billingCycle: 'monthly', startDate: '2026-01-01', nextBillingDate: nextMonth.toISOString().slice(0, 10), status: 'active', autoRenew: true, createdAt: now },
  { id: 2, organizationId: MOCK_ORGANIZATION_ID, customerId: 7, customerName: 'Rahul Verma', planName: 'Internet 2 Speed 150 Mbps', amount: 899, billingCycle: 'monthly', startDate: '2026-02-01', nextBillingDate: nextMonth.toISOString().slice(0, 10), status: 'active', autoRenew: true, createdAt: now },
  { id: 3, organizationId: MOCK_ORGANIZATION_ID, customerId: 8, customerName: 'Kavita Nair', planName: 'Cable Ultra 200 Mbps', amount: 1299, billingCycle: 'monthly', startDate: '2025-12-01', nextBillingDate: '2026-03-01', status: 'paused', autoRenew: false, createdAt: now },
];

let subscriptionsData: Subscription[] = [...ispSubscriptions, ...getIndustrySubscriptions()];
let nextId = Math.max(0, ...subscriptionsData.map((s) => s.id)) + 1;

export const subscriptionsApi = {
  getAll: async (): Promise<Subscription[]> => {
    if (useMockApi()) {
      const orgId = getCurrentOrgId();
      return Promise.resolve(subscriptionsData.filter((s) => s.organizationId === orgId));
    }
    return apiGetList<Subscription>('/subscriptions');
  },
  getById: async (id: number): Promise<Subscription> => {
    if (useMockApi()) {
      const item = subscriptionsData.find((s) => s.id === id);
      if (!item) throw new Error('Subscription not found');
      return Promise.resolve(item);
    }
    return apiGetOne<Subscription>(`/subscriptions/${id}`);
  },
  create: async (sub: Omit<Subscription, 'id' | 'createdAt'>): Promise<Subscription> => {
    if (useMockApi()) {
      const nextBilling = sub.nextBillingDate || (() => {
        const d = new Date(sub.startDate);
        if (sub.billingCycle === 'monthly') d.setMonth(d.getMonth() + 1);
        else if (sub.billingCycle === 'quarterly') d.setMonth(d.getMonth() + 3);
        else d.setFullYear(d.getFullYear() + 1);
        return d.toISOString().slice(0, 10);
      })();
      const newSub: Subscription = {
        ...sub,
        organizationId: sub.organizationId ?? getCurrentOrgId(),
        id: nextId++,
        nextBillingDate: nextBilling,
        createdAt: new Date().toISOString(),
      };
      subscriptionsData.push(newSub);
      return Promise.resolve(newSub);
    }
    return apiPost<Subscription>('/subscriptions', sub);
  },
  update: async (id: number, sub: Partial<Subscription>): Promise<Subscription> => {
    if (useMockApi()) {
      const index = subscriptionsData.findIndex((s) => s.id === id);
      if (index === -1) throw new Error('Subscription not found');
      subscriptionsData[index] = { ...subscriptionsData[index], ...sub };
      return Promise.resolve(subscriptionsData[index]);
    }
    return apiPatch<Subscription>(`/subscriptions/${id}`, sub);
  },
  delete: async (id: number): Promise<void> => {
    if (useMockApi()) {
      const index = subscriptionsData.findIndex((s) => s.id === id);
      if (index === -1) throw new Error('Subscription not found');
      subscriptionsData.splice(index, 1);
      return Promise.resolve();
    }
    await apiDelete(`/subscriptions/${id}`);
  },
};
