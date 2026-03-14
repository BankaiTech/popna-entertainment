import type { Subscription } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';

const now = new Date().toISOString();
const nextMonth = new Date();
nextMonth.setMonth(nextMonth.getMonth() + 1);

let subscriptionsData: Subscription[] = [
  {
    id: 1,
    organizationId: MOCK_ORGANIZATION_ID,
    customerId: 1,
    customerName: 'John Doe',
    planName: 'Premium Monthly',
    amount: 999,
    billingCycle: 'monthly',
    startDate: '2026-01-01',
    nextBillingDate: nextMonth.toISOString().slice(0, 10),
    status: 'active',
    autoRenew: true,
    createdAt: now,
  },
  {
    id: 2,
    organizationId: MOCK_ORGANIZATION_ID,
    customerId: 2,
    customerName: 'Jane Smith',
    planName: 'Basic Yearly',
    amount: 9990,
    billingCycle: 'yearly',
    startDate: '2026-02-01',
    nextBillingDate: '2027-02-01',
    status: 'active',
    autoRenew: true,
    createdAt: now,
  },
  {
    id: 3,
    organizationId: MOCK_ORGANIZATION_ID,
    customerId: 1,
    customerName: 'John Doe',
    planName: 'Add-on Quarterly',
    amount: 2499,
    billingCycle: 'quarterly',
    startDate: '2025-12-01',
    nextBillingDate: '2026-03-01',
    status: 'paused',
    autoRenew: false,
    createdAt: now,
  },
];

let nextId = 4;

export const subscriptionsApi = {
  getAll: async (): Promise<Subscription[]> => {
    return Promise.resolve([...subscriptionsData]);
  },
  getById: async (id: number): Promise<Subscription> => {
    const item = subscriptionsData.find((s) => s.id === id);
    if (!item) throw new Error('Subscription not found');
    return Promise.resolve(item);
  },
  create: async (sub: Omit<Subscription, 'id' | 'createdAt'>): Promise<Subscription> => {
    const nextBilling = sub.nextBillingDate || (() => {
      const d = new Date(sub.startDate);
      if (sub.billingCycle === 'monthly') d.setMonth(d.getMonth() + 1);
      else if (sub.billingCycle === 'quarterly') d.setMonth(d.getMonth() + 3);
      else d.setFullYear(d.getFullYear() + 1);
      return d.toISOString().slice(0, 10);
    })();
    const newSub: Subscription = {
      ...sub,
      organizationId: sub.organizationId ?? MOCK_ORGANIZATION_ID,
      id: nextId++,
      nextBillingDate: nextBilling,
      createdAt: new Date().toISOString(),
    };
    subscriptionsData.push(newSub);
    return Promise.resolve(newSub);
  },
  update: async (id: number, sub: Partial<Subscription>): Promise<Subscription> => {
    const index = subscriptionsData.findIndex((s) => s.id === id);
    if (index === -1) throw new Error('Subscription not found');
    subscriptionsData[index] = { ...subscriptionsData[index], ...sub };
    return Promise.resolve(subscriptionsData[index]);
  },
  delete: async (id: number): Promise<void> => {
    const index = subscriptionsData.findIndex((s) => s.id === id);
    if (index === -1) throw new Error('Subscription not found');
    subscriptionsData.splice(index, 1);
    return Promise.resolve();
  },
};
