// API ready - replace mock with real backend
import type { Plan } from '@/models/types';
import { inventoryResource } from '@/api/resources';
import { useMockApi } from '@/lib/http';
import { plansApi as basePlansApi } from './api';

/**
 * Plans API - unified interface for fetching plans
 * Real path: /inventory?catalogType=isp_plan
 */
export const plansApi = {
  getAll: async (): Promise<Plan[]> => {
    if (useMockApi()) {
      return basePlansApi.getAll();
    }
    return inventoryResource.list<Plan>({ catalogType: 'isp_plan' });
  },

  getByProductName: async (productName: string): Promise<Plan[]> => {
    if (useMockApi()) {
      const allPlans = await basePlansApi.getAll();
      return allPlans.filter((plan) => plan.provider === productName);
    }
    const allPlans = await inventoryResource.list<Plan>({ catalogType: 'isp_plan' });
    return allPlans.filter((plan) => plan.provider === productName);
  },

  getById: async (id: number): Promise<Plan> => {
    if (useMockApi()) {
      return basePlansApi.getById(id);
    }
    return inventoryResource.get<Plan>(id);
  },
};
