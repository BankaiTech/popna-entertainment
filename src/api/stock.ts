/** Stock, suppliers, purchases and sales — Django API only. */
import apiClient from '@/lib/apiClient';
import { toCamelCase, toSnakeCase, unwrapApiData } from '@/lib/apiHelpers';

export type StockCategory = 'stb' | 'onu' | 'router' | 'cable' | 'accessory' | 'other';
export const CATEGORY_LABEL: Record<StockCategory, string> = {
  stb: 'Set-top box', onu: 'ONU / modem', router: 'Router', cable: 'Cable / wire', accessory: 'Accessory', other: 'Other',
};

export interface StockItem {
  id: number; name: string; category: StockCategory; brand: string; barcode: string; hsnCode: string;
  unit: 'pcs' | 'm' | 'roll'; trackSerials: boolean; purchasePrice: string; salePrice: string; gstRate: string;
  lowStockLevel: number; isActive: boolean; onHand: string; lowStock: boolean;
}
export interface StockUnit {
  id: number; serial: string; status: 'in_stock' | 'sold' | 'faulty' | 'returned'; item: number; itemName: string;
  salePrice: string; gstRate: string; customer: number | null; customerName: string | null;
}
export interface Supplier { id: number; name: string; mobile: string; gstin: string; address: string }
export interface DocLine {
  id: number; item: number; itemName: string; hsnCode: string; quantity: string; unitPrice: string; gstRate: string;
  taxable: string; gstAmount: string; total: string; serials: string[];
}
export interface Purchase {
  id: number; supplier: number; supplierName: string; billNo: string; billDate: string; taxableTotal: string;
  gstTotal: string; grandTotal: string; note: string; lines: DocLine[];
}
export interface Sale {
  id: number; invoiceNo: string; saleDate: string; customer: number | null; customerName: string; customerMobile: string;
  paymentMethod: 'cash' | 'upi' | 'credit'; taxableTotal: string; gstTotal: string; cgst: string; sgst: string;
  grandTotal: string; note: string; lines: DocLine[];
}
export interface LineInput { itemId: number; quantity?: number; unitPrice: number; gstRate?: number; serials?: string[] }

const list = async <T,>(url: string, params?: Record<string, unknown>): Promise<T[]> => {
  const data = unwrapApiData<unknown[]>(await apiClient.get(url, { params }));
  return (Array.isArray(data) ? data : []).map((x) => toCamelCase<T>(x));
};
const one = async <T,>(p: Promise<unknown>): Promise<T> => toCamelCase<T>(unwrapApiData((await p) as never));
const lines = (ls: LineInput[]) => ls.map((l) => toSnakeCase(l as unknown as Record<string, unknown>));

export const stockApi = {
  items: (params?: Record<string, unknown>) => list<StockItem>('/stock-items', params),
  saveItem: (item: Partial<StockItem>) =>
    one<StockItem>(item.id
      ? apiClient.patch(`/stock-items/${item.id}`, toSnakeCase(item as Record<string, unknown>))
      : apiClient.post('/stock-items', toSnakeCase(item as Record<string, unknown>))),
  units: (params: Record<string, unknown>) => list<StockUnit>('/stock-units', params),
  setUnitStatus: (id: number, status: StockUnit['status']) => one<StockUnit>(apiClient.patch(`/stock-units/${id}`, { status })),
  suppliers: () => list<Supplier>('/suppliers'),
  addSupplier: (s: Partial<Supplier>) => one<Supplier>(apiClient.post('/suppliers', toSnakeCase(s as Record<string, unknown>))),
  purchases: () => list<Purchase>('/purchases'),
  createPurchase: (p: { supplierId: number; billNo?: string; billDate?: string; note?: string; lines: LineInput[] }) =>
    one<Purchase>(apiClient.post('/purchases', { supplier_id: p.supplierId, bill_no: p.billNo ?? '', bill_date: p.billDate,
      note: p.note ?? '', lines: lines(p.lines) })),
  sales: () => list<Sale>('/sales'),
  createSale: (s: { customerId?: number | null; customerName?: string; customerMobile?: string;
    paymentMethod: Sale['paymentMethod']; note?: string; lines: LineInput[] }) =>
    one<Sale>(apiClient.post('/sales', { customer_id: s.customerId ?? null, customer_name: s.customerName ?? '',
      customer_mobile: s.customerMobile ?? '', payment_method: s.paymentMethod, note: s.note ?? '', lines: lines(s.lines) })),
};

export const rupees = (v: string | number) => `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
