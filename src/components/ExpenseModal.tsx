import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import type { Expense, ExpenseStatus, PaymentMethod } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import { formatCurrencyINR } from '@/lib/utils';
import { cn } from '@/lib/utils';

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

const textareaClass = cn(
  'flex min-h-[80px] w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm',
  'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-muted-foreground',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary',
  'disabled:cursor-not-allowed disabled:opacity-50 resize-none'
);

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

  const labelClass = 'block text-sm font-medium text-foreground mb-2';

  return (
    <Dialog open={isOpen} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <DialogHeader
          title={expense ? t('expenses.editExpense', 'Edit Expense') : t('expenses.addExpense', 'Add Expense')}
          onClose={onClose}
        />
        <DialogBody>
          <div className="p-4 sm:p-6 space-y-6">
            {/* Details */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    {t('expenses.category', 'Category')} <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                  >
                    <option value="">{t('common.select', 'Select...')}</option>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className={labelClass}>{t('expenses.paymentMethod', 'Payment Method')}</label>
                  <Select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as PaymentMethod })}
                  >
                    <option value="cash">{t('common.cash', 'Cash')}</option>
                    <option value="upi">{t('common.upi', 'UPI')}</option>
                    <option value="card">{t('common.card', 'Card')}</option>
                    <option value="other">{t('common.other', 'Other')}</option>
                  </Select>
                </div>
              </div>
              <div>
                <label className={labelClass}>
                  {t('expenses.description', 'Description')} <span className="text-destructive">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={textareaClass}
                  rows={3}
                  placeholder={t('expenses.descriptionPlaceholder', 'Brief description of the expense')}
                  required
                />
              </div>
            </div>

            {/* Amount summary card */}
            <Card className="bg-muted/30 dark:bg-muted/20 border-border">
              <CardContent className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>
                      {t('expenses.amount', 'Amount')} <span className="text-destructive">*</span>
                    </label>
                    <Input
                      type="number"
                      value={formData.amount || ''}
                      onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) || 0 })}
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
                      onChange={(e) => setFormData({ ...formData, taxAmount: Number(e.target.value) || 0 })}
                      min={0}
                      step={0.01}
                    />
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
                    <label className={labelClass}>{t('expenses.totalAmount', 'Total Amount')}</label>
                    <div
                      className={cn(
                        'flex h-9 w-full items-center rounded-md border border-gray-200 dark:border-gray-700 px-3 text-sm font-semibold',
                        'bg-muted/50 dark:bg-muted/30 text-foreground'
                      )}
                    >
                      {formatCurrencyINR(formData.totalAmount)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Status & notes */}
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('expenses.statusAndNotes', 'Status & notes')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{t('common.status', 'Status')}</label>
                  <Select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as ExpenseStatus })}
                  >
                    <option value="pending">{t('expenses.statusPending', 'Pending')}</option>
                    <option value="approved">{t('expenses.statusApproved', 'Approved')}</option>
                    <option value="rejected">{t('expenses.statusRejected', 'Rejected')}</option>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>{t('expenses.notes', 'Notes')}</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className={textareaClass}
                    rows={2}
                    placeholder={t('expenses.notesPlaceholder', 'Optional notes')}
                  />
                </div>
              </div>
            </div>
          </div>
        </DialogBody>
        <DialogFooter className="flex flex-row justify-end gap-2 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button type="submit" loading={loading} disabled={!formData.category || !formData.description || formData.amount <= 0}>
            {expense ? t('common.update', 'Update') : t('common.save', 'Save')}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
};

export default ExpenseModal;
