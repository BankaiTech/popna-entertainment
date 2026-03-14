import { create } from 'zustand';
import type { PurchaseOrder, PurchaseOrderStatus } from '@/models/types';
import { purchaseOrdersApi } from '@/api/purchaseOrders';

interface PurchaseOrderState {
  purchaseOrders: PurchaseOrder[];
  loading: boolean;
  error: string | null;
  fetchPurchaseOrders: () => Promise<void>;
  addPurchaseOrder: (po: Omit<PurchaseOrder, 'id' | 'createdAt' | 'poNumber'>) => Promise<void>;
  updatePurchaseOrder: (id: number, data: Partial<PurchaseOrder>) => Promise<void>;
  deletePurchaseOrder: (id: number) => Promise<void>;
  updateStatus: (id: number, status: PurchaseOrderStatus) => Promise<void>;
}

export const usePurchaseOrdersStore = create<PurchaseOrderState>((set) => ({
  purchaseOrders: [],
  loading: false,
  error: null,

  fetchPurchaseOrders: async () => {
    set({ loading: true, error: null });
    try {
      const purchaseOrders = await purchaseOrdersApi.getAll();
      set({ purchaseOrders, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  addPurchaseOrder: async (po) => {
    set({ loading: true, error: null });
    try {
      await purchaseOrdersApi.create(po);
      const purchaseOrders = await purchaseOrdersApi.getAll();
      set({ purchaseOrders, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  updatePurchaseOrder: async (id, data) => {
    set({ loading: true, error: null });
    try {
      await purchaseOrdersApi.update(id, data);
      const purchaseOrders = await purchaseOrdersApi.getAll();
      set({ purchaseOrders, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  deletePurchaseOrder: async (id) => {
    set({ loading: true, error: null });
    try {
      await purchaseOrdersApi.delete(id);
      const purchaseOrders = await purchaseOrdersApi.getAll();
      set({ purchaseOrders, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  updateStatus: async (id, status) => {
    set({ loading: true, error: null });
    try {
      await purchaseOrdersApi.updateStatus(id, status);
      const purchaseOrders = await purchaseOrdersApi.getAll();
      set({ purchaseOrders, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
}));

