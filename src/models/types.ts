// SaaS Ready - Fully Dynamic Product
/** Connection type = product name from Admin → Settings → Products. Products fully dynamic - no hardcoded service names. */
export type Provider = string;

/** Service separation: Cable vs Internet. Do NOT mix cable with internet providers. */
export type ServiceCategory = 'cable' | 'internet';

export type CustomerStatus = 'Active' | 'Inactive';

// SaaS Ready - Payment applies to ALL product types (cable, internet, future products)
export type PaymentStatus = 'paid' | 'not_paid';

/** How the payment was collected - e.g. UPI, Cash, Card. For reporting and reconciliation. */
export type PaymentMethod = 'cash' | 'upi' | 'card' | 'other';

export type ComplaintStatus = 'active' | 'on-hold' | 'completed';

export type ConnectionRequestStatus = 'New' | 'Converted';

// Multi-tenant SaaS Isolation - backend will enforce org isolation
export const MOCK_ORGANIZATION_ID = 'org_001';

// SaaS Master Controller created
export type OrganizationStatus = 'active' | 'disabled' | 'suspended';

/** All available modules that can be assigned to an organization */
export const ALL_MODULES = [
  'dashboard', 'contacts', 'complaints', 'payments',
  'invoices', 'purchase-invoices', 'users', 'settings', 'connection-requests',
  'inventory-products', 'products', 'branches', 'pos'
] as const;

/** All available settings tabs that can be assigned to an organization */
export const ALL_SETTINGS_TABS = [
  'company', 'products', 'billing', 'pos'
] as const;

export type ModuleKey = typeof ALL_MODULES[number];
export type SettingsTabKey = typeof ALL_SETTINGS_TABS[number];

// ── Super Admin Permission System ──
export const ALL_SA_PERMISSIONS = [
  'sa_dashboard',
  'sa_organizations_view',
  'sa_organizations_add',
  'sa_organizations_edit',
  'sa_organizations_inactive',
  'sa_signup_requests',
  'sa_users',
] as const;

export type SAPermissionKey = typeof ALL_SA_PERMISSIONS[number];
export type SuperAdminRole = 'super_admin' | 'manager';

export interface SuperAdminUser {
  id: number;
  name: string;
  username: string;
  password: string;
  role: SuperAdminRole;
  status: 'active' | 'inactive';
  allowedPermissions?: SAPermissionKey[];
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  status: OrganizationStatus;
  allowedModules: ModuleKey[];
  allowedSettingsTabs: SettingsTabKey[];
  subscriptionStart: string;
  subscriptionEnd: string;
}

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
  /** Permanent discount percentage (0–100) for this plan */
  permanentDiscount?: number;
}

export interface Address {
  line1: string;
  line2: string;
  city: string;
  state: string;
  country: string;
  pincode?: string;
  gstin?: string;
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
  additionalAddresses?: Address[];
  createdAt: string;
  // Payment Collection System - SaaS Ready (applies to ALL product types)
  paymentStatus?: PaymentStatus;
  paymentDescription?: string;
  paymentUpdatedAt?: string;
  /** How payment was collected: UPI, Cash, Card, etc. */
  paymentMethod?: PaymentMethod;
  /** Amount collected (supports partial payment) */
  collectedAmount?: number;
  /** Remaining balance after partial payment */
  balanceAmount?: number;
  /** Optional GSTIN field for GST invoice support */
  gstin?: string | null;
  /** Box number - only for cable product customers */
  boxNumber?: string;
  /** STB No/User ID - Set-Top Box number or User ID */
  stbNumber?: string;
  /** CAN/CAF ID - Customer Account Number or Customer Application Form ID */
  canCafId?: string;
  /** CIN - Customer Identification Number */
  cin?: string;
  /** Area - Customer's service area */
  area?: string;
  /** Permanent discount percentage (0–100) applied to plan amount */
  permanentDiscount?: number;
  /** Username of the user who last collected payment (for employee collection stats) */
  collectedByUsername?: string;
}

// SaaS Dashboard KPI cards implemented
export interface DashboardStats {
  totalCustomers: number;
  newCustomersThisMonth: number;
  activeCustomers: number;
  inactiveCustomers: number;
  /** Built from customer connectionType; keys = product names from Products API. */
  activeByProvider: Record<string, number>;
  /** Built from customer connectionType; keys = product names from Products API. */
  inactiveByProvider: Record<string, number>;
  // Payment Metrics
  totalAmountCollected: number;
  totalPendingAmount: number;
  overdueAmount: number;
  // Complaint Metrics
  totalComplaints: number;
  activeComplaints: number;
  onHoldComplaints: number;
  // Connection Metrics
  newConnectionRequests: number;
  convertedConnections: number;
  // Plan & Product Metrics
  totalActivePlans: number;
  totalProducts: number;
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
  /** Module-based access - which sidebar modules this user can access (employees only) */
  allowedModules?: ModuleKey[];
  /** Branch assignment */
  branchId?: number;
  createdAt: string;
}

/** Sales invoice (mock structure - PDF ready). GST-compliant fields supported. */
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';

/** Invoice type as per GST: Tax Invoice (with GST) or Bill of Supply (exempt/compounding). */
export type InvoiceType = 'tax_invoice' | 'bill_of_supply';

