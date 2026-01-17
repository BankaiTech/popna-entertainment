import { mockCustomers } from './mockData';
import type { Customer } from '@/models/types';

/**
 * Mock Customer Authentication Service
 * 
 * TODO: Replace with OTP based authentication later
 * This is a temporary mock implementation for development
 */

export interface CustomerAuthResponse {
  success: boolean;
  customerId?: number;
  customerMobile?: string;
  message?: string;
}

/**
 * Authenticate customer by mobile number
 * 
 * @param mobile - 10-digit mobile number
 * @returns CustomerAuthResponse with success status and customer data
 */
export const loginCustomer = (mobile: string): CustomerAuthResponse => {
  // Validate mobile format (10 digits)
  if (!/^\d{10}$/.test(mobile)) {
    return {
      success: false,
      message: 'Invalid mobile number format. Please enter a 10-digit number.',
    };
  }

  // Find customer in mock data by mobile number
  const customer = mockCustomers.find((c: Customer) => c.mobile === mobile);

  if (!customer) {
    return {
      success: false,
      message: 'Customer not found. Please check your mobile number.',
    };
  }

  // Successful authentication
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
