import type { Quotation, QuotationStatus } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import apiClient from '@/lib/apiClient';
import { isMockMode, toCamelCase, toSnakeCase, unwrapApiData } from '@/lib/apiHelpers';
import { useAuthStore } from '@/store/useAuthStore';
import { getIndustryQuotations } from './industryMockData';
import { endpoints } from './endpoints';

function getCurrentOrgId(): string {
  return useAuthStore.getState().organizationId ?? MOCK_ORGANIZATION_ID;
}

const today = new Date();
const getDate = (offsetDays: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

const ispQuotations: Quotation[] = [
  { id: 1, organizationId: MOCK_ORGANIZATION_ID, quotationNumber: 'QTN-2026-001', customerId: 1, customerName: 'Rajesh Kumar', items: [{ productId: 1, productName: 'Broadband Plan - 50 Mbps', quantity: 1, unitPrice: 499, taxRate: 18, discount: 0, lineTotal: 499 * 1.18 }], subtotal: 499, taxTotal: 499 * 0.18, discountAmount: 0, grandTotal: 499 * 1.18, status: 'sent', validUntil: getDate(7), notes: 'Standard broadband quotation valid for 7 days.', createdAt: getDate(-1) },
  { id: 2, organizationId: MOCK_ORGANIZATION_ID, quotationNumber: 'QTN-2026-002', customerId: 2, customerName: 'Naresh', items: [{ productId: 2, productName: 'POS License - Retail', quantity: 1, unitPrice: 1999, taxRate: 18, discount: 10, lineTotal: 1999 * 0.9 * 1.18 }], subtotal: 1999, taxTotal: 1999 * 0.9 * 0.18, discountAmount: 199.9, grandTotal: 1999 * 0.9 * 1.18, status: 'draft', validUntil: getDate(14), notes: 'Includes 10% promotional discount.', createdAt: getDate(0) },
];

let quotationsData: Quotation[] = [...ispQuotations, ...getIndustryQuotations()];
let nextId = Math.max(0, ...quotationsData.map((q) => q.id)) + 1;

function generateQuotationNumber(): string {
  const year = new Date().getFullYear();
  const num = String(nextId).padStart(3, '0');
  return `QTN-${year}-${num}`;
}

function mapQuotation(raw: Record<string, unknown>): Quotation {
  const q = toCamelCase<Record<string, unknown>>(raw);
  return {
    ...toCamelCase<Quotation>(raw),
    quotationNumber: String(q.quotationNumber ?? q.documentNumber ?? ''),
  };
}

export const quotationsApi = {
  getAll: async (): Promise<Quotation[]> => {
    if (isMockMode()) {
      const orgId = getCurrentOrgId();
      return Promise.resolve(quotationsData.filter((q) => q.organizationId === orgId));
    }
    const response = await apiClient.get(endpoints.documents, { params: { kind: 'quotation' } });
    const list = unwrapApiData<Record<string, unknown>[]>(response);
    return (Array.isArray(list) ? list : []).map(mapQuotation);
  },
  getById: async (id: number): Promise<Quotation> => {
    if (isMockMode()) {
      const q = quotationsData.find((x) => x.id === id);
      if (!q) throw new Error('Quotation not found');
      return Promise.resolve(q);
    }
    const response = await apiClient.get(`${endpoints.documents}/${id}`);
    return mapQuotation(unwrapApiData<Record<string, unknown>>(response));
  },
  create: async (quotation: Omit<Quotation, 'id' | 'createdAt' | 'quotationNumber'>): Promise<Quotation> => {
    if (isMockMode()) {
      const newQuotation: Quotation = {
        ...quotation,
        organizationId: quotation.organizationId ?? getCurrentOrgId(),
        id: nextId++,
        quotationNumber: generateQuotationNumber(),
        createdAt: new Date().toISOString(),
      };
      quotationsData.push(newQuotation);
      return Promise.resolve(newQuotation);
    }
    const response = await apiClient.post(endpoints.documents, toSnakeCase({
      kind: 'quotation',
      documentNumber: generateQuotationNumber(),
      ...quotation,
    } as Record<string, unknown>));
    return mapQuotation(unwrapApiData<Record<string, unknown>>(response));
  },
  update: async (id: number, data: Partial<Quotation>): Promise<Quotation> => {
    if (isMockMode()) {
      const idx = quotationsData.findIndex((x) => x.id === id);
      if (idx === -1) throw new Error('Quotation not found');
      quotationsData[idx] = { ...quotationsData[idx], ...data };
      return Promise.resolve(quotationsData[idx]);
    }
    const response = await apiClient.patch(`${endpoints.documents}/${id}`, toSnakeCase(data as Record<string, unknown>));
    return mapQuotation(unwrapApiData<Record<string, unknown>>(response));
  },
  updateStatus: async (id: number, status: QuotationStatus): Promise<Quotation> => {
    return quotationsApi.update(id, { status });
  },
  delete: async (id: number): Promise<void> => {
    if (isMockMode()) {
      quotationsData = quotationsData.filter((x) => x.id !== id);
      return Promise.resolve();
    }
    await apiClient.delete(`${endpoints.documents}/${id}`);
  },
};
