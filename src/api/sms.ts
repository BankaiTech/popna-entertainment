import { apiGetList, apiPost } from '@/api/resources';
import { useMockApi } from '@/lib/http';

export interface SmsLog {
  id?: number;
  contactId?: number;
  mobile: string;
  message: string;
  smsType?: string;
  status?: string;
  providerRef?: string | null;
  errorMessage?: string | null;
  createdAt?: string;
}

export interface SendSmsPayload {
  contactId?: number;
  mobile: string;
  message: string;
  smsType?: string;
}

let smsLogsData: SmsLog[] = [];
let nextId = 1;

export const smsApi = {
  getLogs: async (params?: { contactId?: number; from?: string; to?: string }): Promise<SmsLog[]> => {
    if (useMockApi()) {
      let list = [...smsLogsData];
      if (params?.contactId != null) {
        list = list.filter((l) => l.contactId === params.contactId);
      }
      return Promise.resolve(list);
    }
    return apiGetList<SmsLog>('/sms-logs', params as Record<string, unknown> | undefined);
  },

  sendSms: async (payload: SendSmsPayload): Promise<SmsLog> => {
    if (useMockApi()) {
      const log: SmsLog = {
        id: nextId++,
        ...payload,
        status: 'sent',
        providerRef: null,
        errorMessage: null,
        createdAt: new Date().toISOString(),
      };
      smsLogsData.unshift(log);
      return Promise.resolve(log);
    }
    return apiPost<SmsLog>('/sms/send', payload);
  },
};
