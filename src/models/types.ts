export type Provider = 'GTPL' | 'BSNL' | 'Railwire' | 'Krishiinet';

export type CustomerStatus = 'Active' | 'Inactive';

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
  connectionType: Provider;
  package: string;
  status: CustomerStatus;
  description?: string;
  address: Address;
  createdAt: string;
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
}
