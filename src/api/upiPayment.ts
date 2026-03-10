// API ready - replace with real payment gateway / backend API
import { MOCK_ORGANIZATION_ID } from '@/models/types';

export interface UpiPaymentConfig {
  organizationId: string;
  upiId: string;
  upiDisplayName: string;
  enabled: boolean;
  /** Supported: gpay, phonepe, paytm, bhim, other */
  supportedApps: string[];
  updatedAt: string;
}

// Mock config - replace with real API later
let upiConfig: UpiPaymentConfig = {
  organizationId: MOCK_ORGANIZATION_ID,
  upiId: '',
  upiDisplayName: '',
  enabled: false,
  supportedApps: ['gpay', 'phonepe', 'paytm', 'bhim'],
  updatedAt: new Date().toISOString(),
};

export const upiPaymentApi = {
  /**
   * Get UPI payment config for current organization
   * API ready - replace with real backend
   */
  getConfig: async (organizationId?: string): Promise<UpiPaymentConfig> => {
    const id = organizationId ?? MOCK_ORGANIZATION_ID;
    if (upiConfig.organizationId !== id) {
      return { ...upiConfig, organizationId: id };
    }
    return Promise.resolve({ ...upiConfig });
  },

  /**
   * Update UPI payment config
   * API ready - replace with real backend (e.g. Stripe, Razorpay UPI, Paytm)
   */
  updateConfig: async (payload: Partial<Omit<UpiPaymentConfig, 'organizationId' | 'updatedAt'>>): Promise<UpiPaymentConfig> => {
    upiConfig = {
      ...upiConfig,
      ...payload,
      updatedAt: new Date().toISOString(),
    };
    return Promise.resolve({ ...upiConfig });
  },

  /**
   * Create payment request (e.g. generate UPI link / intent)
   * API ready - backend will integrate with UPI apps / payment gateway
   */
  createPaymentRequest: async (params: {
    amount: number;
    currency?: string;
    description?: string;
    orderId?: string;
  }): Promise<{ paymentLink?: string; upiIntent?: string; orderId: string }> => {
    const orderId = params.orderId ?? `ord_${Date.now()}`;
    // Replace with real API: return gateway UPI link / intent
    return Promise.resolve({
      paymentLink: undefined,
      upiIntent: undefined,
      orderId,
    });
  },

  /**
   * Create subscription renewal payment - monthly payment to extend subscription
   * API ready - backend will create payment link/intent and extend subscription on success
   */
  createRenewalPayment: async (params: { organizationId?: string }): Promise<{
    orderId: string;
    amount: number;
    paymentLink?: string;
    upiIntent?: string;
    message: string;
  }> => {
    const id = params.organizationId ?? MOCK_ORGANIZATION_ID;
    const orderId = `renew_${id}_${Date.now()}`;
    // Replace with real API: get monthly plan amount from backend, create payment, return link
    const monthlyAmount = 999; // Mock - backend should return plan price
    return Promise.resolve({
      orderId,
      amount: monthlyAmount,
      paymentLink: undefined,
      upiIntent: undefined,
      message: 'Backend will return UPI link / intent. After payment, subscription will be extended by 1 month.',
    });
  },
};
