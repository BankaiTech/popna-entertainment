// Replace with real API call later
import type { Complaint } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import { mockComplaints } from './mockData';
import { useAuthStore } from '@/store/useAuthStore';

// Multi-tenant ready - backend will enforce org isolation
let complaintsData: Complaint[] = [...mockComplaints];

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
    // Replace with real API call later
    const complaint = complaintsData.find((c) => c.id === id);
    if (!complaint) throw new Error('Complaint not found');
    return Promise.resolve(complaint);
  },
  create: async (complaint: Omit<Complaint, 'id' | 'createdAt'>): Promise<Complaint> => {
    const newComplaint: Complaint = {
      ...complaint,
      organizationId: complaint.organizationId ?? MOCK_ORGANIZATION_ID,
      id: Math.max(...complaintsData.map((c) => c.id), 0) + 1,
      createdAt: new Date().toISOString(),
    };
    complaintsData.push(newComplaint);
    return Promise.resolve(newComplaint);
  },
  update: async (id: number, complaint: Partial<Complaint>): Promise<Complaint> => {
    // Replace with real API call later. For closureImage, replace with backend image upload (e.g. presigned URL or multipart).
    const index = complaintsData.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('Complaint not found');
    complaintsData[index] = { ...complaintsData[index], ...complaint };
    return Promise.resolve(complaintsData[index]);
  },
  delete: async (id: number): Promise<void> => {
    // Replace with real API call later
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
