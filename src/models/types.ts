// SaaS Ready — Fully Dynamic Product
/** Connection type = product name from Admin → Settings → Products. Products fully dynamic — no hardcoded service names. */
export type Provider = string;

/** Service separation: Cable vs Internet. Do NOT mix cable with internet providers. */
export type ServiceCategory = 'cable' | 'internet';

export type CustomerStatus = 'Active' | 'Inactive';

// SaaS Ready — Payment applies to ALL product types (cable, internet, future products)
export type PaymentStatus = 'paid' | 'not_paid';

export type ComplaintStatus = 'active' | 'on-hold' | 'completed';

export type ConnectionRequestStatus = 'New' | 'Contacted' | 'Converted';

// Multi-tenant SaaS Isolation — backend will enforce org isolation
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
  // Payment Collection System — SaaS Ready (applies to ALL product types)
  paymentStatus?: PaymentStatus;
  paymentDescription?: string;
  paymentUpdatedAt?: string;
  /** Amount collected (supports partial payment) */
  collectedAmount?: number;
  /** Remaining balance after partial payment */
  balanceAmount?: number;
  /** Optional GSTIN field for GST invoice support */
  gstin?: string | null;
}

export interface DashboardStats {
  totalCustomers: number;
  newCustomersThisMonth: number;
  activeCustomers: number;
  inactiveCustomers: number;
  /** Built from customer connectionType; keys = product names from Products API. */
  activeByProvider: Record<string, number>;
  /** Built from customer connectionType; keys = product names from Products API. */
  inactiveByProvider: Record<string, number>;
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
  status: 'active' | 'inactive';
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

// Vendor address fields added for purchase invoice display
export interface Vendor {
  id: number;
  organizationId: string;
  name: string;
  contact?: string;
  gstin?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
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

/** Connection Request - Frontend plan request from customers */
export interface ConnectionRequest {
  id: number;
  organizationId: string;
  name: string;
  mobile: string;
  email?: string;
  packageId: number; // Plan ID
  productId: number; // Product ID
  planName: string; // Denormalized for display
  productName: string; // Denormalized for display
  status: ConnectionRequestStatus;
  createdAt: string;
}
