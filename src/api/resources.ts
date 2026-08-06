/**
 * Consolidated backend resource clients (Postman collection).
 * Used by domain API modules when VITE_USE_MOCK_API=false.
 */

import apiClient from '@/lib/apiClient';
import { toSnake, unwrapList, unwrapOne } from '@/lib/http';

export async function apiGetList<T>(path: string, params?: Record<string, unknown>): Promise<T[]> {
  const { data } = await apiClient.get(path, { params: params ? toSnake(params) : undefined });
  return unwrapList<T>(data);
}

export async function apiGetOne<T>(path: string): Promise<T> {
  const { data } = await apiClient.get(path);
  return unwrapOne<T>(data);
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const { data } = await apiClient.post(path, body !== undefined ? toSnake(body) : undefined);
  return unwrapOne<T>(data);
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const { data } = await apiClient.patch(path, body !== undefined ? toSnake(body) : undefined);
  return unwrapOne<T>(data);
}

export async function apiDelete(path: string): Promise<void> {
  await apiClient.delete(path);
}

/** Activities: complaints | connection_request | appointment | service_request | lead */
export const activitiesResource = {
  list: <T>(kind?: string) => apiGetList<T>('/activities', kind ? { kind } : undefined),
  create: <T>(body: Record<string, unknown>) => apiPost<T>('/activities', body),
  get: <T>(id: number | string) => apiGetOne<T>(`/activities/${id}`),
  update: <T>(id: number | string, body: Record<string, unknown>) => apiPatch<T>(`/activities/${id}`, body),
  remove: (id: number | string) => apiDelete(`/activities/${id}`),
};

/** Documents: quotation | purchase_order | expense */
export const documentsResource = {
  list: <T>(kind?: string) => apiGetList<T>('/documents', kind ? { kind } : undefined),
  create: <T>(body: Record<string, unknown>) => apiPost<T>('/documents', body),
  get: <T>(id: number | string) => apiGetOne<T>(`/documents/${id}`),
  update: <T>(id: number | string, body: Record<string, unknown>) => apiPatch<T>(`/documents/${id}`, body),
  remove: (id: number | string) => apiDelete(`/documents/${id}`),
};

/** Inventory catalog: product | isp_category | isp_plan */
export const inventoryResource = {
  list: <T>(params?: Record<string, unknown>) => apiGetList<T>('/inventory', params),
  create: <T>(body: Record<string, unknown>) => apiPost<T>('/inventory', body),
  get: <T>(id: number | string) => apiGetOne<T>(`/inventory/${id}`),
  update: <T>(id: number | string, body: Record<string, unknown>) => apiPatch<T>(`/inventory/${id}`, body),
  remove: (id: number | string) => apiDelete(`/inventory/${id}`),
  lowStock: <T>() => apiGetList<T>('/inventory/low-stock'),
};

/** Invoices: sales | purchase */
export const invoicesResource = {
  list: <T>(kind?: string) => apiGetList<T>('/invoices', kind ? { kind } : undefined),
  create: <T>(body: Record<string, unknown>) => apiPost<T>('/invoices', body),
  get: <T>(id: number | string) => apiGetOne<T>(`/invoices/${id}`),
  update: <T>(id: number | string, body: Record<string, unknown>) => apiPatch<T>(`/invoices/${id}`, body),
  remove: (id: number | string) => apiDelete(`/invoices/${id}`),
};
