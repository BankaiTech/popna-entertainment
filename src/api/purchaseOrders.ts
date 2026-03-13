import type { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';

const getDate = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
};

const sampleItems: PurchaseOrderItem[] = [
  {
    productId: 1,
    productName: 'Internet Router AX73',
    quantity: 10,
    unitPrice: 4500,
    taxRate: 18,
    lineTotal: 10 * 4500 * 1.18,
    receivedQuantity: 5,
  },
];

let purchaseOrdersData: PurchaseOrder[] = [
  {
    id: 1,
    organizationId: MOCK_ORGANIZATION_ID,
    poNumber: 'PO-2026-001',
    vendorId: 1,
    vendorName: 'Cable',
    items: sampleItems,
    subtotal: 10 * 4500,
    taxTotal: 10 * 4500 * 0.18,
    grandTotal: 10 * 4500 * 1.18,
    status: 'partial',
    expectedDate: getDate(7),
    notes: 'Urgent stock for routers. Partial delivery received.',
    createdAt: getDate(-3),
  },
];

let nextId = 2;

function generatePoNumber(): string {
  const year = new Date().getFullYear();
  const num = String(nextId).padStart(3, '0');
  return `PO-${year}-${num}`;
}

export const purchaseOrdersApi = {
  getAll: async (): Promise<PurchaseOrder[]> => Promise.resolve([...purchaseOrdersData]),

  getById: async (id: number): Promise<PurchaseOrder> => {
    const po = purchaseOrdersData.find((p) => p.id === id);
    if (!po) throw new Error('Purchase order not found');
    return po;
  },

  create: async (
    po: Omit<PurchaseOrder, 'id' | 'createdAt' | 'poNumber'>
  ): Promise<PurchaseOrder> => {
    const newPo: PurchaseOrder = {
      ...po,
      organizationId: po.organizationId ?? MOCK_ORGANIZATION_ID,
      id: nextId++,
      poNumber: generatePoNumber(),
      createdAt: new Date().toISOString(),
    };
    purchaseOrdersData.push(newPo);
    return newPo;
  },

  update: async (
    id: number,
    data: Partial<PurchaseOrder>
  ): Promise<PurchaseOrder> => {
    const idx = purchaseOrdersData.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Purchase order not found');
    purchaseOrdersData[idx] = { ...purchaseOrdersData[idx], ...data };
    return purchaseOrdersData[idx];
  },

  updateStatus: async (
    id: number,
    status: PurchaseOrderStatus
  ): Promise<PurchaseOrder> => {
    return purchaseOrdersApi.update(id, { status });
  },

  delete: async (id: number): Promise<void> => {
    purchaseOrdersData = purchaseOrdersData.filter((p) => p.id !== id);
    return Promise.resolve();
  },
};

