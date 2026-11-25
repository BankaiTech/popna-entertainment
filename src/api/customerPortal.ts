/**
 * Customer app (cable / internet subscriber). Login with mobile + box number.
 * Uses its own customer token: the server refuses it everywhere except /customer/*.
 */
import apiClient from '@/lib/apiClient';
import { isMockMode, toCamelCase } from '@/lib/apiHelpers';

export interface PortalBill {
  id: number;
  period: string;
  dueDate: string;
  amountDue: string;
  amountPaid: string;
  discount: string;
  balance: string;
  status: 'unpaid' | 'partial' | 'paid' | 'cancelled';
}

export interface PortalPayment {
  id: number;
  receiptNo: string;
  amount: string;
  discount: string;
  method: string;
  collectedAt: string;
}

export interface PortalProfile {
  id: number;
  name: string;
  mobile: string;
  area: string;
  stbNumber: string;
  category: 'cable' | 'internet';
  plan: string;
  provider: string;
  monthlyAmount: string;
  validUntil: string | null;
  serviceStatus: string;
  currentBill: PortalBill | null;
  operator: { name: string; phone: string; upiId: string; upiPayeeName: string; appLanguage: string };
}

export type ComplaintCategory =
  'no_signal' | 'no_internet' | 'slow_internet' | 'box' | 'cable' | 'billing' | 'other';

export interface PortalComplaint {
  id: number;
  ticketNo: string;
  category: ComplaintCategory;
  categoryLabel: string;
  description: string;
  status: 'open' | 'assigned' | 'resolved' | 'cancelled';
  technician: string;
  resolutionNote: string;
  createdAt: string;
  resolvedAt: string | null;
  updates: { action: string; note: string; at: string }[];
}

export interface PortalLogin {
  access: string;
  refresh: string;
  customer: PortalProfile;
}

// ---- demo data for mock mode (VITE_USE_MOCK_API=true) ----
const today = new Date();
const iso = (d: Date) => d.toISOString().slice(0, 10);
const monthStart = (offset: number) => iso(new Date(today.getFullYear(), today.getMonth() - offset, 1));
const demoBill: PortalBill = {
  id: 1, period: monthStart(0), dueDate: iso(new Date(today.getFullYear(), today.getMonth(), 15)),
  amountDue: '230.00', amountPaid: '0.00', discount: '0.00', balance: '230.00', status: 'unpaid',
};
const demoProfile: PortalProfile = {
  id: 1, name: 'Ravi', mobile: '9876543210', area: 'Main Road', stbNumber: '832B0051B347', category: 'cable',
  plan: 'TAMIL PRIME', provider: 'GTPL HATHWAY LIMITED', monthlyAmount: '230.00', validUntil: null,
  serviceStatus: 'due', currentBill: demoBill,
  operator: { name: 'Demo Cable', phone: '9876500000', upiId: '', upiPayeeName: 'Demo Cable', appLanguage: 'ta' },
};
let demoComplaints: PortalComplaint[] = [];

export const customerPortalApi = {
  login: async (mobile: string, boxNumber: string): Promise<PortalLogin> => {
    if (isMockMode()) {
      if (mobile.replace(/\D/g, '').slice(-10) !== demoProfile.mobile || !boxNumber.trim()) {
        throw new Error('Mobile number or box number is not correct.');
      }
      return { access: 'demo', refresh: 'demo', customer: demoProfile };
    }
    const r = await apiClient.post('/customer/auth/login', { mobile, box_number: boxNumber });
    return toCamelCase<PortalLogin>(r.data);
  },

  logout: async (refresh: string | null) => {
    if (isMockMode() || !refresh) return;
    await apiClient.post('/customer/auth/logout', { refresh });
  },

  me: async (): Promise<PortalProfile> => {
    if (isMockMode()) return demoProfile;
    return toCamelCase<PortalProfile>((await apiClient.get('/customer/me')).data);
  },

  bills: async (): Promise<(PortalBill & { payments: PortalPayment[] })[]> => {
    if (isMockMode()) {
      return [
        { ...demoBill, payments: [] },
        { ...demoBill, id: 2, period: monthStart(1), amountPaid: '230.00', balance: '0.00', status: 'paid',
          payments: [{ id: 1, receiptNo: 'R-00012', amount: '230.00', discount: '0.00', method: 'cash',
            collectedAt: new Date(today.getFullYear(), today.getMonth() - 1, 5).toISOString() }] },
      ];
    }
    return toCamelCase((await apiClient.get('/customer/bills')).data);
  },

  complaints: async (): Promise<PortalComplaint[]> => {
    if (isMockMode()) return demoComplaints;
    return toCamelCase((await apiClient.get('/customer/complaints')).data);
  },

  raiseComplaint: async (category: ComplaintCategory, description: string): Promise<PortalComplaint> => {
    if (isMockMode()) {
      const c: PortalComplaint = {
        id: demoComplaints.length + 1, ticketNo: `C${String(demoComplaints.length + 1).padStart(5, '0')}`,
        category, categoryLabel: category, description, status: 'open', technician: '', resolutionNote: '',
        createdAt: new Date().toISOString(), resolvedAt: null,
        updates: [{ action: 'raised', note: '', at: new Date().toISOString() }],
      };
      demoComplaints = [c, ...demoComplaints];
      return c;
    }
    return toCamelCase((await apiClient.post('/customer/complaints', { category, description })).data);
  },

  cancelComplaint: async (id: number): Promise<PortalComplaint> => {
    if (isMockMode()) {
      demoComplaints = demoComplaints.map((c) => (c.id === id ? { ...c, status: 'cancelled' } : c));
      return demoComplaints.find((c) => c.id === id)!;
    }
    return toCamelCase((await apiClient.post(`/customer/complaints/${id}/cancel`)).data);
  },
};
