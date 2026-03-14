import { create } from 'zustand';
import type { Subscription } from '@/models/types';
import { subscriptionsApi } from '@/api/subscriptions';

interface SubscriptionsState {
  subscriptions: Subscription[];
  loading: boolean;
  error: string | null;
  fetchSubscriptions: () => Promise<void>;
  addSubscription: (sub: Omit<Subscription, 'id' | 'createdAt'>) => Promise<void>;
  updateSubscription: (id: number, sub: Partial<Subscription>) => Promise<void>;
  deleteSubscription: (id: number) => Promise<void>;
}

export const useSubscriptionsStore = create<SubscriptionsState>((set) => ({
  subscriptions: [],
  loading: false,
  error: null,

  fetchSubscriptions: async () => {
    set({ loading: true, error: null });
    try {
      const subscriptions = await subscriptionsApi.getAll();
      set({ subscriptions, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  addSubscription: async (sub) => {
    set({ loading: true, error: null });
    try {
      await subscriptionsApi.create(sub);
      const subscriptions = await subscriptionsApi.getAll();
      set({ subscriptions, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  updateSubscription: async (id, sub) => {
    set({ loading: true, error: null });
    try {
      await subscriptionsApi.update(id, sub);
      const subscriptions = await subscriptionsApi.getAll();
      set({ subscriptions, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  deleteSubscription: async (id) => {
    set({ loading: true, error: null });
    try {
      await subscriptionsApi.delete(id);
      const subscriptions = await subscriptionsApi.getAll();
      set({ subscriptions, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
}));
