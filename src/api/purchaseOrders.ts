import type { PurchaseOrder, PurchaseOrderStatus } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import { useAuthStore } from '@/store/useAuthStore';
import { getIndustryPurchaseOrders } from './industryMockData';

function getCurrentOrgId(): string {
  return useAuthStore.getState().organizationId ?? MOCK_ORGANIZATION_ID;
}

const getDate = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
};

// ISP purchase orders (org_001)
const ispPurchaseOrders: PurchaseOrder[] = [
  { id: 1, organizationId: MOCK_ORGANIZATION_ID, poNumber: 'PO-2026-001', vendorId: 1, vendorName: 'Cable', items: [{ productId: 1, productName: 'Internet Router AX73', quantity: 10, unitPrice: 4500, taxRate: 18, lineTotal: 10 * 4500 * 1.18, receivedQuantity: 5 }], subtotal: 45000, taxTotal: 8100, grandTotal: 53100, status: 'partial', expectedDate: getDate(7), notes: 'Urgent stock for routers.', createdAt: getDate(-3) },
];

let purchaseOrdersData: PurchaseOrder[] = [...ispPurchaseOrders, ...getIndustryPurchaseOrders()];
let nextId = Math.max(0, ...purchaseOrdersData.map((p) => p.id)) + 1;

function generatePoNumber(): string {
  const year = new Date().getFullYear();
  const num = String(nextId).padStart(3, '0');
  return `PO-${year}-${num}`;
}

export const purchaseOrdersApi = {
  getAll: async (): Promise<PurchaseOrder[]> => {
    const orgId = getCurrentOrgId();
    return Promise.resolve(purchaseOrdersData.filter((p) => p.organizationId === orgId));
  },
  getById: async (id: number): Promise<PurchaseOrder> => {
    const po = purchaseOrdersData.find((p) => p.id === id);
    if (!po) throw new Error('Purchase order not found');
    return po;
  },
  create: async (po: Omit<PurchaseOrder, 'id' | 'createdAt' | 'poNumber'>): Promise<PurchaseOrder> => {
    const newPo: PurchaseOrder = {
      ...po,
      organizationId: po.organizationId ?? getCurrentOrgId(),
      id: nextId++,
      poNumber: generatePoNumber(),
      createdAt: new Date().toISOString(),
    };
    purchaseOrdersData.push(newPo);
    return newPo;
  },
  update: async (id: number, data: Partial<PurchaseOrder>): Promise<PurchaseOrder> => {
    const idx = purchaseOrdersData.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Purchase order not found');
    purchaseOrdersData[idx] = { ...purchaseOrdersData[idx], ...data };
    return purchaseOrdersData[idx];
  },
  updateStatus: async (id: number, status: PurchaseOrderStatus): Promise<PurchaseOrder> => {
    return purchaseOrdersApi.update(id, { status });
  },
  delete: async (id: number): Promise<void> => {
    purchaseOrdersData = purchaseOrdersData.filter((p) => p.id !== id);
    return Promise.resolve();
  },
};
