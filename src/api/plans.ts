// API ready - replace mock with real backend
import type { Plan } from '@/models/types';
import { plansApi as basePlansApi } from './api';

/**
 * Plans API - unified interface for fetching plans
 * Replace with real API call later
 */
export const plansApi = {
  /**
   * Get all plans from all services
   * API ready - replace mock with real backend
   */
  getAll: async (): Promise<Plan[]> => {
    return basePlansApi.getAll();
  },

  /**
   * Get plans filtered by product/service name
   * API ready - replace mock with real backend
   * @param productName - Name of the product/service (e.g., Cable, Internet 1)
   */
  getByProductName: async (productName: string): Promise<Plan[]> => {
    const allPlans = await basePlansApi.getAll();
    // Filter plans where provider matches product name
    return allPlans.filter((plan) => plan.provider === productName);
  },

  /**
   * Get plan by ID
   * API ready - replace mock with real backend
   */
  getById: async (id: number): Promise<Plan> => {
    return basePlansApi.getById(id);
  },
};
