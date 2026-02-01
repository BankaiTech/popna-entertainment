export type Provider = 'GTPL' | 'BSNL' | 'Railwire' | 'Krishiinet';

export type CustomerStatus = 'Active' | 'Inactive';

/** GTPL-only: payment status for cable network billing. */
export type PaymentStatus = 'paid' | 'not_paid';

export type ComplaintStatus = 'active' | 'on-hold' | 'completed';

export interface Plan {
  id: number;
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
  name: string;
  username: string;
  password: string;
  role: 'admin' | 'employee';
  createdAt: string;
}
