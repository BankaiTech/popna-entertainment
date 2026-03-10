// API ready - replace mock with real backend
// Replace with real backend API later
import type { ConnectionRequest, ConnectionRequestStatus } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';

// Mock data initialization - API ready structure
const generateMockConnectionRequests = (): ConnectionRequest[] => {
  const now = new Date();
  const requests: ConnectionRequest[] = [];

  // Generate 20+ realistic mock entries
  const names = [
    'Rajesh Kumar', 'Naresh', 'Amit Patel', 'Sneha Reddy', 'Vikram Singh',
    'Anjali Mehta', 'Rahul Gupta', 'Kavita Desai', 'Suresh Iyer', 'Meera Nair',
    'Arjun Menon', 'Divya Krishnan', 'Kiran Pillai', 'Lakshmi Nair', 'Gopal Rao',
    'Sunita Devi', 'Mohan Das', 'Sarita Joshi', 'Naveen Kumar', 'Rekha Agarwal',
    'Deepak Malhotra', 'Shilpa Bansal', 'Ravi Verma', 'Neha Kapoor', 'Ajay Tiwari'
  ];

  const mobiles = [
    '9876543210', '9876543211', '9876543212', '9876543213', '9876543214',
    '9876543215', '9876543216', '9876543217', '9876543218', '9876543219',
    '9876543220', '9876543221', '9876543222', '9876543223', '9876543224',
    '9876543225', '9876543226', '9876543227', '9876543228', '9876543229',
    '9876543230', '9876543231', '9876543232', '9876543233', '9876543234'
  ];

  const emails = [
    'rajesh.kumar@email.com', 'priya.sharma@email.com', 'amit.patel@email.com',
    'sneha.reddy@email.com', 'vikram.singh@email.com', 'anjali.mehta@email.com',
    'rahul.gupta@email.com', 'kavita.desai@email.com', 'suresh.iyer@email.com',
    'meera.nair@email.com', 'arjun.menon@email.com', 'divya.krishnan@email.com',
    'kiran.pillai@email.com', 'lakshmi.nair@email.com', 'gopal.rao@email.com',
    'sunita.devi@email.com', 'mohan.das@email.com', 'sarita.joshi@email.com',
    'naveen.kumar@email.com', 'rekha.agarwal@email.com', 'deepak.malhotra@email.com',
    'shilpa.bansal@email.com', 'ravi.verma@email.com', 'neha.kapoor@email.com', 'ajay.tiwari@email.com'
  ];

  // Product display names updated to generic labels (productId unchanged)
  const plans = [
    { id: 1, name: 'Cable Basic 50 Mbps', productId: 1, productName: 'Cable' },
    { id: 2, name: 'Cable Premium 100 Mbps', productId: 1, productName: 'Cable' },
    { id: 3, name: 'Cable Ultra 200 Mbps', productId: 1, productName: 'Cable' },
    { id: 4, name: 'Internet 1 Fiber Basic', productId: 2, productName: 'Internet 1' },
    { id: 5, name: 'Internet 1 Fiber Premium', productId: 2, productName: 'Internet 1' },
    { id: 6, name: 'Internet 1 Fiber Ultra', productId: 2, productName: 'Internet 1' },
    { id: 7, name: 'Internet 2 Basic Plan', productId: 3, productName: 'Internet 2' },
    { id: 8, name: 'Internet 2 Premium Plan', productId: 3, productName: 'Internet 2' },
    { id: 9, name: 'Internet 3 Basic', productId: 4, productName: 'Internet 3' },
    { id: 10, name: 'Internet 3 Premium', productId: 4, productName: 'Internet 3' },
  ];

  // Status assignment is inline - no statuses array needed

  for (let i = 0; i < 25; i++) {
    const plan = plans[i % plans.length];
    const daysAgo = Math.floor(Math.random() * 30); // Random date within last 30 days
    const requestedAt = new Date(now);
    requestedAt.setDate(requestedAt.getDate() - daysAgo);

    // Weight statuses: 60% New, 40% Converted
    let status: ConnectionRequestStatus;
    const rand = Math.random();
    if (rand < 0.6) {
      status = 'New';
    } else {
      status = 'Converted';
    }

    requests.push({
      id: i + 1,
      organizationId: MOCK_ORGANIZATION_ID,
      name: names[i],
      mobile: mobiles[i],
      email: emails[i],
      packageId: plan.id,
      productId: plan.productId,
      planName: plan.name,
      productName: plan.productName,
      status: status,
      createdAt: requestedAt.toISOString(),
    });
  }

  // Sort by date (newest first)
  return requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

// In-memory storage for mock data (simulates backend)
let connectionRequestsData: ConnectionRequest[] = generateMockConnectionRequests();

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
   * API ready - replace mock with real backend
   * Backend will handle WhatsApp & Email sending
   */
  create: async (payload: CreateConnectionRequestPayload): Promise<ConnectionRequest> => {
    const newRequest: ConnectionRequest = {
      id: connectionRequestsData.length > 0
        ? Math.max(...connectionRequestsData.map((r) => r.id), 0) + 1
        : 1,
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
   * API ready - replace mock with real backend
   */
  getAll: async (): Promise<ConnectionRequest[]> => {
    return Promise.resolve([...connectionRequestsData]);
  },

  /**
   * Get connection request by ID
   * API ready - replace mock with real backend
   */
  getById: async (id: number): Promise<ConnectionRequest> => {
    const request = connectionRequestsData.find((r) => r.id === id);
    if (!request) throw new Error('Connection request not found');
    return Promise.resolve(request);
  },

  /**
   * Update connection request status
   * API ready - replace mock with real backend
   */
  updateStatus: async (id: number, status: ConnectionRequestStatus): Promise<ConnectionRequest> => {
    const index = connectionRequestsData.findIndex((r) => r.id === id);
    if (index === -1) throw new Error('Connection request not found');
    connectionRequestsData[index] = { ...connectionRequestsData[index], status };
    return Promise.resolve(connectionRequestsData[index]);
  },

  /**
   * Delete connection request
   * API ready - replace mock with real backend
   */
  delete: async (id: number): Promise<void> => {
    const index = connectionRequestsData.findIndex((r) => r.id === id);
    if (index === -1) throw new Error('Connection request not found');
    connectionRequestsData.splice(index, 1);
    return Promise.resolve();
  },
};
