/**
 * Point of Sale API (Postman: GET/POST /pos).
 * Falls back to invoices kind=pos when listing via invoices resource is needed.
 */

import type { SalesInvoice } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import { apiGetList, apiGetOne, apiPost, invoicesResource } from '@/api/resources';
import { useMockApi } from '@/lib/http';
import { useAuthStore } from '@/store/useAuthStore';
import { salesInvoicesApi } from '@/api/invoices';

function getCurrentOrgId(): string {
  return useAuthStore.getState().organizationId ?? MOCK_ORGANIZATION_ID;
}

export type PosSaleInput = Omit<SalesInvoice, 'id' | 'createdAt'>;

export const posApi = {
  getAll: async (): Promise<SalesInvoice[]> => {
    if (useMockApi()) {
      const all = await salesInvoicesApi.getAll();
      return all.filter((i) => i.serviceProvider === 'POS');
    }
    try {
      return await apiGetList<SalesInvoice>('/pos');
    } catch {
      return invoicesResource.list<SalesInvoice>('pos');
    }
  },

  getById: async (id: number): Promise<SalesInvoice> => {
    if (useMockApi()) {
      return salesInvoicesApi.getById(id);
    }
    try {
      return await apiGetOne<SalesInvoice>(`/pos/${id}`);
    } catch {
      return invoicesResource.get<SalesInvoice>(id);
    }
  },

  create: async (sale: PosSaleInput): Promise<SalesInvoice> => {
    if (useMockApi()) {
      return salesInvoicesApi.create({
        ...sale,
        organizationId: sale.organizationId ?? getCurrentOrgId(),
        serviceProvider: sale.serviceProvider || 'POS',
      });
    }
    const body = {
      kind: 'pos',
      ...sale,
      organizationId: sale.organizationId ?? getCurrentOrgId(),
    };
    try {
      return await apiPost<SalesInvoice>('/pos', body);
    } catch {
      return invoicesResource.create<SalesInvoice>(body);
    }
  },
};
