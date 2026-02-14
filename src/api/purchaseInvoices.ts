// Multi-tenant ready — backend will enforce org isolation
// Product display names updated to generic labels (vendor id unchanged)
import type { PurchaseInvoice, Vendor } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';

const getDate = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
};

export const mockVendors: Vendor[] = [
  {
    id: 1,
    organizationId: MOCK_ORGANIZATION_ID,
    name: 'Cable',
    contact: '9876500001',
    gstin: '27AABCU9603R1ZM',
    addressLine1: '12 Cable Tower',
    addressLine2: 'MG Road',
    city: 'Bangalore',
    state: 'Karnataka',
    country: 'India',
    pincode: '560001',
    createdAt: getDate(365),
  },
  {
    id: 2,
    organizationId: MOCK_ORGANIZATION_ID,
    name: 'Internet 1',
    contact: '9876500002',
    gstin: '27AABCU9603R2ZM',
    addressLine1: '45 Fiber Hub',
    city: 'Chennai',
    state: 'Tamil Nadu',
    country: 'India',
    pincode: '600001',
    createdAt: getDate(365),
  },
  {
    id: 3,
    organizationId: MOCK_ORGANIZATION_ID,
    name: 'Fiber Optics Inc',
    contact: '9876500003',
    createdAt: getDate(180),
  },
];

let purchaseInvoicesData: PurchaseInvoice[] = [
  {
    id: 1,
    organizationId: MOCK_ORGANIZATION_ID,
    invoiceNumber: 'PINV-2024-001',
    vendorId: 1,
    vendorName: 'Cable',
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
    vendorName: 'Internet 1',
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

let vendorsData: Vendor[] = [...mockVendors];

export const vendorsApi = {
  getAll: async (): Promise<Vendor[]> => Promise.resolve([...vendorsData]),
  getById: async (id: number): Promise<Vendor | null> => {
    const v = vendorsData.find((x) => x.id === id);
    return v ? Promise.resolve({ ...v }) : Promise.resolve(null);
  },
  create: async (vendor: Omit<Vendor, 'id' | 'createdAt'>): Promise<Vendor> => {
    const newVendor: Vendor = {
      ...vendor,
      organizationId: vendor.organizationId ?? MOCK_ORGANIZATION_ID,
      id: Math.max(0, ...vendorsData.map((x) => x.id)) + 1,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    vendorsData.push(newVendor);
    return newVendor;
  },
  update: async (id: number, data: Partial<Omit<Vendor, 'id' | 'organizationId' | 'createdAt'>>): Promise<Vendor | null> => {
    const idx = vendorsData.findIndex((x) => x.id === id);
    if (idx === -1) return Promise.resolve(null);
    vendorsData[idx] = { ...vendorsData[idx], ...data };
    return Promise.resolve({ ...vendorsData[idx] });
  },
};
