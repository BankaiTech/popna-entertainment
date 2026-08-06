// Multi-tenant ready - backend will enforce org isolation
import type { PurchaseInvoice, Vendor } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import { invoicesResource } from '@/api/resources';
import { useMockApi } from '@/lib/http';
import { useAuthStore } from '@/store/useAuthStore';
import { getIndustryPurchaseInvoices, getIndustryVendors } from './industryMockData';

function getCurrentOrgId(): string {
  return useAuthStore.getState().organizationId ?? MOCK_ORGANIZATION_ID;
}

const getDate = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
};

// ISP vendors (org_001)
const ispVendors: Vendor[] = [
  { id: 1, organizationId: MOCK_ORGANIZATION_ID, name: 'Cable', contact: '9876500001', gstin: '27AABCU9603R1ZM', addressLine1: '12 Cable Tower', addressLine2: 'MG Road', city: 'Bangalore', state: 'Karnataka', country: 'India', pincode: '560001', createdAt: getDate(365) },
  { id: 2, organizationId: MOCK_ORGANIZATION_ID, name: 'Internet 1', contact: '9876500002', gstin: '27AABCU9603R2ZM', addressLine1: '45 Fiber Hub', city: 'Chennai', state: 'Tamil Nadu', country: 'India', pincode: '600001', createdAt: getDate(365) },
  { id: 3, organizationId: MOCK_ORGANIZATION_ID, name: 'Fiber Optics Inc', contact: '9876500003', createdAt: getDate(180) },
];

export const mockVendors: Vendor[] = ispVendors;

// ISP purchase invoices (org_001)
const ispPurchaseInvoices: PurchaseInvoice[] = [
  { id: 1, organizationId: MOCK_ORGANIZATION_ID, invoiceNumber: 'PINV-2024-001', vendorId: 1, vendorName: 'Cable', reference: 'PO-101', amount: 10000, gstBreakup: { cgst: 900, sgst: 900 }, totalAmount: 11800, issueDate: getDate(20), createdAt: getDate(20) },
  { id: 2, organizationId: MOCK_ORGANIZATION_ID, invoiceNumber: 'PINV-2024-002', vendorId: 2, vendorName: 'Internet 1', reference: 'GRN-205', amount: 5000, gstBreakup: { igst: 900 }, totalAmount: 5900, issueDate: getDate(10), createdAt: getDate(10) },
];

let purchaseInvoicesData: PurchaseInvoice[] = [...ispPurchaseInvoices, ...getIndustryPurchaseInvoices()];

export const purchaseInvoicesApi = {
  getAll: async (): Promise<PurchaseInvoice[]> => {
    if (useMockApi()) {
      const orgId = getCurrentOrgId();
      return Promise.resolve(purchaseInvoicesData.filter((i) => i.organizationId === orgId));
    }
    return invoicesResource.list<PurchaseInvoice>('purchase');
  },
  getById: async (id: number): Promise<PurchaseInvoice> => {
    if (useMockApi()) {
      const inv = purchaseInvoicesData.find((i) => i.id === id);
      if (!inv) throw new Error('Purchase invoice not found');
      return inv;
    }
    return invoicesResource.get<PurchaseInvoice>(id);
  },
  create: async (invoice: Omit<PurchaseInvoice, 'id' | 'createdAt'>): Promise<PurchaseInvoice> => {
    if (useMockApi()) {
      const newInv: PurchaseInvoice = {
        ...invoice,
        organizationId: invoice.organizationId ?? getCurrentOrgId(),
        id: Math.max(0, ...purchaseInvoicesData.map((i) => i.id)) + 1,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      purchaseInvoicesData.push(newInv);
      return newInv;
    }
    return invoicesResource.create<PurchaseInvoice>({ kind: 'purchase', ...invoice });
  },
  downloadPdf: async (id: number): Promise<void> => {
    if (useMockApi()) {
      const inv = purchaseInvoicesData.find((i) => i.id === id);
      if (!inv) throw new Error('Purchase invoice not found');
      return;
    }
    await invoicesResource.get<PurchaseInvoice>(id);
  },
};

let vendorsData: Vendor[] = [...ispVendors, ...getIndustryVendors()];

export const vendorsApi = {
  getAll: async (): Promise<Vendor[]> => {
    const orgId = getCurrentOrgId();
    return Promise.resolve(vendorsData.filter((v) => v.organizationId === orgId));
  },
  getById: async (id: number): Promise<Vendor | null> => {
    const v = vendorsData.find((x) => x.id === id);
    return v ? Promise.resolve({ ...v }) : Promise.resolve(null);
  },
  create: async (vendor: Omit<Vendor, 'id' | 'createdAt'>): Promise<Vendor> => {
    const newVendor: Vendor = {
      ...vendor,
      organizationId: vendor.organizationId ?? getCurrentOrgId(),
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
