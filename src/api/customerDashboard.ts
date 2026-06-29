import apiClient from '@/lib/apiClient';
import { isMockMode, toCamelCase, unwrapApiData } from '@/lib/apiHelpers';
import { endpoints } from './endpoints';

export interface CustomerDashboardData {
  invoices?: unknown[];
  subscriptions?: unknown[];
  complaints?: unknown[];
  [key: string]: unknown;
}

export const customerDashboardApi = {
  get: async (): Promise<CustomerDashboardData> => {
    if (isMockMode()) return {};
    const response = await apiClient.get(endpoints.customerDashboard);
    return toCamelCase<CustomerDashboardData>(unwrapApiData(response));
  },
};
