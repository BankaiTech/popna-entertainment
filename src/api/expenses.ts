import type { Expense } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import { documentsResource } from '@/api/resources';
import { useMockApi } from '@/lib/http';
import { useAuthStore } from '@/store/useAuthStore';
import { getIndustryExpenses } from './industryMockData';

function getCurrentOrgId(): string {
  return useAuthStore.getState().organizationId ?? MOCK_ORGANIZATION_ID;
}

const now = new Date().toISOString();

// ISP expenses (org_001)
const ispExpenses: Expense[] = [
  { id: 1, organizationId: MOCK_ORGANIZATION_ID, expenseNumber: 'EXP-2026-001', category: 'Office Supplies', description: 'Printer paper and ink cartridges', amount: 2500, taxAmount: 450, totalAmount: 2950, paymentMethod: 'upi', paymentDate: '2026-03-01', status: 'approved', approvedBy: 'admin', createdAt: now },
  { id: 2, organizationId: MOCK_ORGANIZATION_ID, expenseNumber: 'EXP-2026-002', category: 'Utilities', description: 'Electricity bill - March', amount: 8500, taxAmount: 1530, totalAmount: 10030, paymentMethod: 'other', paymentDate: '2026-03-05', status: 'pending', createdAt: now },
  { id: 3, organizationId: MOCK_ORGANIZATION_ID, expenseNumber: 'EXP-2026-003', category: 'Travel', description: 'Client visit - fuel and toll', amount: 1200, taxAmount: 0, totalAmount: 1200, paymentMethod: 'cash', paymentDate: '2026-03-10', status: 'approved', approvedBy: 'admin', createdAt: now },
];

let expensesData: Expense[] = [...ispExpenses, ...getIndustryExpenses()];
let nextId = Math.max(0, ...expensesData.map((e) => e.id)) + 1;

function generateExpenseNumber(): string {
  const year = new Date().getFullYear();
  const num = String(nextId).padStart(3, '0');
  return `EXP-${year}-${num}`;
}

export const expensesApi = {
  getAll: async (): Promise<Expense[]> => {
    if (useMockApi()) {
      const orgId = getCurrentOrgId();
      return Promise.resolve(expensesData.filter((e) => e.organizationId === orgId));
    }
    return documentsResource.list<Expense>('expense');
  },
  getById: async (id: number): Promise<Expense> => {
    if (useMockApi()) {
      const item = expensesData.find((e) => e.id === id);
      if (!item) throw new Error('Expense not found');
      return Promise.resolve(item);
    }
    return documentsResource.get<Expense>(id);
  },
  create: async (expense: Omit<Expense, 'id' | 'createdAt' | 'expenseNumber'>): Promise<Expense> => {
    if (useMockApi()) {
      const newExpense: Expense = {
        ...expense,
        organizationId: expense.organizationId ?? getCurrentOrgId(),
        id: nextId++,
        expenseNumber: generateExpenseNumber(),
        createdAt: new Date().toISOString(),
      };
      expensesData.push(newExpense);
      return Promise.resolve(newExpense);
    }
    return documentsResource.create<Expense>({ kind: 'expense', ...expense });
  },
  update: async (id: number, expense: Partial<Expense>): Promise<Expense> => {
    if (useMockApi()) {
      const index = expensesData.findIndex((e) => e.id === id);
      if (index === -1) throw new Error('Expense not found');
      expensesData[index] = { ...expensesData[index], ...expense };
      return Promise.resolve(expensesData[index]);
    }
    return documentsResource.update<Expense>(id, { ...expense });
  },
  delete: async (id: number): Promise<void> => {
    if (useMockApi()) {
      const index = expensesData.findIndex((e) => e.id === id);
      if (index === -1) throw new Error('Expense not found');
      expensesData.splice(index, 1);
      return Promise.resolve();
    }
    await documentsResource.remove(id);
  },
};
