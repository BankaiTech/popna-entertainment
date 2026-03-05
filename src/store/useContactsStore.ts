import { create } from 'zustand';
import type { Supplier } from '@/models/types';
import { suppliersApi } from '@/api/suppliers';

interface ContactsState {
    suppliers: Supplier[];
    loading: boolean;
    error: string | null;
    fetchSuppliers: () => Promise<void>;
    addSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt'>) => Promise<void>;
    updateSupplier: (id: number, supplier: Partial<Supplier>) => Promise<void>;
    deleteSupplier: (id: number) => Promise<void>;
    importSuppliers: (suppliers: Omit<Supplier, 'id' | 'createdAt'>[]) => Promise<void>;
}

export const useContactsStore = create<ContactsState>((set) => ({
    suppliers: [],
    loading: false,
    error: null,

    fetchSuppliers: async () => {
        set({ loading: true, error: null });
        try {
            const suppliers = await suppliersApi.getAll();
            set({ suppliers, loading: false });
        } catch (err) {
            set({ error: err instanceof Error ? err.message : 'Failed to fetch suppliers', loading: false });
        }
    },

    addSupplier: async (supplier) => {
        set({ loading: true, error: null });
        try {
            await suppliersApi.create(supplier);
            const suppliers = await suppliersApi.getAll();
            set({ suppliers, loading: false });
        } catch (err) {
            set({ error: err instanceof Error ? err.message : 'Failed to add supplier', loading: false });
        }
    },

    updateSupplier: async (id, supplier) => {
        set({ loading: true, error: null });
        try {
            await suppliersApi.update(id, supplier);
            const suppliers = await suppliersApi.getAll();
            set({ suppliers, loading: false });
        } catch (err) {
            set({ error: err instanceof Error ? err.message : 'Failed to update supplier', loading: false });
        }
    },

    deleteSupplier: async (id) => {
        set({ loading: true, error: null });
        try {
            await suppliersApi.delete(id);
            const suppliers = await suppliersApi.getAll();
            set({ suppliers, loading: false });
        } catch (err) {
            set({ error: err instanceof Error ? err.message : 'Failed to delete supplier', loading: false });
        }
    },

    importSuppliers: async (suppliers) => {
        set({ loading: true, error: null });
        try {
            await suppliersApi.importBulk(suppliers);
            const allSuppliers = await suppliersApi.getAll();
            set({ suppliers: allSuppliers, loading: false });
        } catch (err) {
            set({ error: err instanceof Error ? err.message : 'Failed to import suppliers', loading: false });
        }
    },
}));
