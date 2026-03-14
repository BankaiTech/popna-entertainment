import { create } from 'zustand';
import type { Lead } from '@/models/types';
import { leadsApi } from '@/api/leads';

interface LeadsState {
  leads: Lead[];
  loading: boolean;
  error: string | null;
  fetchLeads: () => Promise<void>;
  addLead: (lead: Omit<Lead, 'id' | 'createdAt'>) => Promise<void>;
  updateLead: (id: number, lead: Partial<Lead>) => Promise<void>;
  deleteLead: (id: number) => Promise<void>;
}

export const useLeadsStore = create<LeadsState>((set) => ({
  leads: [],
  loading: false,
  error: null,

  fetchLeads: async () => {
    set({ loading: true, error: null });
    try {
      const leads = await leadsApi.getAll();
      set({ leads, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  addLead: async (lead) => {
    set({ loading: true, error: null });
    try {
      await leadsApi.create(lead);
      const leads = await leadsApi.getAll();
      set({ leads, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  updateLead: async (id, lead) => {
    set({ loading: true, error: null });
    try {
      await leadsApi.update(id, lead);
      const leads = await leadsApi.getAll();
      set({ leads, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  deleteLead: async (id) => {
    set({ loading: true, error: null });
    try {
      await leadsApi.delete(id);
      const leads = await leadsApi.getAll();
      set({ leads, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
}));
