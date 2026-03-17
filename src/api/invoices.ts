// Multi-tenant ready - backend will enforce org isolation
// Product display names updated to generic labels (serviceProvider id unchanged)
import type { SalesInvoice } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import { useAuthStore } from '@/store/useAuthStore';

function getCurrentOrgId(): string {
  return useAuthStore.getState().organizationId ?? MOCK_ORGANIZATION_ID;
}

const getDate = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
};

let invoicesData: SalesInvoice[] = [
  {
    id: 1,
    organizationId: MOCK_ORGANIZATION_ID,
    invoiceNumber: 'INV-2024-001',
    customerId: 1,
    customerName: 'Rajesh Kumar',
    serviceProvider: 'Cable',
    planName: 'Cable Basic 50 Mbps',
    amount: 499,
    gstRate: 18,
    gstAmount: 89.82,
    totalAmount: 588.82,
    status: 'paid',
    issueDate: getDate(15),
    dueDate: getDate(5),
    createdAt: getDate(15),
  },
  {
    id: 2,
    organizationId: MOCK_ORGANIZATION_ID,
    invoiceNumber: 'INV-2024-002',
    customerId: 2,
    customerName: 'Naresh',
    serviceProvider: 'Internet 1',
    planName: 'Internet 1 Fiber Basic',
    amount: 449,
    gstRate: 18,
    gstAmount: 80.82,
    totalAmount: 529.82,
    status: 'sent',
    issueDate: getDate(8),
    dueDate: getDate(-2),
    createdAt: getDate(8),
  },
  {
    id: 3,
    organizationId: MOCK_ORGANIZATION_ID,
    invoiceNumber: 'INV-2024-003',
    customerId: 3,
    customerName: 'Amit Patel',
    serviceProvider: 'Internet 2',
    planName: 'Internet 2 Express 75 Mbps',
    amount: 599,
    gstRate: 18,
    gstAmount: 107.82,
    totalAmount: 706.82,
    status: 'draft',
    issueDate: getDate(0),
    dueDate: getDate(30),
    createdAt: getDate(0),
  },
];

export const salesInvoicesApi = {
  getAll: async (): Promise<SalesInvoice[]> => {
    const orgId = getCurrentOrgId();
    return Promise.resolve(invoicesData.filter((i) => i.organizationId === orgId));
  },
  getById: async (id: number): Promise<SalesInvoice> => {
    const inv = invoicesData.find((i) => i.id === id);
    if (!inv) throw new Error('Invoice not found');
    return inv;
  },
  create: async (invoice: Omit<SalesInvoice, 'id' | 'createdAt'>): Promise<SalesInvoice> => {
    const newInv: SalesInvoice = {
      ...invoice,
      organizationId: invoice.organizationId ?? MOCK_ORGANIZATION_ID,
      id: Math.max(0, ...invoicesData.map((i) => i.id)) + 1,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    invoicesData.push(newInv);
    return newInv;
  },
  update: async (id: number, data: Partial<SalesInvoice>): Promise<SalesInvoice> => {
    const idx = invoicesData.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error('Invoice not found');
    invoicesData[idx] = { ...invoicesData[idx], ...data };
    return invoicesData[idx];
  },
  /**
   * Download invoice PDF
   * Replace with backend PDF generation later
   */
  downloadPdf: async (id: number): Promise<void> => {
    // This will be handled by the frontend using generateSalesInvoicePdf
    // Backend replacement: return PDF blob/stream
    const inv = invoicesData.find((i) => i.id === id);
    if (!inv) throw new Error('Invoice not found');
    // Frontend will call generateSalesInvoicePdf with invoice data
  },
};
