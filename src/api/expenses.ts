import type { Expense } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';

const now = new Date().toISOString();

let expensesData: Expense[] = [
  {
    id: 1, organizationId: MOCK_ORGANIZATION_ID, expenseNumber: 'EXP-2026-001',
    category: 'Office Supplies', description: 'Printer paper and ink cartridges',
    amount: 2500, taxAmount: 450, totalAmount: 2950,
    paymentMethod: 'upi', paymentDate: '2026-03-01', status: 'approved',
    approvedBy: 'admin', createdAt: now,
  },
  {
    id: 2, organizationId: MOCK_ORGANIZATION_ID, expenseNumber: 'EXP-2026-002',
    category: 'Utilities', description: 'Electricity bill - March',
    amount: 8500, taxAmount: 1530, totalAmount: 10030,
    paymentMethod: 'bank_transfer' as Expense['paymentMethod'], paymentDate: '2026-03-05',
    status: 'pending', createdAt: now,
  },
  {
    id: 3, organizationId: MOCK_ORGANIZATION_ID, expenseNumber: 'EXP-2026-003',
    category: 'Travel', description: 'Client visit - fuel and toll',
    amount: 1200, taxAmount: 0, totalAmount: 1200,
    paymentMethod: 'cash', paymentDate: '2026-03-10', status: 'approved',
    approvedBy: 'admin', createdAt: now,
  },
];

let nextId = 4;

function generateExpenseNumber(): string {
  const year = new Date().getFullYear();
  const num = String(nextId).padStart(3, '0');
  return `EXP-${year}-${num}`;
}

export const expensesApi = {
  getAll: async (): Promise<Expense[]> => {
    return Promise.resolve([...expensesData]);
  },
  getById: async (id: number): Promise<Expense> => {
    const item = expensesData.find((e) => e.id === id);
    if (!item) throw new Error('Expense not found');
    return Promise.resolve(item);
  },
  create: async (expense: Omit<Expense, 'id' | 'createdAt' | 'expenseNumber'>): Promise<Expense> => {
    const newExpense: Expense = {
      ...expense,
      organizationId: expense.organizationId ?? MOCK_ORGANIZATION_ID,
      id: nextId++,
      expenseNumber: generateExpenseNumber(),
      createdAt: new Date().toISOString(),
    };
    expensesData.push(newExpense);
    return Promise.resolve(newExpense);
  },
  update: async (id: number, expense: Partial<Expense>): Promise<Expense> => {
    const index = expensesData.findIndex((e) => e.id === id);
    if (index === -1) throw new Error('Expense not found');
    expensesData[index] = { ...expensesData[index], ...expense };
    return Promise.resolve(expensesData[index]);
  },
  delete: async (id: number): Promise<void> => {
    const index = expensesData.findIndex((e) => e.id === id);
    if (index === -1) throw new Error('Expense not found');
    expensesData.splice(index, 1);
    return Promise.resolve();
  },
};
