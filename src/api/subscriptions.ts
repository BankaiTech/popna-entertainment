import type { Subscription } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import apiClient from '@/lib/apiClient';
import { isMockMode, toCamelCase, toSnakeCase, unwrapApiData } from '@/lib/apiHelpers';
import { useAuthStore } from '@/store/useAuthStore';
import { getIndustrySubscriptions } from './industryMockData';
import { endpoints } from './endpoints';

function getCurrentOrgId(): string {
  return useAuthStore.getState().organizationId ?? MOCK_ORGANIZATION_ID;
}

const now = new Date().toISOString();
const nextMonth = new Date();
nextMonth.setMonth(nextMonth.getMonth() + 1);

const ispSubscriptions: Subscription[] = [
  { id: 1, organizationId: MOCK_ORGANIZATION_ID, customerId: 1, customerName: 'Rajesh Kumar', planName: 'Cable Basic 50 Mbps', amount: 499, billingCycle: 'monthly', startDate: '2026-01-01', nextBillingDate: nextMonth.toISOString().slice(0, 10), status: 'active', autoRenew: true, createdAt: now },
  { id: 2, organizationId: MOCK_ORGANIZATION_ID, customerId: 7, customerName: 'Rahul Verma', planName: 'Internet 2 Speed 150 Mbps', amount: 899, billingCycle: 'monthly', startDate: '2026-02-01', nextBillingDate: nextMonth.toISOString().slice(0, 10), status: 'active', autoRenew: true, createdAt: now },
  { id: 3, organizationId: MOCK_ORGANIZATION_ID, customerId: 8, customerName: 'Kavita Nair', planName: 'Cable Ultra 200 Mbps', amount: 1299, billingCycle: 'monthly', startDate: '2025-12-01', nextBillingDate: '2026-03-01', status: 'paused', autoRenew: false, createdAt: now },
];

let subscriptionsData: Subscription[] = [...ispSubscriptions, ...getIndustrySubscriptions()];
let nextId = Math.max(0, ...subscriptionsData.map((s) => s.id)) + 1;

function mapSubscription(raw: Record<string, unknown>): Subscription {
  return toCamelCase<Subscription>(raw);
}

export const subscriptionsApi = {
  getAll: async (): Promise<Subscription[]> => {
    if (isMockMode()) {
      const orgId = getCurrentOrgId();
      return Promise.resolve(subscriptionsData.filter((s) => s.organizationId === orgId));
    }
    const response = await apiClient.get(endpoints.subscriptions);
    const list = unwrapApiData<Record<string, unknown>[]>(response);
    return (Array.isArray(list) ? list : []).map(mapSubscription);
  },
  getById: async (id: number): Promise<Subscription> => {
    if (isMockMode()) {
      const item = subscriptionsData.find((s) => s.id === id);
      if (!item) throw new Error('Subscription not found');
      return Promise.resolve(item);
    }
    const response = await apiClient.get(`${endpoints.subscriptions}/${id}`);
    return mapSubscription(unwrapApiData<Record<string, unknown>>(response));
  },
  create: async (sub: Omit<Subscription, 'id' | 'createdAt'>): Promise<Subscription> => {
    if (isMockMode()) {
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
    const response = await apiClient.post(endpoints.subscriptions, toSnakeCase({
      contactId: sub.customerId,
      status: sub.status,
    } as Record<string, unknown>));
    return mapSubscription(unwrapApiData<Record<string, unknown>>(response));
  },
  update: async (id: number, sub: Partial<Subscription>): Promise<Subscription> => {
    if (isMockMode()) {
      const index = subscriptionsData.findIndex((s) => s.id === id);
      if (index === -1) throw new Error('Subscription not found');
      subscriptionsData[index] = { ...subscriptionsData[index], ...sub };
      return Promise.resolve(subscriptionsData[index]);
    }
    const response = await apiClient.patch(`${endpoints.subscriptions}/${id}`, toSnakeCase(sub as Record<string, unknown>));
    return mapSubscription(unwrapApiData<Record<string, unknown>>(response));
  },
  delete: async (id: number): Promise<void> => {
    if (isMockMode()) {
      const index = subscriptionsData.findIndex((s) => s.id === id);
      if (index === -1) throw new Error('Subscription not found');
      subscriptionsData.splice(index, 1);
      return Promise.resolve();
    }
    await apiClient.delete(`${endpoints.subscriptions}/${id}`);
  },
};
