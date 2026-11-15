import apiClient from '@/lib/apiClient';
import { isMockMode, toCamelCase, unwrapApiData } from '@/lib/apiHelpers';
import { endpoints } from './endpoints';

export type SignupService = 'cable' | 'internet' | 'both';
export type SignupSize = '' | 'under_500' | '500_2000' | '2000_5000' | 'over_5000';
export type SignupStatus = 'new' | 'contacted' | 'joined' | 'not_interested';

export const SIGNUP_SIZES: Exclude<SignupSize, ''>[] = ['under_500', '500_2000', '2000_5000', 'over_5000'];
export const SIGNUP_STATUSES: SignupStatus[] = ['new', 'contacted', 'joined', 'not_interested'];

/** What the public sign-up form sends. `website` is a hidden trap field and must stay empty. */
export interface SignupForm {
  name: string;
  mobile: string;
  email: string;
  businessName: string;
  city: string;
  service: SignupService;
  customerCount: SignupSize;
  message: string;
  language: string;
  website?: string;
}

export interface SignupRequest extends Omit<SignupForm, 'website'> {
  id: number;
  status: SignupStatus;
  notes: string;
  submitCount: number;
  createdAt: string;
}

let demoRows: SignupRequest[] = [];
let nextId = 1;

function mapSignupRequest(raw: Record<string, unknown>): SignupRequest {
  const r = toCamelCase<Record<string, unknown>>(raw);
  return {
    id: Number(r.id),
    name: String(r.name ?? ''),
    mobile: String(r.mobile ?? ''),
    email: String(r.email ?? ''),
    businessName: String(r.businessName ?? ''),
    city: String(r.city ?? ''),
    service: (r.service as SignupService) ?? 'cable',
    customerCount: (r.customerCount as SignupSize) ?? '',
    message: String(r.message ?? ''),
    language: String(r.language ?? ''),
    status: (r.status as SignupStatus) ?? 'new',
    notes: String(r.notes ?? ''),
    submitCount: Number(r.submitCount ?? 1),
    createdAt: String(r.createdAt ?? new Date().toISOString()),
  };
}

export const signupRequestsApi = {
  /** Public: anyone can send the form. The server answers only {ok: true}. */
  submit: async (form: SignupForm): Promise<void> => {
    if (isMockMode()) {
      demoRows.push({ ...form, id: nextId++, status: 'new', notes: '', submitCount: 1, createdAt: new Date().toISOString() });
      return;
    }
    await apiClient.post(endpoints.signupRequests, {
      name: form.name,
      mobile: form.mobile,
      email: form.email,
      business_name: form.businessName,
      city: form.city,
      service: form.service,
      customer_count: form.customerCount,
      message: form.message,
      language: form.language,
      website: form.website ?? '',
    });
  },

  /** App owner only. */
  getAll: async (): Promise<SignupRequest[]> => {
    if (isMockMode()) return [...demoRows].sort((a, b) => b.id - a.id);
    const data = unwrapApiData<Record<string, unknown>[] | { results: Record<string, unknown>[] }>(
      await apiClient.get(endpoints.signupRequests),
    );
    const list = Array.isArray(data) ? data : data?.results ?? [];
    return list.map(mapSignupRequest);
  },

  /** App owner only: change status and/or call notes. */
  update: async (id: number, changes: { status?: SignupStatus; notes?: string }): Promise<SignupRequest> => {
    if (isMockMode()) {
      const row = demoRows.find((r) => r.id === id);
      if (!row) throw new Error('Not found');
      Object.assign(row, changes);
      return { ...row };
    }
    return mapSignupRequest(
      unwrapApiData<Record<string, unknown>>(await apiClient.patch(`${endpoints.signupRequests}/${id}`, changes)),
    );
  },

  /** App owner only: number of sign-ups nobody has called yet. */
  newCount: async (): Promise<number> => {
    if (isMockMode()) return demoRows.filter((r) => r.status === 'new').length;
    const data = unwrapApiData<{ new: number }>(await apiClient.get(`${endpoints.signupRequests}/summary`));
    return Number(data?.new ?? 0);
  },

  delete: async (id: number): Promise<void> => {
    if (isMockMode()) {
      demoRows = demoRows.filter((r) => r.id !== id);
      return;
    }
    await apiClient.delete(`${endpoints.signupRequests}/${id}`);
  },
};
