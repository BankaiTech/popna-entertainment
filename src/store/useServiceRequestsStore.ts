import { create } from 'zustand';
import type { ServiceRequest } from '@/models/types';
import { serviceRequestsApi } from '@/api/serviceRequests';

interface ServiceRequestsState {
  serviceRequests: ServiceRequest[];
  loading: boolean;
  error: string | null;
  fetchServiceRequests: () => Promise<void>;
  addServiceRequest: (request: Omit<ServiceRequest, 'id' | 'createdAt'>) => Promise<void>;
  updateServiceRequest: (id: number, request: Partial<ServiceRequest>) => Promise<void>;
  deleteServiceRequest: (id: number) => Promise<void>;
}

export const useServiceRequestsStore = create<ServiceRequestsState>((set) => ({
  serviceRequests: [],
  loading: false,
  error: null,

  fetchServiceRequests: async () => {
    set({ loading: true, error: null });
    try {
      const serviceRequests = await serviceRequestsApi.getAll();
      set({ serviceRequests, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  addServiceRequest: async (request) => {
    set({ loading: true, error: null });
    try {
      await serviceRequestsApi.create(request);
      const serviceRequests = await serviceRequestsApi.getAll();
      set({ serviceRequests, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  updateServiceRequest: async (id, request) => {
    set({ loading: true, error: null });
    try {
      await serviceRequestsApi.update(id, request);
      const serviceRequests = await serviceRequestsApi.getAll();
      set({ serviceRequests, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  deleteServiceRequest: async (id) => {
    set({ loading: true, error: null });
    try {
      await serviceRequestsApi.delete(id);
      const serviceRequests = await serviceRequestsApi.getAll();
      set({ serviceRequests, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
}));
