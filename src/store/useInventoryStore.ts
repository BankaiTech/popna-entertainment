import { create } from 'zustand';
import type { InventoryProduct, Category, SubCategory, Unit, Branch, TaxRate, Warranty } from '@/models/types';
import {
    inventoryProductsApi, categoriesApi, subCategoriesApi,
    unitsApi, branchesApi, taxRatesApi, warrantiesApi,
} from '@/api/inventoryProducts';
import { asyncOnce, clearAsyncOnce } from '@/lib/asyncOnce';

const INV_INIT_KEY = 'inventory:initialize';

interface InventoryState {
    products: InventoryProduct[];
    categories: Category[];
    subCategories: SubCategory[];
    units: Unit[];
    branches: Branch[];
    taxRates: TaxRate[];
    warranties: Warranty[];
    loading: boolean;
    error: string | null;
    initialized: boolean;

    initialize: () => Promise<void>;
    reset: () => void;
    // Products
    fetchProducts: () => Promise<void>;
    addProduct: (product: Omit<InventoryProduct, 'id' | 'createdAt'>) => Promise<void>;
    updateProduct: (id: number, product: Partial<InventoryProduct>) => Promise<void>;
    deleteProduct: (id: number) => Promise<void>;
    importProducts: (products: Omit<InventoryProduct, 'id' | 'createdAt'>[]) => Promise<void>;
    // Categories
    fetchCategories: () => Promise<void>;
    addCategory: (cat: Omit<Category, 'id' | 'createdAt'>) => Promise<void>;
    updateCategory: (id: number, cat: Partial<Category>) => Promise<void>;
    deleteCategory: (id: number) => Promise<void>;
    // SubCategories
    fetchSubCategories: () => Promise<void>;
    addSubCategory: (sub: Omit<SubCategory, 'id' | 'createdAt'>) => Promise<void>;
    // Units
    fetchUnits: () => Promise<void>;
    addUnit: (unit: Omit<Unit, 'id' | 'createdAt'>) => Promise<void>;
    updateUnit: (id: number, unit: Partial<Unit>) => Promise<void>;
    deleteUnit: (id: number) => Promise<void>;
    // Branches
    fetchBranches: () => Promise<void>;
    addBranch: (branch: Omit<Branch, 'id' | 'createdAt'>) => Promise<void>;
    updateBranch: (id: number, branch: Partial<Branch>) => Promise<void>;
    deleteBranch: (id: number) => Promise<void>;
    // Tax Rates
    fetchTaxRates: () => Promise<void>;
    addTaxRate: (tax: Omit<TaxRate, 'id' | 'createdAt'>) => Promise<void>;
    updateTaxRate: (id: number, tax: Partial<TaxRate>) => Promise<void>;
    deleteTaxRate: (id: number) => Promise<void>;
    // Warranties
    fetchWarranties: () => Promise<void>;
    addWarranty: (w: Omit<Warranty, 'id' | 'createdAt'>) => Promise<void>;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
    products: [],
    categories: [],
    subCategories: [],
    units: [],
    branches: [],
    taxRates: [],
    warranties: [],
    loading: false,
    error: null,
    initialized: false,

    reset: () => {
        clearAsyncOnce(INV_INIT_KEY);
        set({
            products: [],
            categories: [],
            subCategories: [],
            units: [],
            branches: [],
            taxRates: [],
            warranties: [],
            initialized: false,
            error: null,
        });
    },

    initialize: async () => {
        if (get().initialized) return;
        return asyncOnce(INV_INIT_KEY, async () => {
            if (get().initialized) return;
            set({ loading: true });
            try {
                const [products, categories, subCategories, units, branches, taxRates, warranties] = await Promise.all([
                    inventoryProductsApi.getAll(),
                    categoriesApi.getAll(),
                    subCategoriesApi.getAll(),
                    unitsApi.getAll(),
                    branchesApi.getAll(),
                    taxRatesApi.getAll(),
                    warrantiesApi.getAll(),
                ]);
                set({ products, categories, subCategories, units, branches, taxRates, warranties, loading: false, initialized: true });
            } catch (err) {
                set({ error: err instanceof Error ? err.message : 'Failed to initialize', loading: false });
            }
        });
    },

