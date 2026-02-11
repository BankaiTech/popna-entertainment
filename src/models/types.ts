export type Provider = 'GTPL' | 'BSNL' | 'Railwire' | 'Krishiinet';

/** Service separation: Cable (GTPL only) vs Internet (BSNL, Railwire, Krishiinet). Do NOT mix GTPL with internet providers. */
export type ServiceCategory = 'cable' | 'internet';

/** Cable service: GTPL only. */
export const CABLE_PROVIDER: Provider = 'GTPL';

/** Internet services: BSNL, Railwire, Krishiinet. */
export const INTERNET_PROVIDERS: Provider[] = ['BSNL', 'Railwire', 'Krishiinet'];

export type CustomerStatus = 'Active' | 'Inactive';

/** GTPL-only: payment status for cable network billing. */
export type PaymentStatus = 'paid' | 'not_paid';

export type ComplaintStatus = 'active' | 'on-hold' | 'completed';

// Multi-tenant ready — backend will enforce org isolation
export const MOCK_ORGANIZATION_ID = 'org_001';

export interface Plan {
  id: number;
  organizationId: string;
  provider: Provider;
  planName: string;
  imageUrl: string;
  price: number;
  gstRate: number;
  installationAmount: number;
  description: string;
}

export interface Address {
  line1: string;
  line2: string;
  city: string;
  state: string;
  country: string;
}

export interface Customer {
  id: number;
  organizationId: string;
  name: string;
  email: string;
  mobile: string;
  /** Plain text for mock only. Replace with secure auth & hashing later. */
  password?: string;
  connectionType: Provider;
  package: string;
  status: CustomerStatus;
  description?: string;
  address: Address;
  createdAt: string;
  /** GTPL only. Values set by "Update Payment Status". */
  paymentStatus?: PaymentStatus;
  paymentDescription?: string;
  paymentUpdatedAt?: string;
}

export interface DashboardStats {
  totalCustomers: number;
  gtplCustomers: number;
  bsnlCustomers: number;
  railwireCustomers: number;
  krishiinetCustomers: number;
  newCustomersThisMonth: number;
  activeCustomers: number;
  inactiveCustomers: number;
  activeByProvider: {
    GTPL: number;
    BSNL: number;
    Railwire: number;
    Krishiinet: number;
  };
  inactiveByProvider: {
    GTPL: number;
    BSNL: number;
    Railwire: number;
    Krishiinet: number;
  };
}

export interface Complaint {
  id: number;
  organizationId: string;
  customerId: number;
  customerName: string;
  mobile: string;
  connectionType: Provider;
  customerDescription: string;
  internalDescription?: string;
  status: ComplaintStatus;
  createdAt: string;
  /** Closure photo: base64 or object URL (mock only). Replace with backend image upload later. */
  closureImage?: string;
  /** Date/time when complaint was closed (ISO string). */
  closedAt?: string;
}

/** Admin/Employee user. password is plain text for mock only. */
export interface User {
  id: number;
  organizationId: string;
  name: string;
  username: string;
  password: string;
  role: 'admin' | 'employee';
  createdAt: string;
}

/** Sales invoice (mock structure — PDF ready). */
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';

export interface SalesInvoice {
  id: number;
  organizationId: string;
  invoiceNumber: string;
  customerId: number;
  customerName: string;
  serviceProvider: Provider;
  planName: string;
  amount: number;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  createdAt: string;
}

/** Purchase invoice (vendor, GST breakup, reference). */
export interface PurchaseInvoice {
  id: number;
  organizationId: string;
  invoiceNumber: string;
  vendorId: number;
  vendorName: string;
  reference?: string;
  amount: number;
  gstBreakup: { cgst?: number; sgst?: number; igst?: number };
  totalAmount: number;
  issueDate: string;
  createdAt: string;
}

export interface Vendor {
  id: number;
  organizationId: string;
  name: string;
  contact?: string;
  gstin?: string;
  createdAt: string;
}

/** Dynamic Product - Multi-tenant ready — backend will isolate by organization */
export interface Product {
  id: number;
  organizationId: string;
  name: string;
  productType: 'cable' | 'internet';
  isActive: boolean;
  createdAt: string;
}

/** Company Profile - Multi-tenant ready — backend will isolate by organization */
export interface CompanyProfile {
  id: number;
  organizationId: string;
  companyName: string;
  gstin: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  contactNumber: string;
  email: string;
  updatedAt: string;
}

/** Website Settings - Multi-tenant ready — backend will isolate by organization */
export interface HighlightCard {
  title: string;
  description: string;
  icon: string; // Icon name from lucide-react
}

export interface WebsiteSettings {
  id: number;
  organizationId: string;
  heroTitle: string;
  heroSubtitle: string;
  heroDescription: string;
  heroImage?: string;
  highlightSectionTitle: string;
  highlightCards: HighlightCard[];
  ctaButtonText: string;
  ctaButtonLink: string;
  updatedAt: string;
}
