// Multi-tenant ready - backend will isolate by organization
// Products fully dynamic - no hardcoded service names. All product references come from Admin → Settings → Products.
import type { Product } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import { useAuthStore } from '@/store/useAuthStore';

function getCurrentOrgId(): string {
  const { organizationId } = useAuthStore.getState();
  return organizationId ?? MOCK_ORGANIZATION_ID;
}

const ts = new Date().toISOString();
// In-memory storage for mock data (simulates backend) — all orgs combined.
let productsData: Product[] = [
  // org_001 ISP
  { id: 1, organizationId: 'org_001', name: 'Cable', productType: 'cable', isActive: true, createdAt: ts, cutoffDate: 10 },
  { id: 2, organizationId: 'org_001', name: 'Internet 1', productType: 'internet', isActive: true, createdAt: ts, cutoffDays: 30 },
  { id: 3, organizationId: 'org_001', name: 'Internet 2', productType: 'internet', isActive: true, createdAt: ts, cutoffDays: 30 },
  { id: 4, organizationId: 'org_001', name: 'Internet 3', productType: 'internet', isActive: true, createdAt: ts, cutoffDays: 30 },
  // org_002 Retail
  { id: 5, organizationId: 'org_002', name: 'Clothing', productType: 'physical', isActive: true, createdAt: ts },
  { id: 6, organizationId: 'org_002', name: 'Electronics', productType: 'physical', isActive: true, createdAt: ts },
  { id: 7, organizationId: 'org_002', name: 'Accessories', productType: 'general', isActive: true, createdAt: ts },
  // org_003 Salon
  { id: 8, organizationId: 'org_003', name: 'Hair Services', productType: 'service', isActive: true, createdAt: ts },
  { id: 9, organizationId: 'org_003', name: 'Spa Treatments', productType: 'service', isActive: true, createdAt: ts },
  { id: 10, organizationId: 'org_003', name: 'Retail Products', productType: 'physical', isActive: true, createdAt: ts },
  // org_004 Restaurant
  { id: 11, organizationId: 'org_004', name: 'Food', productType: 'food', isActive: true, createdAt: ts },
  { id: 12, organizationId: 'org_004', name: 'Beverages', productType: 'food', isActive: true, createdAt: ts },
  // org_005 Healthcare
  { id: 13, organizationId: 'org_005', name: 'Medicines', productType: 'physical', isActive: true, createdAt: ts },
  { id: 14, organizationId: 'org_005', name: 'Medical Services', productType: 'service', isActive: true, createdAt: ts },
  // org_006 Gym
  { id: 15, organizationId: 'org_006', name: 'Memberships', productType: 'service', isActive: true, createdAt: ts },
  { id: 16, organizationId: 'org_006', name: 'Personal Training', productType: 'service', isActive: true, createdAt: ts },
];

export const productsApi = {
  getAll: async (): Promise<Product[]> => {
    const orgId = getCurrentOrgId();
    return Promise.resolve(productsData.filter((p) => p.organizationId === orgId));
  },
  getActive: async (): Promise<Product[]> => {
    const orgId = getCurrentOrgId();
    return Promise.resolve(productsData.filter((p) => p.organizationId === orgId && p.isActive));
  },
  getById: async (id: number): Promise<Product> => {
    const product = productsData.find((p) => p.id === id);
    if (!product) throw new Error('Product not found');
    return Promise.resolve(product);
  },
  create: async (product: Omit<Product, 'id' | 'createdAt'>): Promise<Product> => {
    const newProduct: Product = {
      ...product,
      organizationId: product.organizationId ?? MOCK_ORGANIZATION_ID,
      id: Math.max(...productsData.map((p) => p.id), 0) + 1,
      createdAt: new Date().toISOString(),
    };
    productsData.push(newProduct);
    return Promise.resolve(newProduct);
  },
  update: async (id: number, product: Partial<Product>): Promise<Product> => {
    const index = productsData.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Product not found');
    productsData[index] = { ...productsData[index], ...product };
    return Promise.resolve(productsData[index]);
  },
  delete: async (id: number): Promise<void> => {
    const index = productsData.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Product not found');
    productsData.splice(index, 1);
    return Promise.resolve();
  },
};
