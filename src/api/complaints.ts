// Multi-tenant ready - backend will enforce org isolation
import type { Complaint } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
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
    const orgId = getCurrentOrgId();
    return Promise.resolve(complaintsData.filter((c) => c.organizationId === orgId));
  },
  getById: async (id: number): Promise<Complaint> => {
    const complaint = complaintsData.find((c) => c.id === id);
    if (!complaint) throw new Error('Complaint not found');
    return Promise.resolve(complaint);
  },
  create: async (complaint: Omit<Complaint, 'id' | 'createdAt'>): Promise<Complaint> => {
    const newComplaint: Complaint = {
      ...complaint,
      organizationId: complaint.organizationId ?? getCurrentOrgId(),
      id: Math.max(...complaintsData.map((c) => c.id), 0) + 1,
      createdAt: new Date().toISOString(),
    };
    complaintsData.push(newComplaint);
    return Promise.resolve(newComplaint);
  },
  update: async (id: number, complaint: Partial<Complaint>): Promise<Complaint> => {
    const index = complaintsData.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('Complaint not found');
    complaintsData[index] = { ...complaintsData[index], ...complaint };
    return Promise.resolve(complaintsData[index]);
  },
  delete: async (id: number): Promise<void> => {
    const index = complaintsData.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('Complaint not found');
    complaintsData.splice(index, 1);
    return Promise.resolve();
  },
  getActiveCount: async (): Promise<number> => {
    const orgId = getCurrentOrgId();
    return Promise.resolve(complaintsData.filter((c) => c.organizationId === orgId && c.status === 'active').length);
  },
};
