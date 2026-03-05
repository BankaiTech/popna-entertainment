import type { Supplier } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';

let suppliersData: Supplier[] = [
    {
        id: 1, organizationId: MOCK_ORGANIZATION_ID, name: 'ABC Supplies', contactPerson: 'Ravi Kumar',
        mobile: '9876543210', email: 'ravi@abcsupplies.com', taxNumber: 'GSTIN001',
        openingBalance: 5000, address: { line1: '12 Market St', city: 'Chennai', state: 'Tamil Nadu', country: 'India', pincode: '600001' },
        createdAt: new Date().toISOString(),
    },
    {
        id: 2, organizationId: MOCK_ORGANIZATION_ID, name: 'XYZ Traders', contactPerson: 'Priya S',
        mobile: '9123456789', email: 'priya@xyztraders.com', taxNumber: 'GSTIN002',
        openingBalance: 12000, address: { line1: '45 Anna Nagar', city: 'Coimbatore', state: 'Tamil Nadu', country: 'India', pincode: '641001' },
        createdAt: new Date().toISOString(),
    },
];

export const suppliersApi = {
    getAll: async (): Promise<Supplier[]> => Promise.resolve([...suppliersData]),

    getById: async (id: number): Promise<Supplier> => {
        const supplier = suppliersData.find((s) => s.id === id);
        if (!supplier) throw new Error('Supplier not found');
        return Promise.resolve(supplier);
    },

    create: async (supplier: Omit<Supplier, 'id' | 'createdAt'>): Promise<Supplier> => {
        const newSupplier: Supplier = {
            ...supplier,
            organizationId: supplier.organizationId ?? MOCK_ORGANIZATION_ID,
            id: Math.max(...suppliersData.map((s) => s.id), 0) + 1,
            createdAt: new Date().toISOString(),
        };
        suppliersData.push(newSupplier);
        return Promise.resolve(newSupplier);
    },

    update: async (id: number, supplier: Partial<Supplier>): Promise<Supplier> => {
        const index = suppliersData.findIndex((s) => s.id === id);
        if (index === -1) throw new Error('Supplier not found');
        suppliersData[index] = { ...suppliersData[index], ...supplier };
        return Promise.resolve(suppliersData[index]);
    },

    delete: async (id: number): Promise<void> => {
        const index = suppliersData.findIndex((s) => s.id === id);
        if (index === -1) throw new Error('Supplier not found');
        suppliersData.splice(index, 1);
        return Promise.resolve();
    },

    importBulk: async (suppliers: Omit<Supplier, 'id' | 'createdAt'>[]): Promise<Supplier[]> => {
        const created = suppliers.map((s, i) => ({
            ...s,
            organizationId: s.organizationId ?? MOCK_ORGANIZATION_ID,
            id: Math.max(...suppliersData.map((x) => x.id), 0) + i + 1,
            createdAt: new Date().toISOString(),
        }));
        suppliersData.push(...created);
        return Promise.resolve(created);
    },
};
