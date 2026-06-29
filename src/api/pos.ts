import apiClient from '@/lib/apiClient';
import { isMockMode, toCamelCase, unwrapApiData } from '@/lib/apiHelpers';
import { endpoints } from './endpoints';

export interface PosTransaction {
  id: number;
  invoiceNumber: string;
  customerName?: string;
  totalAmount: number;
  status: string;
  createdAt: string;
}

function mapPosTransaction(raw: Record<string, unknown>): PosTransaction {
  const r = toCamelCase<Record<string, unknown>>(raw);
  return {
    id: Number(r.id),
    invoiceNumber: String(r.invoiceNumber ?? ''),
    customerName: r.customerName != null ? String(r.customerName) : undefined,
    totalAmount: Number(r.totalAmount ?? 0),
    status: String(r.status ?? ''),
    createdAt: String(r.createdAt ?? new Date().toISOString()),
  };
}

export const posApi = {
  getAll: async (): Promise<PosTransaction[]> => {
    if (isMockMode()) return [];
    const response = await apiClient.get(endpoints.pos);
    const list = unwrapApiData<Record<string, unknown>[]>(response);
    return (Array.isArray(list) ? list : []).map(mapPosTransaction);
  },
};
