import { mockCustomers, mockCustomersExtra } from './mockData';
import type { Customer } from '@/models/types';

// All customers across all orgs, for authentication purposes only
const allMockCustomers = [...mockCustomers, ...mockCustomersExtra];

/**
 * Mock Customer Authentication Service
 * Validate mobile + password against customer data.
 * Replace with secure auth & hashing later.
 */

export interface CustomerAuthResponse {
  success: boolean;
  customerId?: number;
  customerMobile?: string;
  message?: string;
}

/**
 * Authenticate customer by mobile number and password.
 *
 * @param mobile - 10-digit mobile number
 * @param password - Customer password (plain text for mock only)
 * @returns CustomerAuthResponse with success status and customer data
 */
export const loginCustomer = async (mobile: string, password: string): Promise<CustomerAuthResponse> => {
  // Replace with secure auth & hashing later

  // Validate mobile format (10 digits)
  if (!/^\d{10}$/.test(mobile)) {
    return {
      success: false,
      message: 'Invalid mobile number format. Please enter a 10-digit number.',
    };
  }

  if (!password || password.trim() === '') {
    return {
      success: false,
      message: 'Invalid mobile number or password',
    };
  }

  // Get all customers across all orgs for authentication (not org-scoped)
  // Fallback chain: localStorage (org-specific) → allMockCustomers (all orgs)
  let customers: Customer[] = [];
  try {
    const stored = localStorage.getItem('customers-data');
    const parsed: Customer[] = stored ? JSON.parse(stored) : [];
    // Merge stored customers with all mock customers (covers all orgs)
    const storedIds = new Set(parsed.map((c) => c.id));
    customers = [...parsed, ...allMockCustomers.filter((c) => !storedIds.has(c.id))];
  } catch {
    customers = allMockCustomers;
  }

  // Find customer by mobile and validate password
  const customer = customers.find(
    (c: Customer) => c.mobile === mobile && (c.password ?? '') === password
  );

  if (!customer) {
    return {
      success: false,
      message: 'Invalid mobile number or password',
    };
  }

  return {
    success: true,
    customerId: customer.id,
    customerMobile: customer.mobile,
  };
};

/**
 * Get customer data by ID
 *
 * @param customerId - Customer ID
 * @returns Customer object or null
 */
export const getCustomerById = (customerId: number): Customer | null => {
  return allMockCustomers.find((c: Customer) => c.id === customerId) || null;
};

/**
 * Get customer data by mobile number
 *
 * @param mobile - Mobile number
 * @returns Customer object or null
 */
export const getCustomerByMobile = (mobile: string): Customer | null => {
  return allMockCustomers.find((c: Customer) => c.mobile === mobile) || null;
};
