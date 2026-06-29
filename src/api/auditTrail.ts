import type { AuditEntry, AuditAction } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import apiClient from '@/lib/apiClient';
import { isMockMode, toCamelCase, unwrapApiData } from '@/lib/apiHelpers';
import { endpoints } from './endpoints';

let auditData: AuditEntry[] = [
  {
    id: 1,
    organizationId: MOCK_ORGANIZATION_ID,
    userId: 1,
    username: 'admin',
    action: 'create',
    entity: 'SalesInvoice',
    entityId: '1',
    details: 'Invoice INV-2024-001 created',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 2,
    organizationId: MOCK_ORGANIZATION_ID,
    userId: 1,
    username: 'admin',
    action: 'update',
    entity: 'Customer',
    entityId: '2',
    details: 'Contact updated',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 3,
    organizationId: MOCK_ORGANIZATION_ID,
    userId: 1,
    username: 'admin',
    action: 'login',
    entity: 'Auth',
    details: 'User logged in',
    timestamp: new Date().toISOString(),
  },
  {
    id: 4,
    organizationId: MOCK_ORGANIZATION_ID,
    userId: 1,
    username: 'admin',
    action: 'export',
    entity: 'Report',
    details: 'Sales report exported',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
];

let nextId = 5;

export interface AuditFilters {
  userId?: number;
  username?: string;
  entity?: string;
  action?: AuditAction;
  fromDate?: string;
  toDate?: string;
}

function mapAuditEntry(raw: Record<string, unknown>): AuditEntry {
  return toCamelCase<AuditEntry>(raw);
}

export const auditTrailApi = {
  getAll: async (filters?: AuditFilters): Promise<AuditEntry[]> => {
    if (isMockMode()) {
      let list = [...auditData];
      if (filters) {
        if (filters.userId != null) list = list.filter((e) => e.userId === filters.userId);
        if (filters.username) list = list.filter((e) => e.username.toLowerCase().includes(filters.username!.toLowerCase()));
        if (filters.entity) list = list.filter((e) => e.entity === filters.entity);
        if (filters.action) list = list.filter((e) => e.action === filters.action);
        if (filters.fromDate) {
          const from = new Date(filters.fromDate);
          from.setHours(0, 0, 0, 0);
          list = list.filter((e) => new Date(e.timestamp) >= from);
        }
        if (filters.toDate) {
          const to = new Date(filters.toDate);
          to.setHours(23, 59, 59, 999);
          list = list.filter((e) => new Date(e.timestamp) <= to);
        }
      }
      return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    const response = await apiClient.get(endpoints.auditLog, { params: filters });
    const list = unwrapApiData<Record<string, unknown>[]>(response);
    return (Array.isArray(list) ? list : []).map(mapAuditEntry);
  },
  add: async (entry: Omit<AuditEntry, 'id' | 'timestamp'>): Promise<AuditEntry> => {
    if (isMockMode()) {
      const newEntry: AuditEntry = {
        ...entry,
        id: nextId++,
        timestamp: new Date().toISOString(),
      };
      auditData.unshift(newEntry);
      return newEntry;
    }
    const response = await apiClient.post(endpoints.auditLog, entry);
    return mapAuditEntry(unwrapApiData<Record<string, unknown>>(response));
  },
};
