// Multi-tenant ready - backend will enforce org isolation
import type { Complaint } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import { activitiesResource } from '@/api/resources';
import { useMockApi } from '@/lib/http';
import { mockComplaints } from './mockData';
import { getIndustryComplaints } from './industryMockData';
import { useAuthStore } from '@/store/useAuthStore';

let complaintsData: Complaint[] = [...mockComplaints, ...getIndustryComplaints()];

function getCurrentOrgId(): string {
  const { organizationId } = useAuthStore.getState();
  return organizationId ?? MOCK_ORGANIZATION_ID;
}

export const complaintsApi = {
  getAll: async (): Promise<Complaint[]> => {
    if (useMockApi()) {
      const orgId = getCurrentOrgId();
      return Promise.resolve(complaintsData.filter((c) => c.organizationId === orgId));
    }
    return activitiesResource.list<Complaint>('complaint');
  },
  getById: async (id: number): Promise<Complaint> => {
    if (useMockApi()) {
      const complaint = complaintsData.find((c) => c.id === id);
      if (!complaint) throw new Error('Complaint not found');
      return Promise.resolve(complaint);
    }
    return activitiesResource.get<Complaint>(id);
  },
  create: async (complaint: Omit<Complaint, 'id' | 'createdAt'>): Promise<Complaint> => {
    if (useMockApi()) {
      const newComplaint: Complaint = {
        ...complaint,
        organizationId: complaint.organizationId ?? getCurrentOrgId(),
        id: Math.max(...complaintsData.map((c) => c.id), 0) + 1,
        createdAt: new Date().toISOString(),
      };
      complaintsData.push(newComplaint);
      return Promise.resolve(newComplaint);
    }
    return activitiesResource.create<Complaint>({
      kind: 'complaint',
      title: complaint.customerDescription || complaint.customerName,
      ...complaint,
    });
  },
  update: async (id: number, complaint: Partial<Complaint>): Promise<Complaint> => {
    if (useMockApi()) {
      const index = complaintsData.findIndex((c) => c.id === id);
      if (index === -1) throw new Error('Complaint not found');
      complaintsData[index] = { ...complaintsData[index], ...complaint };
      return Promise.resolve(complaintsData[index]);
    }
    return activitiesResource.update<Complaint>(id, { ...complaint });
  },
  delete: async (id: number): Promise<void> => {
    if (useMockApi()) {
      const index = complaintsData.findIndex((c) => c.id === id);
      if (index === -1) throw new Error('Complaint not found');
      complaintsData.splice(index, 1);
      return Promise.resolve();
    }
    await activitiesResource.remove(id);
  },
  getActiveCount: async (): Promise<number> => {
    if (useMockApi()) {
      const orgId = getCurrentOrgId();
      return Promise.resolve(complaintsData.filter((c) => c.organizationId === orgId && c.status === 'active').length);
    }
    const list = await activitiesResource.list<Complaint>('complaint');
    return list.filter((c) => c.status === 'active').length;
  },
};
