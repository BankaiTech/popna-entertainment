// Multi-tenant ready — backend will isolate by organization
import type { Product } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';

// In-memory storage for mock data (simulates backend)
let productsData: Product[] = [
  {
    id: 1,
    organizationId: MOCK_ORGANIZATION_ID,
    name: 'GTPL',
    productType: 'cable',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    organizationId: MOCK_ORGANIZATION_ID,
    name: 'BSNL',
    productType: 'internet',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 3,
    organizationId: MOCK_ORGANIZATION_ID,
    name: 'Railwire',
    productType: 'internet',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 4,
    organizationId: MOCK_ORGANIZATION_ID,
    name: 'Krishiinet',
    productType: 'internet',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

export const productsApi = {
  getAll: async (): Promise<Product[]> => {
    // API ready — replace mock with real backend
    return Promise.resolve([...productsData]);
  },
  getActive: async (): Promise<Product[]> => {
    // API ready — replace mock with real backend
    return Promise.resolve(productsData.filter((p) => p.isActive));
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
