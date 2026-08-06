import { apiDelete, apiGetList, apiPost } from '@/api/resources';
import { useMockApi } from '@/lib/http';

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

export const signupRequestsApi = {
  getAll: async (): Promise<SignupRequest[]> => {
    if (useMockApi()) {
      return [...signupRequests].sort((a, b) => b.id - a.id);
    }
    return apiGetList<SignupRequest>('/signup-requests');
  },

  create: async (data: Omit<SignupRequest, 'id' | 'createdAt'>): Promise<SignupRequest> => {
    if (useMockApi()) {
      const request: SignupRequest = {
        ...data,
        id: nextId++,
        createdAt: new Date().toISOString(),
      };
      signupRequests.push(request);
      return request;
    }
    return apiPost<SignupRequest>('/signup-requests', data);
  },

  delete: async (id: number): Promise<boolean> => {
    if (useMockApi()) {
      const index = signupRequests.findIndex((r) => r.id === id);
      if (index === -1) return false;
      signupRequests.splice(index, 1);
      return true;
    }
    await apiDelete(`/signup-requests/${id}`);
    return true;
  },
};
