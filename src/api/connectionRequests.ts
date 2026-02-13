// API ready — replace mock with real backend
import type { ConnectionRequest, ConnectionRequestStatus } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';

// In-memory storage for mock data (simulates backend)
let connectionRequestsData: ConnectionRequest[] = [];

export interface CreateConnectionRequestPayload {
  name: string;
  mobile: string;
  email?: string;
  packageId: number;
  productId: number;
  planName: string;
  productName: string;
}

/**
 * Connection Requests API
 * Backend will handle WhatsApp & Email sending
 */
export const connectionRequestsApi = {
  /**
   * Create a new connection request
   * API ready — replace mock with real backend
   * Backend will handle WhatsApp & Email sending
   */
  create: async (payload: CreateConnectionRequestPayload): Promise<ConnectionRequest> => {
    const newRequest: ConnectionRequest = {
      id: Math.max(...connectionRequestsData.map((r) => r.id), 0) + 1,
      organizationId: MOCK_ORGANIZATION_ID,
      name: payload.name,
      mobile: payload.mobile,
      email: payload.email,
      packageId: payload.packageId,
      productId: payload.productId,
      planName: payload.planName,
      productName: payload.productName,
      status: 'New',
      createdAt: new Date().toISOString(),
    };
    connectionRequestsData.push(newRequest);
    
    // Backend will handle WhatsApp & Email sending
    // WhatsApp Template: Hello {Name}, Thank you for choosing {Plan Name}. Our team will contact you shortly.
    // Email Template: Subject: New Plan Request - {Plan Name}
    
    return Promise.resolve(newRequest);
  },

  /**
   * Get all connection requests
   * API ready — replace mock with real backend
   */
  getAll: async (): Promise<ConnectionRequest[]> => {
    return Promise.resolve([...connectionRequestsData]);
  },

  /**
   * Get connection request by ID
   * API ready — replace mock with real backend
   */
  getById: async (id: number): Promise<ConnectionRequest> => {
    const request = connectionRequestsData.find((r) => r.id === id);
    if (!request) throw new Error('Connection request not found');
    return Promise.resolve(request);
  },

  /**
   * Update connection request status
   * API ready — replace mock with real backend
   */
  updateStatus: async (id: number, status: ConnectionRequestStatus): Promise<ConnectionRequest> => {
    const index = connectionRequestsData.findIndex((r) => r.id === id);
    if (index === -1) throw new Error('Connection request not found');
    connectionRequestsData[index] = { ...connectionRequestsData[index], status };
    return Promise.resolve(connectionRequestsData[index]);
  },

  /**
   * Delete connection request
   * API ready — replace mock with real backend
   */
  delete: async (id: number): Promise<void> => {
    const index = connectionRequestsData.findIndex((r) => r.id === id);
    if (index === -1) throw new Error('Connection request not found');
    connectionRequestsData.splice(index, 1);
    return Promise.resolve();
  },
};
