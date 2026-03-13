import { create } from 'zustand';
import type { Expense } from '@/models/types';
import { expensesApi } from '@/api/expenses';

interface ExpenseState {
  expenses: Expense[];
  loading: boolean;
  error: string | null;
  fetchExpenses: () => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt' | 'expenseNumber'>) => Promise<void>;
  updateExpense: (id: number, expense: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: number) => Promise<void>;
}

export const useExpenseStore = create<ExpenseState>((set) => ({
  expenses: [],
  loading: false,
  error: null,

  fetchExpenses: async () => {
    set({ loading: true, error: null });
    try {
      const expenses = await expensesApi.getAll();
      set({ expenses, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  addExpense: async (expense) => {
    set({ loading: true, error: null });
    try {
      await expensesApi.create(expense);
      const expenses = await expensesApi.getAll();
      set({ expenses, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  updateExpense: async (id, expense) => {
    set({ loading: true, error: null });
    try {
      await expensesApi.update(id, expense);
      const expenses = await expensesApi.getAll();
      set({ expenses, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  deleteExpense: async (id) => {
    set({ loading: true, error: null });
    try {
      await expensesApi.delete(id);
      const expenses = await expensesApi.getAll();
      set({ expenses, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
}));
