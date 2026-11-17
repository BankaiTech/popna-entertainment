/**
 * LCO Desk's own billing of operators: SMS packs, subscription renewal, UPI payment claims.
 * Amounts are always worked out by the server from the operator's own rates.
 */
import apiClient from '@/lib/apiClient';
import { toCamelCase, unwrapApiData } from '@/lib/apiHelpers';

export type UpiApp = 'gpay' | 'phonepe' | 'paytm' | 'bhim';
export const UPI_APPS: { id: UpiApp; label: string }[] = [
  { id: 'gpay', label: 'Google Pay' },
  { id: 'phonepe', label: 'PhonePe' },
  { id: 'paytm', label: 'Paytm' },
  { id: 'bhim', label: 'BHIM' },
];

export type PaymentKind = 'sms' | 'renewal';
export type PaymentStatus = 'pending' | 'approved' | 'rejected';

export interface PlatformPayment {
  id: number;
  organization: number;
  organizationName: string;
  organizationCode: string;
  kind: PaymentKind;
  quantity: number;
  rate: string;
  amount: string;
  upiApp: string;
  utr: string;
  status: PaymentStatus;
  adminNote: string;
  createdByName: string;
  createdAt: string;
  decidedAt: string | null;
}

export interface MyPlan {
  organizationId: number;
  organizationName: string;
  subscription: {
    start: string | null;
    end: string | null;
    state: 'active' | 'expired' | 'not_started';
    daysLeft: number | null;
    monthlyFee: string | null;
  };
  sms: {
    freeLimit: number;
    freeUsed: number;
    creditsUsed: number;
    creditsLeft: number;
    blocked: number;
    rate: string;
  };
  estimate: {
    cableCustomers: number;
    internetCustomers: number;
    internetReceiptsOn: boolean;
    internetRemindersOn: boolean;
    reminderStages: number;
    receipts: number;
    reminders: number;
    total: number;
    free: number;
    extra: number;
    extraCost: string;
  };
  pay: {
    payeeName: string;
    upiIds: Record<UpiApp, string>;
    smsNote: string;
    renewalNote: string;
  };
  payments: PlatformPayment[];
}

const asList = <T,>(data: unknown): T[] =>
  (Array.isArray(data) ? data : (data as { results?: unknown[] })?.results ?? []) as T[];

export const platformBillingApi = {
  myPlan: async (): Promise<MyPlan> => {
    const raw = unwrapApiData<Record<string, unknown>>(await apiClient.get('/my-plan'));
    // upi_ids keys are app names; keep them as they are.
    const upiIds = (raw.pay as { upi_ids?: Record<UpiApp, string> })?.upi_ids;
    const plan = toCamelCase<MyPlan>(raw);
    if (upiIds) plan.pay.upiIds = upiIds;
    return plan;
  },

  /** Operator: "I have paid" with the UTR from the payment app. */
  claim: async (body: { kind: PaymentKind; quantity: number; upiApp: UpiApp; utr: string }): Promise<PlatformPayment> =>
    toCamelCase<PlatformPayment>(unwrapApiData(await apiClient.post('/platform-payments', {
      kind: body.kind, quantity: body.quantity, upi_app: body.upiApp, utr: body.utr,
    }))),

  /** Operator: own payments. App owner: all payments (optionally by status). */
  list: async (status?: PaymentStatus): Promise<PlatformPayment[]> =>
    asList<Record<string, unknown>>(unwrapApiData(await apiClient.get('/platform-payments', { params: status ? { status } : {} })))
      .map((p) => toCamelCase<PlatformPayment>(p)),

  approve: async (id: number): Promise<PlatformPayment> =>
    toCamelCase<PlatformPayment>(unwrapApiData(await apiClient.post(`/platform-payments/${id}/approve`, {}))),

  reject: async (id: number, note: string): Promise<PlatformPayment> =>
    toCamelCase<PlatformPayment>(unwrapApiData(await apiClient.post(`/platform-payments/${id}/reject`, { note }))),

  pendingCount: async (): Promise<number> =>
    Number(unwrapApiData<{ pending: number }>(await apiClient.get('/platform-payments/summary'))?.pending ?? 0),
};

/** Fired after the app owner approves/rejects, so the menu badge can refresh. */
export const PAYMENTS_CHANGED_EVENT = 'lcodesk:payments-changed';

const isIos = () => /iPhone|iPad|iPod/i.test(navigator.userAgent);
export const isPhone = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

/** UPI query string. The '@' in the UPI ID is kept as is (some apps reject %40). */
export function upiQuery(pa: string, pn: string, amount: number, note: string): string {
  const enc = (v: string) => encodeURIComponent(v).replace(/%40/g, '@');
  return `pa=${enc(pa)}&pn=${enc(pn)}&am=${amount.toFixed(2)}&cu=INR&tn=${enc(note)}`;
}

/** Link that opens the chosen app directly with the payee, amount and note filled in. */
export function upiAppLink(app: UpiApp, query: string): string {
  switch (app) {
    case 'gpay':
      return isIos() ? `gpay://upi/pay?${query}` : `tez://upi/pay?${query}`;
    case 'phonepe':
      return `phonepe://pay?${query}`;
    case 'paytm':
      return `paytmmp://pay?${query}`;
    default:
      return `upi://pay?${query}`; // BHIM and any other UPI app
  }
}
