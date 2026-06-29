// Multi-tenant ready - backend will enforce org isolation
import type { SalesInvoice } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import apiClient from '@/lib/apiClient';
import { isMockMode, toCamelCase, toSnakeCase, unwrapApiData } from '@/lib/apiHelpers';
import { useAuthStore } from '@/store/useAuthStore';
import { getIndustryInvoices } from './industryMockData';
import { endpoints } from './endpoints';

function getCurrentOrgId(): string {
  return useAuthStore.getState().organizationId ?? MOCK_ORGANIZATION_ID;
}

const getDate = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
};

const ispInvoices: SalesInvoice[] = [
  { id: 1, organizationId: MOCK_ORGANIZATION_ID, invoiceNumber: 'INV-2024-001', customerId: 1, customerName: 'Rajesh Kumar', serviceProvider: 'Cable', planName: 'Cable Basic 50 Mbps', amount: 499, gstRate: 18, gstAmount: 89.82, totalAmount: 588.82, status: 'paid', issueDate: getDate(15), dueDate: getDate(5), createdAt: getDate(15) },
  { id: 2, organizationId: MOCK_ORGANIZATION_ID, invoiceNumber: 'INV-2024-002', customerId: 2, customerName: 'Naresh', serviceProvider: 'Internet 1', planName: 'Internet 1 Fiber Basic', amount: 449, gstRate: 18, gstAmount: 80.82, totalAmount: 529.82, status: 'sent', issueDate: getDate(8), dueDate: getDate(-2), createdAt: getDate(8) },
  { id: 3, organizationId: MOCK_ORGANIZATION_ID, invoiceNumber: 'INV-2024-003', customerId: 3, customerName: 'Amit Patel', serviceProvider: 'Internet 2', planName: 'Internet 2 Express 75 Mbps', amount: 599, gstRate: 18, gstAmount: 107.82, totalAmount: 706.82, status: 'draft', issueDate: getDate(0), dueDate: getDate(30), createdAt: getDate(0) },
];

let invoicesData: SalesInvoice[] = [...ispInvoices, ...getIndustryInvoices()];

function mapInvoice(raw: Record<string, unknown>): SalesInvoice {
  return toCamelCase<SalesInvoice>(raw);
}

export const salesInvoicesApi = {
  getAll: async (): Promise<SalesInvoice[]> => {
    if (isMockMode()) {
      const orgId = getCurrentOrgId();
      return Promise.resolve(invoicesData.filter((i) => i.organizationId === orgId));
    }
    const response = await apiClient.get(endpoints.invoices);
    const list = unwrapApiData<Record<string, unknown>[]>(response);
    return (Array.isArray(list) ? list : []).map(mapInvoice);
  },
  getById: async (id: number): Promise<SalesInvoice> => {
    if (isMockMode()) {
      const inv = invoicesData.find((i) => i.id === id);
      if (!inv) throw new Error('Invoice not found');
      return inv;
    }
    const response = await apiClient.get(`${endpoints.invoices}/${id}`);
    return mapInvoice(unwrapApiData<Record<string, unknown>>(response));
  },
  create: async (invoice: Omit<SalesInvoice, 'id' | 'createdAt'>): Promise<SalesInvoice> => {
    if (isMockMode()) {
      const newInv: SalesInvoice = {
        ...invoice,
        organizationId: invoice.organizationId ?? getCurrentOrgId(),
        id: Math.max(0, ...invoicesData.map((i) => i.id)) + 1,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      invoicesData.push(newInv);
      return newInv;
    }
    const payload = toSnakeCase({
      ...invoice,
      kind: 'sales',
      invoiceNumber: invoice.invoiceNumber,
      items: invoice.items ?? [],
    } as Record<string, unknown>);
    const response = await apiClient.post(endpoints.invoices, payload);
    return mapInvoice(unwrapApiData<Record<string, unknown>>(response));
  },
  update: async (id: number, data: Partial<SalesInvoice>): Promise<SalesInvoice> => {
    if (isMockMode()) {
      const idx = invoicesData.findIndex((i) => i.id === id);
      if (idx === -1) throw new Error('Invoice not found');
      invoicesData[idx] = { ...invoicesData[idx], ...data };
      return invoicesData[idx];
    }
    const response = await apiClient.patch(`${endpoints.invoices}/${id}`, toSnakeCase(data as Record<string, unknown>));
    return mapInvoice(unwrapApiData<Record<string, unknown>>(response));
  },
  downloadPdf: async (id: number): Promise<void> => {
    if (isMockMode()) {
      const inv = invoicesData.find((i) => i.id === id);
      if (!inv) throw new Error('Invoice not found');
      return;
    }
    await apiClient.get(`${endpoints.invoices}/${id}/pdf`, { responseType: 'blob' });
  },
};
