import type { ServiceRequest } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import { useAuthStore } from '@/store/useAuthStore';
import { getIndustryServiceRequests } from './industryMockData';

function getCurrentOrgId(): string {
  return useAuthStore.getState().organizationId ?? MOCK_ORGANIZATION_ID;
}

const now = new Date().toISOString();

// ISP service requests (org_001)
const ispServiceRequests: ServiceRequest[] = [
  { id: 1, organizationId: MOCK_ORGANIZATION_ID, customerId: 1, customerName: 'Rajesh Kumar', customerMobile: '9876543210', requestType: 'Installation', description: 'New connection installation requested', priority: 'high', assignedTo: 'Tech1', status: 'in-progress', slaHours: 24, slaDeadline: '2026-03-18T10:00:00.000Z', slaBreached: false, createdAt: now },
  { id: 2, organizationId: MOCK_ORGANIZATION_ID, customerId: 2, customerName: 'Naresh', customerMobile: '9876543211', requestType: 'Repair', description: 'No signal - line check required', priority: 'critical', status: 'new', slaHours: 4, slaDeadline: '2026-03-17T18:00:00.000Z', slaBreached: false, createdAt: now },
  { id: 3, organizationId: MOCK_ORGANIZATION_ID, customerId: 1, customerName: 'Rajesh Kumar', customerMobile: '9876543210', requestType: 'Complaint', description: 'Billing discrepancy', priority: 'medium', assignedTo: 'Support1', status: 'resolved', resolution: 'Adjusted bill and credited account.', slaHours: 48, slaDeadline: '2026-03-16T12:00:00.000Z', slaBreached: false, createdAt: now },
];

let serviceRequestsData: ServiceRequest[] = [...ispServiceRequests, ...getIndustryServiceRequests()];
let nextId = Math.max(0, ...serviceRequestsData.map((r) => r.id)) + 1;

export const serviceRequestsApi = {
  getAll: async (): Promise<ServiceRequest[]> => {
    const orgId = getCurrentOrgId();
    return Promise.resolve(serviceRequestsData.filter((r) => r.organizationId === orgId));
  },
  getById: async (id: number): Promise<ServiceRequest> => {
    const item = serviceRequestsData.find((r) => r.id === id);
    if (!item) throw new Error('Service request not found');
    return Promise.resolve(item);
  },
  create: async (request: Omit<ServiceRequest, 'id' | 'createdAt'>): Promise<ServiceRequest> => {
    const deadline = request.slaHours
      ? new Date(Date.now() + request.slaHours * 60 * 60 * 1000).toISOString()
      : undefined;
    const newRequest: ServiceRequest = {
      ...request,
      organizationId: request.organizationId ?? getCurrentOrgId(),
      id: nextId++,
      slaDeadline: request.slaDeadline ?? deadline,
      createdAt: new Date().toISOString(),
    };
    serviceRequestsData.push(newRequest);
    return Promise.resolve(newRequest);
  },
  update: async (id: number, request: Partial<ServiceRequest>): Promise<ServiceRequest> => {
    const index = serviceRequestsData.findIndex((r) => r.id === id);
    if (index === -1) throw new Error('Service request not found');
    serviceRequestsData[index] = { ...serviceRequestsData[index], ...request };
    return Promise.resolve(serviceRequestsData[index]);
  },
  delete: async (id: number): Promise<void> => {
    const index = serviceRequestsData.findIndex((r) => r.id === id);
    if (index === -1) throw new Error('Service request not found');
    serviceRequestsData.splice(index, 1);
    return Promise.resolve();
  },
};
