/**
 * Staff Complaints page.
 * Office (owner / manager): raise, assign to one person (or back to everyone), close, reopen.
 * Field staff: see complaints nobody has taken plus their own; take one ("I will go"); mark fixed with GPS.
 */
import apiClient from '@/lib/apiClient';
import { isMockMode, toCamelCase } from '@/lib/apiHelpers';
import type { GeoPoint } from '@/lib/geo';
import type { ComplaintCategory } from './customerPortal';

export type TicketStatus = 'open' | 'assigned' | 'resolved' | 'cancelled';
export type TicketAction = 'raised' | 'assigned' | 'unassigned' | 'taken' | 'resolved' | 'reopened' | 'cancelled';

export interface TicketUpdate { action: TicketAction; note: string; by: string; byCustomer: boolean; createdAt: string }

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
  resolvedByName: string;
  resolutionNote: string;
  /** Where the phone was when it was marked fixed (null when closed from the office). */
  resolvedLatitude: string | null;
  resolvedLongitude: string | null;
  resolvedAccuracyM: number | null;
  createdAt: string;
  updates: TicketUpdate[];
}

/** Tabs. Office: by status. Field staff: open for all / mine / done. */
export type TicketTab =
  | 'open' | 'unassigned' | 'assigned' | 'resolved' | 'cancelled' | 'all'
  | 'pool' | 'mine' | 'done';

export interface OfficeSummary { counts: Record<TicketStatus, number>; open: number; unassigned: number }
export interface FieldSummary { unassigned: number; mineOpen: number; mineClosed: number }

let demo: Ticket[] = [];

const post = async (url: string, body: Record<string, unknown> = {}): Promise<Ticket> =>
  toCamelCase<Ticket>((await apiClient.post(url, body)).data);

const tabParams = (tab: TicketTab): Record<string, string | number> => {
  switch (tab) {
    case 'open': return { open: 1 };
    case 'unassigned':
    case 'pool': return { unassigned: 1 };
    case 'assigned': return { status: 'assigned' };
    case 'resolved': return { status: 'resolved' };
    case 'cancelled': return { status: 'cancelled' };
    case 'mine': return { mine: 1, open: 1 };
    case 'done': return { mine: 1 };
    default: return {};
  }
};

export const isOpenTicket = (t: Pick<Ticket, 'status'>) => t.status === 'open' || t.status === 'assigned';

/**
 * True when this ticket still belongs in the tab (after an action changed it).
 * Field staff only ever get their own assigned tickets back, so "assigned" means "mine" for them.
 */
export function ticketInTab(t: Ticket, tab: TicketTab): boolean {
  const open = isOpenTicket(t);
  switch (tab) {
    case 'open': return open;
    case 'unassigned':
    case 'pool': return t.status === 'open' && !t.assignedTo;
    case 'assigned': return t.status === 'assigned';
    case 'resolved': return t.status === 'resolved';
    case 'cancelled': return t.status === 'cancelled';
    case 'mine': return open && !!t.assignedTo;
    case 'done': return !open;
    default: return true;
  }
}

export const ticketsApi = {
  list: async (tab: TicketTab): Promise<Ticket[]> => {
    if (isMockMode()) return demo;
    const r = await apiClient.get('/complaints', { params: tabParams(tab) });
    const data = r.data?.results ?? r.data;
    let rows = toCamelCase<Ticket[]>(Array.isArray(data) ? data : []);
    if (tab === 'done') rows = rows.filter((t) => !isOpenTicket(t));
    return rows;
  },
  get: async (id: number): Promise<Ticket> => toCamelCase<Ticket>((await apiClient.get(`/complaints/${id}`)).data),
  summary: async (): Promise<OfficeSummary | FieldSummary | null> => {
    if (isMockMode()) return null;
    return toCamelCase<OfficeSummary | FieldSummary>((await apiClient.get('/complaints/summary')).data);
  },
  create: async (customerId: number, category: ComplaintCategory, description: string): Promise<Ticket> => {
    if (isMockMode()) {
      const t = { id: demo.length + 1, ticketNo: `C${String(demo.length + 1).padStart(5, '0')}`, customerId,
        customerName: `#${customerId}`, customerMobile: '', customerArea: '', customerStb: '', customerAddress: '', planName: '', category,
        categoryLabel: category, description, status: 'open', raisedByCustomer: false, assignedTo: null,
        assignedToName: '', assignedAt: null, resolvedAt: null, resolvedByName: '', resolutionNote: '',
        resolvedLatitude: null, resolvedLongitude: null, resolvedAccuracyM: null,
        createdAt: new Date().toISOString(), updates: [] } as Ticket;
      demo = [t, ...demo];
      return t;
    }
    return post('/complaints', { customer_id: customerId, category, description });
  },
  /** userId null = not assigned (every field staff member sees it). */
  assign: (id: number, userId: number | null, note = '') => post(`/complaints/${id}/assign`, { user_id: userId, note }),
  take: (id: number) => post(`/complaints/${id}/take`),
  resolve: (id: number, note: string, where: GeoPoint | null) => post(`/complaints/${id}/resolve`, {
    note,
    ...(where ? { latitude: where.latitude, longitude: where.longitude, accuracy: Math.min(Math.round(where.accuracy), 100000) } : {}),
  }),
  reopen: (id: number, note = '') => post(`/complaints/${id}/reopen`, { note }),
  cancel: (id: number, note: string) => post(`/complaints/${id}/cancel`, { note }),
};
