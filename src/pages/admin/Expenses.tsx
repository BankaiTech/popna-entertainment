import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import Select from '@/components/ui/Select';
import { Search, Trash2, Pencil } from 'lucide-react';
import type { Expense, ExpenseStatus } from '@/models/types';
import { useExpenseStore } from '@/store/useExpenseStore';
import ExpenseModal from '@/components/ExpenseModal';
import { cn, formatCurrencyINR } from '@/lib/utils';

const Expenses = () => {
  const { t } = useTranslation();
  const { expenses, loading, fetchExpenses, addExpense, updateExpense, deleteExpense } = useExpenseStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const categories = useMemo(() => {
    const cats = new Set(expenses.map((e) => e.category));
    return Array.from(cats);
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        expense.expenseNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || expense.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
      const matchesDate =
        (!fromDate && !toDate) ||
        (() => {
          const d = new Date(expense.paymentDate);
          if (Number.isNaN(d.getTime())) return true;
          if (fromDate && d < new Date(fromDate)) return false;
          if (toDate) {
            const end = new Date(toDate);
            end.setHours(23, 59, 59, 999);
            if (d > end) return false;
          }
          return true;
        })();
      return matchesSearch && matchesStatus && matchesCategory && matchesDate;
    });
  }, [expenses, searchQuery, statusFilter, categoryFilter, fromDate, toDate]);

  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);
  const paginatedExpenses = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredExpenses.slice(start, start + itemsPerPage);
  }, [filteredExpenses, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter, categoryFilter, fromDate, toDate]);

  const handleAdd = () => { setEditingExpense(null); setIsModalOpen(true); };
  const handleEdit = (expense: Expense) => { setEditingExpense(expense); setIsModalOpen(true); };
  const handleClose = () => { setIsModalOpen(false); setEditingExpense(null); };

  const handleDelete = async (id: number) => {
    if (window.confirm(t('expenses.deleteConfirm', 'Are you sure you want to delete this expense?'))) {
      await deleteExpense(id);
    }
  };

  const statusBadge = (status: ExpenseStatus) => {
    const colors: Record<ExpenseStatus, string> = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return (
      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', colors[status])}>
        {t(`expenses.status${status.charAt(0).toUpperCase() + status.slice(1)}`, status)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="py-2.5 px-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-56 shrink-0">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder={t('expenses.searchPlaceholder', 'Search expenses...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ExpenseStatus | 'all')}
              className="h-8 ml-auto text-xs w-full sm:w-32"
            >
              <option value="all">{t('common.allStatuses', 'All Statuses')}</option>
              <option value="pending">{t('expenses.statusPending', 'Pending')}</option>
              <option value="approved">{t('expenses.statusApproved', 'Approved')}</option>
              <option value="rejected">{t('expenses.statusRejected', 'Rejected')}</option>
            </Select>
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-8 text-xs w-[calc(50%-4px)] sm:w-36"
            >
              <option value="all">{t('common.allCategories', 'All Categories')}</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </Select>
            
            <div className="flex items-center gap-2 w-full sm:w-auto h-8 border border-input rounded-md px-2 bg-background flex-1 sm:flex-none">
               <label className="text-xs text-muted-foreground whitespace-nowrap">{t('common.fromDate', 'From')}</label>
               <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="bg-transparent text-xs border-none outline-none w-full sm:w-[110px]" />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto h-8 border border-input rounded-md px-2 bg-background flex-1 sm:flex-none">
               <label className="text-xs text-muted-foreground whitespace-nowrap">{t('common.toDate', 'To')}</label>
               <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="bg-transparent text-xs border-none outline-none w-full sm:w-[110px]" />
            </div>

            <Button onClick={handleAdd} size="xs" className="shrink-0 w-full xl:w-auto mt-2 xl:mt-0">
              <span className="mr-1 text-lg leading-none">+</span>
              {t('expenses.addExpense', 'Add Expense')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">

          {/* Table / Cards */}
          {loading ? (
            <div className="text-center py-8 text-gray-500">{t('common.loading', 'Loading...')}</div>
          ) : paginatedExpenses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">{t('expenses.noExpenses', 'No expenses found')}</div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400">#</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400">{t('expenses.category', 'Category')}</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400">{t('expenses.description', 'Description')}</th>
                      <th className="text-right py-3 px-3 font-medium text-gray-500 dark:text-gray-400">{t('expenses.amount', 'Amount')}</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400">{t('common.status', 'Status')}</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400">{t('expenses.paymentDate', 'Date')}</th>
                      <th className="text-right py-3 px-3 font-medium text-gray-500 dark:text-gray-400">{t('common.actions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedExpenses.map((expense) => (
                      <tr key={expense.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-3 px-3 text-gray-500 dark:text-gray-400">{expense.expenseNumber}</td>
                        <td className="py-3 px-3 text-gray-900 dark:text-gray-100">{expense.category}</td>
                        <td className="py-3 px-3 text-gray-700 dark:text-gray-300 max-w-[200px] truncate">{expense.description}</td>
                        <td className="py-3 px-3 text-right font-medium text-gray-900 dark:text-gray-100">{formatCurrencyINR(expense.totalAmount)}</td>
                        <td className="py-3 px-3">{statusBadge(expense.status)}</td>
                        <td className="py-3 px-3 text-gray-500 dark:text-gray-400">{expense.paymentDate}</td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => handleEdit(expense)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-blue-600">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(expense.id)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-red-600">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {paginatedExpenses.map((expense) => (
                  <div key={expense.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {expense.expenseNumber} • {expense.category}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                          {expense.description}
                        </p>
                      </div>
                      {statusBadge(expense.status)}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('expenses.paymentDate', 'Date')}</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{expense.paymentDate}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('expenses.amount', 'Amount')}</p>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {formatCurrencyINR(expense.totalAmount)}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                      <button
                        onClick={() => handleEdit(expense)}
                        className="px-2 py-1 rounded-md text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        {t('common.edit', 'Edit')}
                      </button>
                      <button
                        onClick={() => handleDelete(expense.id)}
                        className="px-2 py-1 rounded-md text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                      >
                        {t('common.delete', 'Delete')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          )}
        </CardContent>
      </Card>

      <ExpenseModal
        isOpen={isModalOpen}
        onClose={handleClose}
        expense={editingExpense}
        onSave={addExpense}
        onUpdate={updateExpense}
      />
    </div>
  );
};

export default Expenses;
