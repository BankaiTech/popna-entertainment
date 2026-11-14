/** SMS sent to customers (GET /sms-logs, paged). Django API only. */
import apiClient from '@/lib/apiClient';
import { toCamelCase, unwrapApiData } from '@/lib/apiHelpers';

export type SmsStatus = 'pending' | 'sending' | 'sent' | 'failed';
export type SmsKind = 'payment_receipt' | 'due_reminder' | 'owner_payment_alert' | 'owner_daily_summary';

export interface SmsLogRow {
  id: number;
  kind: SmsKind;
  customer: number | null;
  customerName: string;
  mobile: string;
  language: 'en' | 'ta';
  templateId: string;
  message: string;
  status: SmsStatus;
  attempts: number;
  sentAt: string | null;
  createdAt: string;
  lastError: string;
}

export interface SmsLogPage { count: number; next: string | null; results: SmsLogRow[] }
export interface SmsCounts { sent: number; pending: number; sending: number; failed: number }
export interface SmsSummary { today: SmsCounts; thisMonth: SmsCounts }

export interface SmsLogFilters {
  status?: string; kind?: string; language?: string; from?: string; to?: string; search?: string; page?: number;
}

const clean = (f: SmsLogFilters) => Object.fromEntries(Object.entries(f).filter(([, v]) => v !== '' && v != null));

export const smsLogApi = {
  list: async (filters: SmsLogFilters): Promise<SmsLogPage> =>
    toCamelCase<SmsLogPage>(unwrapApiData(await apiClient.get('/sms-logs', { params: clean(filters) }))),
  summary: async (): Promise<SmsSummary> => toCamelCase<SmsSummary>(unwrapApiData(await apiClient.get('/sms-logs/summary'))),
  retry: async (id: number): Promise<SmsLogRow> =>
    toCamelCase<SmsLogRow>(unwrapApiData(await apiClient.post(`/sms-logs/${id}/retry`))),
};