    // Products
    fetchProducts: async () => {
        set({ loading: true });
        try {
            const products = await inventoryProductsApi.getAll();
            set({ products, loading: false });
        } catch (err) {
            set({ error: err instanceof Error ? err.message : 'Failed', loading: false });
        }
    },
    addProduct: async (product) => {
        try {
            await inventoryProductsApi.create(product);
            const products = await inventoryProductsApi.getAll();
            set({ products });
        } catch (err) {
            set({ error: err instanceof Error ? err.message : 'Failed' });
        }
    },
    updateProduct: async (id, product) => {
        try {
            await inventoryProductsApi.update(id, product);
            const products = await inventoryProductsApi.getAll();
            set({ products });
        } catch (err) {
            set({ error: err instanceof Error ? err.message : 'Failed' });
        }
    },
    deleteProduct: async (id) => {
        try {
            await inventoryProductsApi.delete(id);
            const products = await inventoryProductsApi.getAll();
            set({ products });
        } catch (err) {
            set({ error: err instanceof Error ? err.message : 'Failed' });
        }
    },
    importProducts: async (products) => {
        try {
            await inventoryProductsApi.importBulk(products);
            const all = await inventoryProductsApi.getAll();
            set({ products: all });
        } catch (err) {
            set({ error: err instanceof Error ? err.message : 'Failed' });
        }
    },

    // Categories
    fetchCategories: async () => {
        const categories = await categoriesApi.getAll();
        set({ categories });
    },
    addCategory: async (cat) => {
        await categoriesApi.create(cat);
        const categories = await categoriesApi.getAll();
        set({ categories });
    },
    updateCategory: async (id, cat) => {
        await categoriesApi.update(id, cat);
        const categories = await categoriesApi.getAll();
        set({ categories });
    },
    deleteCategory: async (id) => {
        await categoriesApi.delete(id);
        const categories = await categoriesApi.getAll();
        set({ categories });
    },

    // SubCategories
    fetchSubCategories: async () => {
        const subCategories = await subCategoriesApi.getAll();
        set({ subCategories });
    },
    addSubCategory: async (sub) => {
        await subCategoriesApi.create(sub);
        const subCategories = await subCategoriesApi.getAll();
        set({ subCategories });
    },

    // Units
    fetchUnits: async () => {
        const units = await unitsApi.getAll();
        set({ units });
    },
    addUnit: async (unit) => {
        await unitsApi.create(unit);
        const units = await unitsApi.getAll();
        set({ units });
    },
    updateUnit: async (id, unit) => {
        await unitsApi.update(id, unit);
        const units = await unitsApi.getAll();
        set({ units });
    },
    deleteUnit: async (id) => {
        await unitsApi.delete(id);
        const units = await unitsApi.getAll();
        set({ units });
    },

    // Branches
    fetchBranches: async () => {
        const branches = await branchesApi.getAll();
        set({ branches });
    },
    addBranch: async (branch) => {
        await branchesApi.create(branch);
        const branches = await branchesApi.getAll();
        set({ branches });
    },
    updateBranch: async (id, branch) => {
        await branchesApi.update(id, branch);
        const branches = await branchesApi.getAll();
        set({ branches });
    },
    deleteBranch: async (id) => {
        await branchesApi.delete(id);
        const branches = await branchesApi.getAll();
        set({ branches });
    },

    // Tax Rates
    fetchTaxRates: async () => {
        const taxRates = await taxRatesApi.getAll();
        set({ taxRates });
    },
    addTaxRate: async (tax) => {
        await taxRatesApi.create(tax);
        const taxRates = await taxRatesApi.getAll();
        set({ taxRates });
    },
    updateTaxRate: async (id, tax) => {
        await taxRatesApi.update(id, tax);
        const taxRates = await taxRatesApi.getAll();
        set({ taxRates });
    },
    deleteTaxRate: async (id) => {
        await taxRatesApi.delete(id);
        const taxRates = await taxRatesApi.getAll();
        set({ taxRates });
    },

    // Warranties
    fetchWarranties: async () => {
        const warranties = await warrantiesApi.getAll();
        set({ warranties });
    },
    addWarranty: async (w) => {
        await warrantiesApi.create(w);
        const warranties = await warrantiesApi.getAll();
        set({ warranties });
    },
}));
