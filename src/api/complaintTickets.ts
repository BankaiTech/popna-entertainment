/** Staff Complaints page: office raises / assigns / closes; technicians see and fix their own. */
import apiClient from '@/lib/apiClient';
import { isMockMode, toCamelCase } from '@/lib/apiHelpers';
import type { ComplaintCategory } from './customerPortal';

export type TicketStatus = 'open' | 'assigned' | 'resolved' | 'cancelled';

export interface Ticket {
  id: number;
  ticketNo: string;
  customerId: number;
  customerName: string;
  customerMobile: string;
  customerArea: string;
  customerStb: string;
  customerAddress: string;
  planName: string;
  category: ComplaintCategory;
  categoryLabel: string;
  description: string;
  status: TicketStatus;
  raisedByCustomer: boolean;
  assignedTo: number | null;
  assignedToName: string;
  assignedAt: string | null;
  resolvedAt: string | null;
  resolutionNote: string;
  createdAt: string;
  updates: { action: string; note: string; by: string; byCustomer: boolean; createdAt: string }[];
}

let demo: Ticket[] = [];

const post = async (url: string, body: Record<string, unknown> = {}): Promise<Ticket> =>
  toCamelCase<Ticket>((await apiClient.post(url, body)).data);

export const ticketsApi = {
  list: async (params: { status?: string; open?: boolean } = {}): Promise<Ticket[]> => {
    if (isMockMode()) return demo;
    const r = await apiClient.get('/complaints', {
      params: { ...(params.status ? { status: params.status } : {}), ...(params.open ? { open: 1 } : {}) },
    });
    const data = r.data?.results ?? r.data;
    return toCamelCase<Ticket[]>(Array.isArray(data) ? data : []);
  },
  create: async (customerId: number, category: ComplaintCategory, description: string): Promise<Ticket> => {
    if (isMockMode()) {
      const t = { id: demo.length + 1, ticketNo: `C${String(demo.length + 1).padStart(5, '0')}`, customerId,
        customerName: `#${customerId}`, customerMobile: '', customerArea: '', customerStb: '', customerAddress: '', planName: '', category,
        categoryLabel: category, description, status: 'open', raisedByCustomer: false, assignedTo: null,
        assignedToName: '', assignedAt: null, resolvedAt: null, resolutionNote: '',
        createdAt: new Date().toISOString(), updates: [] } as Ticket;
      demo = [t, ...demo];
      return t;
    }
    return post('/complaints', { customer_id: customerId, category, description });
  },
  assign: (id: number, userId: number) => post(`/complaints/${id}/assign`, { user_id: userId }),
  resolve: (id: number, note: string) => post(`/complaints/${id}/resolve`, { note }),
  reopen: (id: number, note = '') => post(`/complaints/${id}/reopen`, { note }),
  cancel: (id: number, note: string) => post(`/complaints/${id}/cancel`, { note }),
};
