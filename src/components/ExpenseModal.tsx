import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import type { Expense, ExpenseStatus, PaymentMethod } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense?: Expense | null;
  onSave: (expense: Omit<Expense, 'id' | 'createdAt' | 'expenseNumber'>) => Promise<void>;
  onUpdate: (id: number, expense: Partial<Expense>) => Promise<void>;
}

const EXPENSE_CATEGORIES = [
  'Office Supplies', 'Utilities', 'Travel', 'Rent', 'Salaries',
  'Marketing', 'Maintenance', 'Insurance', 'Subscriptions', 'Miscellaneous',
];

const ExpenseModal = ({ isOpen, onClose, expense, onSave, onUpdate }: ExpenseModalProps) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    category: '',
    description: '',
    amount: 0,
    taxAmount: 0,
    totalAmount: 0,
    paymentMethod: 'cash' as PaymentMethod,
    paymentDate: new Date().toISOString().split('T')[0],
    status: 'pending' as ExpenseStatus,
    notes: '',
  });

  useEffect(() => {
    if (expense) {
      setFormData({
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        taxAmount: expense.taxAmount,
        totalAmount: expense.totalAmount,
        paymentMethod: expense.paymentMethod,
        paymentDate: expense.paymentDate,
        status: expense.status,
        notes: expense.notes || '',
      });
    } else {
      setFormData({
        category: '',
        description: '',
        amount: 0,
        taxAmount: 0,
        totalAmount: 0,
        paymentMethod: 'cash',
        paymentDate: new Date().toISOString().split('T')[0],
        status: 'pending',
        notes: '',
      });
    }
  }, [expense, isOpen]);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      totalAmount: prev.amount + prev.taxAmount,
    }));
  }, [formData.amount, formData.taxAmount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category || !formData.description || formData.amount <= 0) return;
    setLoading(true);
    try {
      if (expense) {
        await onUpdate(expense.id, formData);
      } else {
        await onSave({
          ...formData,
          organizationId: MOCK_ORGANIZATION_ID,
        });
      }
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

  return (
    <Dialog open={isOpen} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit}>
        <DialogHeader
          title={expense ? t('expenses.editExpense', 'Edit Expense') : t('expenses.addExpense', 'Add Expense')}
          onClose={onClose}
        />
        <DialogBody>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{t('expenses.category', 'Category')} *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">{t('common.select', 'Select...')}</option>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>{t('expenses.paymentMethod', 'Payment Method')}</label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as PaymentMethod })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="cash">{t('common.cash', 'Cash')}</option>
                <option value="upi">{t('common.upi', 'UPI')}</option>
                <option value="card">{t('common.card', 'Card')}</option>
                <option value="other">{t('common.other', 'Other')}</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass}>{t('expenses.description', 'Description')} *</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
                required
              />
            </div>

            <div>
              <label className={labelClass}>{t('expenses.amount', 'Amount')} *</label>
              <Input
                type="number"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                min={0}
                step={0.01}
                required
              />
            </div>

            <div>
              <label className={labelClass}>{t('expenses.taxAmount', 'Tax Amount')}</label>
              <Input
                type="number"
                value={formData.taxAmount || ''}
                onChange={(e) => setFormData({ ...formData, taxAmount: Number(e.target.value) })}
                min={0}
                step={0.01}
              />
            </div>

            <div>
              <label className={labelClass}>{t('expenses.totalAmount', 'Total Amount')}</label>
              <Input type="number" value={formData.totalAmount} readOnly />
            </div>

            <div>
              <label className={labelClass}>{t('expenses.paymentDate', 'Payment Date')}</label>
              <Input
                type="date"
                value={formData.paymentDate}
                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
              />
            </div>

            <div>
              <label className={labelClass}>{t('common.status', 'Status')}</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as ExpenseStatus })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="pending">{t('expenses.statusPending', 'Pending')}</option>
                <option value="approved">{t('expenses.statusApproved', 'Approved')}</option>
                <option value="rejected">{t('expenses.statusRejected', 'Rejected')}</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass}>{t('expenses.notes', 'Notes')}</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
              />
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button type="submit" loading={loading}>
            {expense ? t('common.update', 'Update') : t('common.save', 'Save')}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
};

export default ExpenseModal;