export interface SalesInvoice {
  id: number;
  organizationId: string;
  invoiceNumber: string;
  branchId?: number;
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
  /** GST: Tax Invoice or Bill of Supply */
  invoiceType?: InvoiceType;
  /** GST: Place of supply (state name or code) */
  placeOfSupply?: string;
  /** GST: HSN/SAC code (e.g. 998314 for telecom/broadband services) */
  hsnSac?: string;
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

/** Dynamic Product - Multi-tenant ready - backend will isolate by organization */
// Product cut-off configuration added
export interface Product {
  id: number;
  organizationId: string;
  name: string;
  productType: 'cable' | 'internet';
  isActive: boolean;
  createdAt: string;
  /** Cut-off date (day of month, 1-28) - only for cable products */
  cutoffDate?: number;
  /** Cut-off days (days after due date) - only for internet products */
  cutoffDays?: number;
}

/** Company Profile - Multi-tenant ready - backend will isolate by organization */
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

/** Website Settings - Multi-tenant ready - backend will isolate by organization */
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

// SaaS Ready - Client/Partner dashboard access configuration
/** Defines which sidebar tabs a client/partner company can access */
export interface ClientConfig {
  id: number;
  organizationId: string;
  clientName: string;
  username: string;
  password: string;
  /** Allowed sidebar tab keys - admin controls this per client */
  allowedTabs: string[];
  status: 'active' | 'inactive';
  createdAt: string;
}

// ===== Business Management Types =====

/** Supplier for contacts module */
export interface Supplier {
  id: number;
  organizationId: string;
  name: string;
  contactPerson?: string;
  mobile: string;
  email?: string;
  taxNumber?: string;
  openingBalance?: number;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
  };
  additionalAddresses?: Address[];
  createdAt: string;
}

/** Unit of measurement for products */
export interface Unit {
  id: number;
  organizationId: string;
  name: string;
  shortName: string;
  createdAt: string;
}

/** Product category */
export interface Category {
  id: number;
  organizationId: string;
  name: string;
  code: string;
  description?: string;
  createdAt: string;
}

/** Product sub-category */
export interface SubCategory {
  id: number;
  organizationId: string;
  categoryId: number;
  name: string;
  createdAt: string;
}

/** Business branch/location */
export interface Branch {
  id: number;
  organizationId: string;
  name: string;
  location?: string;
  /** @deprecated Use structured address fields instead */
  address?: string;
  phone?: string;
  gstin?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  isActive: boolean;
  createdAt: string;
}

/** Tax rate configuration */
export interface TaxRate {
  id: number;
  organizationId: string;
  name: string;
  rate: number;
  type: 'inclusive' | 'exclusive';
  createdAt: string;
}

/** Warranty configuration */
export interface Warranty {
  id: number;
  organizationId: string;
  name: string;
  duration: number;
  durationUnit: 'days' | 'months' | 'years';
  createdAt: string;
}

/** Product variant */
export interface ProductVariant {
  id: number;
  variantName: string;
  price: number;
  taxType: 'inclusive' | 'exclusive' | 'none';
  skuId: string;
  warrantyId?: number;
  mrp?: number;           // Maximum Retail Price per variant
  purchasePrice?: number; // Cost/purchase price per variant
  barcode?: string;       // EAN/UPC barcode per variant
  currentStock?: number;  // Stock on hand per variant
}

/** Inventory product - full business product (multi-business: supermarket, ISP, textile, pharma, electronics) */
export interface InventoryProduct {
  id: number;
  organizationId: string;
  name: string;
  sku: string;
  categoryId?: number;
  categoryCode?: string;
  subCategoryId?: number;
  branchId?: number;
  unitId?: number;
  stockAlert?: number;
  taxType: 'inclusive' | 'exclusive' | 'none';
  taxRateId?: number;
  warrantyId?: number;
  description?: string;
  price: number;
  image?: string;
  variants: ProductVariant[];
  isActive: boolean;
  createdAt: string;
  // Multi-business fields
  productType?: 'physical' | 'service' | 'digital' | 'bundle';
  brand?: string;
  /** HSN code (goods) or SAC code (services) - mandatory for Indian GST compliance */
  hsnSacCode?: string;
  /** Maximum Retail Price - printed on labels; required for FMCG/retail */
  mrp?: number;
  /** Cost/purchase price - for margin and profit calculation */
  purchasePrice?: number;
  /** Current stock quantity on hand */
  currentStock?: number;
  /** Reorder point - triggers alert when stock falls to or below this */
  reorderLevel?: number;
  /** none = no tracking | serial = per-unit serial number (electronics, ISP equipment) | batch = batch/lot (pharma, FMCG) */
  trackingType?: 'none' | 'serial' | 'batch';
  /** EAN-13, UPC-A, or custom barcode for scanning */
  barcode?: string;
  weight?: number;
  weightUnit?: 'g' | 'kg' | 'lb';
  /** Enable expiry date tracking - for pharma and FMCG */
  expiryTracking?: boolean;
}

/** Label print configuration */
export interface LabelConfig {
  showProductName: boolean;
  showProductVariation: boolean;
  showProductPrice: boolean;
  showBusinessName: boolean;
  showCurrency: boolean;
  showPackingDate: boolean;
}

