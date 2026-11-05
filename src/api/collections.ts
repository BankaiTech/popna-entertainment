/** Payments (collections) and field-staff duty tracking — Django API only. */
import apiClient from '@/lib/apiClient';
import { toCamelCase, unwrapApiData } from '@/lib/apiHelpers';
import type { GeoPoint } from '@/lib/geo';
import { endpoints } from './endpoints';

export interface PaymentReceipt {
  id: number;
  receiptNo: string;
  customerId: number;
  customerName: string;
  period: string;
  amount: string;
  discount: string;
  method: 'cash' | 'upi' | 'card' | 'other';
  collectedByName: string;
  collectedAt: string;
  status: 'valid' | 'cancelled';
  cancelReason?: string;
}

export interface CollectInput {
  customerId: number;
  amount: number;
  method: 'cash' | 'upi';
  discount?: number;
  note?: string;
  gps?: GeoPoint | null;
}

export interface DutyStatus {
  onDuty: boolean;
  session: { id: number; startedAt: string } | null;
  pingEverySeconds: number;
}

const gpsBody = (gps?: GeoPoint | null) =>
  gps ? { latitude: gps.latitude, longitude: gps.longitude, accuracy: gps.accuracy } : {};

export const paymentsApi = {
  collect: async (input: CollectInput): Promise<PaymentReceipt> => {
    const res = await apiClient.post(endpoints.payments, {
      customer_id: input.customerId,
      amount: input.amount,
      method: input.method,
      discount: input.discount ?? 0,
      note: input.note ?? '',
      ...gpsBody(input.gps),
    });
    return toCamelCase<PaymentReceipt>(unwrapApiData(res));
  },
  forCustomer: async (customerId: number): Promise<PaymentReceipt[]> => {
    const res = await apiClient.get(endpoints.payments, { params: { customer: customerId } });
    const list = unwrapApiData<unknown[]>(res);
    return (Array.isArray(list) ? list : []).map((p) => toCamelCase<PaymentReceipt>(p));
  },
  today: async (): Promise<PaymentReceipt[]> => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    const res = await apiClient.get(endpoints.payments, { params: { collected_at__date: today } });
    const list = unwrapApiData<unknown[]>(res);
    return (Array.isArray(list) ? list : []).map((p) => toCamelCase<PaymentReceipt>(p));
  },
  cancel: async (id: number, reason: string): Promise<PaymentReceipt> => {
    const res = await apiClient.post(`${endpoints.payments}/${id}/cancel`, { reason });
    return toCamelCase<PaymentReceipt>(unwrapApiData(res));
  },
};

export const dutyApi = {
  status: async (): Promise<DutyStatus> => toCamelCase<DutyStatus>(unwrapApiData(await apiClient.get('/tracking/status'))),
  checkIn: async (gps: GeoPoint) => apiClient.post('/tracking/check-in', gpsBody(gps)),
  checkOut: async (gps: GeoPoint) => apiClient.post('/tracking/check-out', gpsBody(gps)),
  ping: async (gps: GeoPoint) => apiClient.post('/tracking/ping', gpsBody(gps)),
};

export interface LiveAgent {
  userId: number;
  name: string;
  role: string;
  onDutySince: string;
  latitude: number | null;
  longitude: number | null;
  accuracyM: number | null;
  lastSeen: string | null;
  minutesSinceLastSeen: number | null;
}

export interface RoutePoint { lat: number; lng: number; at: string; source: string; accuracyM: number | null }
export interface RouteCollection {
  receiptNo: string; customer: string; amount: string; method: string; at: string; status: string;
  lat: number | null; lng: number | null;
}
export interface AgentRoute { user: { id: number; name: string }; date: string; points: RoutePoint[]; collections: RouteCollection[] }

export interface CutoffRow {
  customerId: number; name: string; mobile: string; provider: string; category: 'cable' | 'internet';
  area: string | null; boxNumber: string; since: string; balance: string | null;
}

export const trackingApi = {
  live: async (): Promise<LiveAgent[]> =>
    toCamelCase<{ agents: LiveAgent[] }>(unwrapApiData(await apiClient.get('/tracking/live'))).agents ?? [],
  route: async (userId: number, date: string): Promise<AgentRoute> =>
    toCamelCase<AgentRoute>(unwrapApiData(await apiClient.get('/tracking/route', { params: { user_id: userId, date } }))),
};

export const connectionsApi = {
  cutoff: async (): Promise<{ date: string; count: number; customers: CutoffRow[] }> =>
    toCamelCase(unwrapApiData(await apiClient.get('/connections/cutoff'))),
};
