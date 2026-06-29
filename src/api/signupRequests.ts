import apiClient from '@/lib/apiClient';
import { isMockMode, toCamelCase, toSnakeCase, unwrapApiData } from '@/lib/apiHelpers';
import { endpoints } from './endpoints';

export interface SignupRequest {
  id: number;
  name: string;
  mobile: string;
  email: string;
  businessType: string;
  businessName: string;
  createdAt: string;
}

let signupRequests: SignupRequest[] = [];
let nextId = 1;

function mapSignupRequest(raw: Record<string, unknown>): SignupRequest {
  const r = toCamelCase<Record<string, unknown>>(raw);
  return {
    id: Number(r.id),
    name: String(r.name ?? ''),
    mobile: String(r.mobile ?? ''),
    email: String(r.email ?? ''),
    businessType: String(r.businessType ?? ''),
    businessName: String(r.businessName ?? ''),
    createdAt: String(r.createdAt ?? new Date().toISOString()),
  };
}

export const signupRequestsApi = {
  getAll: async (): Promise<SignupRequest[]> => {
    if (isMockMode()) {
      return [...signupRequests].sort((a, b) => b.id - a.id);
    }
    const response = await apiClient.get(endpoints.signupRequests);
    const list = unwrapApiData<Record<string, unknown>[]>(response);
    return (Array.isArray(list) ? list : []).map(mapSignupRequest).sort((a, b) => b.id - a.id);
  },

  create: async (data: Omit<SignupRequest, 'id' | 'createdAt'>): Promise<SignupRequest> => {
    if (isMockMode()) {
      const request: SignupRequest = {
        ...data,
        id: nextId++,
        createdAt: new Date().toISOString(),
      };
      signupRequests.push(request);
      return request;
    }
    const response = await apiClient.post(endpoints.signupRequests, toSnakeCase(data as Record<string, unknown>));
    return mapSignupRequest(unwrapApiData<Record<string, unknown>>(response));
  },

  delete: async (id: number): Promise<boolean> => {
    if (isMockMode()) {
      const index = signupRequests.findIndex((r) => r.id === id);
      if (index === -1) return false;
      signupRequests.splice(index, 1);
      return true;
    }
    await apiClient.delete(`${endpoints.signupRequests}/${id}`);
    return true;
  },
};
