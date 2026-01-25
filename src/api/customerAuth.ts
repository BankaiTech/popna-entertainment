import { mockCustomers } from './mockData';
import type { Customer } from '@/models/types';

/**
 * Mock Customer Authentication Service
 * Validate mobile + password against mockCustomers.
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
export const loginCustomer = (mobile: string, password: string): CustomerAuthResponse => {
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

  // Find customer in mock data by mobile and validate password
  const customer = mockCustomers.find(
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
  const customer = mockCustomers.find((c: Customer) => c.id === customerId);
  return customer || null;
};

/**
 * Get customer data by mobile number
 *
 * @param mobile - Mobile number
 * @returns Customer object or null
 */
export const getCustomerByMobile = (mobile: string): Customer | null => {
  const customer = mockCustomers.find((c: Customer) => c.mobile === mobile);
  return customer || null;
};
