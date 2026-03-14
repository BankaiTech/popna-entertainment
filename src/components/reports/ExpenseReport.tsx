import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { expensesApi } from '@/api/expenses';
import type { Expense } from '@/models/types';
import { formatCurrencyINR } from '@/lib/utils';
import { downloadCSV, filterByDateRange, type ReportFilters } from './reportUtils';
import Button from '@/components/ui/Button';
import { Download } from 'lucide-react';

interface ExpenseReportProps {
  filters: ReportFilters;
}

const CHART_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899'];

export default function ExpenseReport({ filters }: ExpenseReportProps) {
  const { t } = useTranslation();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    expensesApi.getAll().then(setExpenses).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => filterByDateRange(expenses, (e) => e.paymentDate, filters.fromDate, filters.toDate),
    [expenses, filters]
  );

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((e) => {
      map[e.category] = (map[e.category] ?? 0) + e.totalAmount;
    });
    return Object.entries(map).map(([name, value], i) => ({ name, value, fill: CHART_COLORS[i % CHART_COLORS.length] }));
  }, [filtered]);

  const handleExport = () => {
    const rows = filtered.map((e) => ({
      [t('reports.date', 'Date')]: e.paymentDate,
      [t('expenses.category', 'Category')]: e.category,
      [t('expenses.description', 'Description')]: e.description,
      [t('reports.amount', 'Amount')]: e.totalAmount,
      [t('common.status', 'Status')]: e.status,
    }));
    downloadCSV(rows, `expense-report-${filters.fromDate || 'all'}-${filters.toDate || 'all'}.csv`);
  };

  if (loading) return <div className="text-sm text-gray-500 py-4">{t('common.loading', 'Loading...')}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="w-4 h-4 mr-1" /> {t('reports.exportCsv', 'Export CSV')}
        </Button>
      </div>
      {byCategory.length > 0 && (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={byCategory}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              >
                {byCategory.map((_, i) => (
                  <Cell key={i} fill={byCategory[i].fill} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => (v != null ? formatCurrencyINR(Number(v)) : '')} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-2 px-2 font-medium text-gray-500 dark:text-gray-400">{t('reports.date', 'Date')}</th>
              <th className="text-left py-2 px-2 font-medium text-gray-500 dark:text-gray-400">{t('expenses.category', 'Category')}</th>
              <th className="text-left py-2 px-2 font-medium text-gray-500 dark:text-gray-400">{t('expenses.description', 'Description')}</th>
              <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400">{t('reports.amount', 'Amount')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 50).map((e) => (
              <tr key={e.id} className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2 px-2 text-gray-600 dark:text-gray-400">{e.paymentDate}</td>
                <td className="py-2 px-2 text-gray-900 dark:text-gray-100">{e.category}</td>
                <td className="py-2 px-2 text-gray-700 dark:text-gray-300 max-w-[200px] truncate">{e.description}</td>
                <td className="py-2 px-2 text-right font-medium text-gray-900 dark:text-gray-100">{formatCurrencyINR(e.totalAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length > 50 && <p className="text-xs text-gray-500">Showing 50 of {filtered.length}</p>}
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {t('reports.grandTotal', 'Grand Total')}: {formatCurrencyINR(filtered.reduce((s, e) => s + e.totalAmount, 0))}
      </p>
    </div>
  );
}
