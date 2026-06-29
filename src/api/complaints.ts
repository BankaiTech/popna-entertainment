// Multi-tenant ready - backend: /activities
import type { Complaint } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import apiClient from '@/lib/apiClient';
import { isMockMode, toCamelCase, toSnakeCase, unwrapApiData } from '@/lib/apiHelpers';
import { mockComplaints } from './mockData';
import { getIndustryComplaints } from './industryMockData';
import { useAuthStore } from '@/store/useAuthStore';
import { endpoints } from './endpoints';

let complaintsData: Complaint[] = [...mockComplaints, ...getIndustryComplaints()];

function getCurrentOrgId(): string {
  const { organizationId } = useAuthStore.getState();
  return organizationId ?? MOCK_ORGANIZATION_ID;
}

function mapComplaint(raw: Record<string, unknown>): Complaint {
  return toCamelCase<Complaint>(raw);
}

export const complaintsApi = {
  getAll: async (): Promise<Complaint[]> => {
    if (isMockMode()) {
      const orgId = getCurrentOrgId();
      return Promise.resolve(complaintsData.filter((c) => c.organizationId === orgId));
    }
    const response = await apiClient.get(endpoints.activities, { params: { kind: 'complaint' } });
    const list = unwrapApiData<Record<string, unknown>[]>(response);
    return (Array.isArray(list) ? list : []).map(mapComplaint);
  },
  getById: async (id: number): Promise<Complaint> => {
    if (isMockMode()) {
      const complaint = complaintsData.find((c) => c.id === id);
      if (!complaint) throw new Error('Complaint not found');
      return Promise.resolve(complaint);
    }
    const response = await apiClient.get(`${endpoints.activities}/${id}`);
    return mapComplaint(unwrapApiData<Record<string, unknown>>(response));
  },
  create: async (complaint: Omit<Complaint, 'id' | 'createdAt'>): Promise<Complaint> => {
    if (isMockMode()) {
      const newComplaint: Complaint = {
        ...complaint,
        organizationId: complaint.organizationId ?? getCurrentOrgId(),
        id: Math.max(...complaintsData.map((c) => c.id), 0) + 1,
        createdAt: new Date().toISOString(),
      };
      complaintsData.push(newComplaint);
      return Promise.resolve(newComplaint);
    }
    const response = await apiClient.post(endpoints.activities, toSnakeCase({
      kind: 'complaint',
      title: complaint.customerDescription ?? complaint.customerName ?? 'Complaint',
      ...complaint,
    } as Record<string, unknown>));
    return mapComplaint(unwrapApiData<Record<string, unknown>>(response));
  },
  update: async (id: number, complaint: Partial<Complaint>): Promise<Complaint> => {
    if (isMockMode()) {
      const index = complaintsData.findIndex((c) => c.id === id);
      if (index === -1) throw new Error('Complaint not found');
      complaintsData[index] = { ...complaintsData[index], ...complaint };
      return Promise.resolve(complaintsData[index]);
    }
    const response = await apiClient.patch(`${endpoints.activities}/${id}`, toSnakeCase(complaint as Record<string, unknown>));
    return mapComplaint(unwrapApiData<Record<string, unknown>>(response));
  },
  delete: async (id: number): Promise<void> => {
    if (isMockMode()) {
      const index = complaintsData.findIndex((c) => c.id === id);
      if (index === -1) throw new Error('Complaint not found');
      complaintsData.splice(index, 1);
      return Promise.resolve();
    }
    await apiClient.delete(`${endpoints.activities}/${id}`);
  },
  getActiveCount: async (): Promise<number> => {
    if (isMockMode()) {
      const orgId = getCurrentOrgId();
      return Promise.resolve(complaintsData.filter((c) => c.organizationId === orgId && c.status === 'active').length);
    }
    const complaints = await complaintsApi.getAll();
    return complaints.filter((c) => c.status === 'active').length;
  },
};
