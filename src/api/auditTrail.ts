import type { AuditEntry, AuditAction } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import { apiGetList, apiPost } from '@/api/resources';
import { useMockApi } from '@/lib/http';

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

function filterMock(filters?: AuditFilters): AuditEntry[] {
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

export const auditTrailApi = {
  getAll: async (filters?: AuditFilters): Promise<AuditEntry[]> => {
    if (useMockApi()) {
      return filterMock(filters);
    }
    const params: Record<string, unknown> = {};
    if (filters?.userId != null) params.userId = filters.userId;
    if (filters?.username) params.username = filters.username;
    if (filters?.entity) params.entityType = filters.entity;
    if (filters?.action) params.action = filters.action;
    if (filters?.fromDate) params.from = filters.fromDate;
    if (filters?.toDate) params.to = filters.toDate;
    return apiGetList<AuditEntry>('/audit-log', params);
  },
  add: async (entry: Omit<AuditEntry, 'id' | 'timestamp'>): Promise<AuditEntry> => {
    if (useMockApi()) {
      const newEntry: AuditEntry = {
        ...entry,
        id: nextId++,
        timestamp: new Date().toISOString(),
      };
      auditData.unshift(newEntry);
      return newEntry;
    }
    try {
      return await apiPost<AuditEntry>('/audit-log', entry);
    } catch {
      const newEntry: AuditEntry = {
        ...entry,
        id: nextId++,
        timestamp: new Date().toISOString(),
      };
      auditData.unshift(newEntry);
      return newEntry;
    }
  },
};
