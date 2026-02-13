// Multi-tenant ready — backend will enforce org isolation
import type { PurchaseInvoice, Vendor } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';

const getDate = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
};

export const mockVendors: Vendor[] = [
  { id: 1, organizationId: MOCK_ORGANIZATION_ID, name: 'GTPL Ltd', contact: '9876500001', gstin: '27AABCU9603R1ZM', createdAt: getDate(365) },
  { id: 2, organizationId: MOCK_ORGANIZATION_ID, name: 'BSNL Supply', contact: '9876500002', gstin: '27AABCU9603R2ZM', createdAt: getDate(365) },
  { id: 3, organizationId: MOCK_ORGANIZATION_ID, name: 'Fiber Optics Inc', contact: '9876500003', createdAt: getDate(180) },
];

let purchaseInvoicesData: PurchaseInvoice[] = [
  {
    id: 1,
    organizationId: MOCK_ORGANIZATION_ID,
    invoiceNumber: 'PINV-2024-001',
    vendorId: 1,
    vendorName: 'GTPL Ltd',
    reference: 'PO-101',
    amount: 10000,
    gstBreakup: { cgst: 900, sgst: 900 },
    totalAmount: 11800,
    issueDate: getDate(20),
    createdAt: getDate(20),
  },
  {
    id: 2,
    organizationId: MOCK_ORGANIZATION_ID,
    invoiceNumber: 'PINV-2024-002',
    vendorId: 2,
    vendorName: 'BSNL Supply',
    reference: 'GRN-205',
    amount: 5000,
    gstBreakup: { igst: 900 },
    totalAmount: 5900,
    issueDate: getDate(10),
    createdAt: getDate(10),
  },
];

export const purchaseInvoicesApi = {
  getAll: async (): Promise<PurchaseInvoice[]> => Promise.resolve([...purchaseInvoicesData]),
  getById: async (id: number): Promise<PurchaseInvoice> => {
    const inv = purchaseInvoicesData.find((i) => i.id === id);
    if (!inv) throw new Error('Purchase invoice not found');
    return inv;
  },
  create: async (invoice: Omit<PurchaseInvoice, 'id' | 'createdAt'>): Promise<PurchaseInvoice> => {
    const newInv: PurchaseInvoice = {
      ...invoice,
      organizationId: invoice.organizationId ?? MOCK_ORGANIZATION_ID,
      id: Math.max(0, ...purchaseInvoicesData.map((i) => i.id)) + 1,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    purchaseInvoicesData.push(newInv);
    return newInv;
  },
  /**
   * Download purchase invoice PDF
   * Replace with backend PDF generation later
   */
  downloadPdf: async (id: number): Promise<void> => {
    // This will be handled by the frontend using generatePurchaseInvoicePdf
    // Backend replacement: return PDF blob/stream
    const inv = purchaseInvoicesData.find((i) => i.id === id);
    if (!inv) throw new Error('Purchase invoice not found');
    // Frontend will call generatePurchaseInvoicePdf with invoice data
  },
};

export const vendorsApi = {
  getAll: async (): Promise<Vendor[]> => Promise.resolve([...mockVendors]),
};
