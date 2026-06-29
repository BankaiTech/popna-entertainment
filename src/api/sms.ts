import apiClient from '@/lib/apiClient';
import { isMockMode, toCamelCase, toSnakeCase, unwrapApiData } from '@/lib/apiHelpers';
import { endpoints } from './endpoints';

export interface SmsLog {
  id: number;
  mobile: string;
  message: string;
  status: string;
  sentAt: string;
}

export interface SendSmsPayload {
  mobile: string;
  message: string;
}

function mapSmsLog(raw: Record<string, unknown>): SmsLog {
  const r = toCamelCase<Record<string, unknown>>(raw);
  return {
    id: Number(r.id),
    mobile: String(r.mobile ?? ''),
    message: String(r.message ?? ''),
    status: String(r.status ?? ''),
    sentAt: String(r.sentAt ?? r.createdAt ?? new Date().toISOString()),
  };
}

export const smsApi = {
  getLogs: async (): Promise<SmsLog[]> => {
    if (isMockMode()) return [];
    const response = await apiClient.get(endpoints.smsLogs);
    const list = unwrapApiData<Record<string, unknown>[]>(response);
    return (Array.isArray(list) ? list : []).map(mapSmsLog);
  },

  send: async (payload: SendSmsPayload): Promise<void> => {
    if (isMockMode()) return;
    await apiClient.post(endpoints.smsSend, toSnakeCase(payload as unknown as Record<string, unknown>));
  },
};
