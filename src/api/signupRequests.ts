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
    return [...signupRequests].sort((a, b) => b.id - a.id);
  },

  create: async (data: Omit<SignupRequest, 'id' | 'createdAt'>): Promise<SignupRequest> => {
    const request: SignupRequest = {
      ...data,
      id: nextId++,
      createdAt: new Date().toISOString(),
    };
    signupRequests.push(request);
    return request;
  },

  delete: async (id: number): Promise<boolean> => {
    const index = signupRequests.findIndex((r) => r.id === id);
    if (index === -1) return false;
    signupRequests.splice(index, 1);
    return true;
  },
};
