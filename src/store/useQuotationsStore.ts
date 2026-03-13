import { create } from 'zustand';
import type { Quotation, QuotationStatus } from '@/models/types';
import { quotationsApi } from '@/api/quotations';

interface QuotationState {
  quotations: Quotation[];
  loading: boolean;
  error: string | null;
  fetchQuotations: () => Promise<void>;
  addQuotation: (quotation: Omit<Quotation, 'id' | 'createdAt' | 'quotationNumber'>) => Promise<void>;
  updateQuotation: (id: number, data: Partial<Quotation>) => Promise<void>;
  deleteQuotation: (id: number) => Promise<void>;
  updateStatus: (id: number, status: QuotationStatus) => Promise<void>;
}

export const useQuotationsStore = create<QuotationState>((set) => ({
  quotations: [],
  loading: false,
  error: null,

  fetchQuotations: async () => {
    set({ loading: true, error: null });
    try {
      const quotations = await quotationsApi.getAll();
      set({ quotations, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  addQuotation: async (quotation) => {
    set({ loading: true, error: null });
    try {
      await quotationsApi.create(quotation);
      const quotations = await quotationsApi.getAll();
      set({ quotations, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  updateQuotation: async (id, data) => {
    set({ loading: true, error: null });
    try {
      await quotationsApi.update(id, data);
      const quotations = await quotationsApi.getAll();
      set({ quotations, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  deleteQuotation: async (id) => {
    set({ loading: true, error: null });
    try {
      await quotationsApi.delete(id);
      const quotations = await quotationsApi.getAll();
      set({ quotations, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  updateStatus: async (id, status) => {
    set({ loading: true, error: null });
    try {
      await quotationsApi.updateStatus(id, status);
      const quotations = await quotationsApi.getAll();
      set({ quotations, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
}));

