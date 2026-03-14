import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { salesInvoicesApi } from '@/api/invoices';
import { expensesApi } from '@/api/expenses';
import { formatCurrencyINR } from '@/lib/utils';
import { downloadCSV, filterByDateRange, type ReportFilters } from './reportUtils';
import Button from '@/components/ui/Button';
import { Download } from 'lucide-react';

interface ProfitLossReportProps {
  filters: ReportFilters;
}

export default function ProfitLossReport({ filters }: ProfitLossReportProps) {
  const { t } = useTranslation();
  const [sales, setSales] = useState<{ issueDate: string; totalAmount: number }[]>([]);
  const [expenses, setExpenses] = useState<{ paymentDate: string; totalAmount: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [inv, exp] = await Promise.all([salesInvoicesApi.getAll(), expensesApi.getAll()]);
      setSales(inv.map((i) => ({ issueDate: i.issueDate, totalAmount: i.totalAmount })));
      setExpenses(exp.map((e) => ({ paymentDate: e.paymentDate, totalAmount: e.totalAmount })));
      setLoading(false);
    };
    load();
  }, []);

  const filteredSales = useMemo(
    () => filterByDateRange(sales, (i) => i.issueDate, filters.fromDate, filters.toDate),
    [sales, filters]
  );
  const filteredExpenses = useMemo(
    () => filterByDateRange(expenses, (i) => i.paymentDate, filters.fromDate, filters.toDate),
    [expenses, filters]
  );

  const totalRevenue = filteredSales.reduce((s, i) => s + i.totalAmount, 0);
  const totalExpense = filteredExpenses.reduce((s, i) => s + i.totalAmount, 0);
  const profit = totalRevenue - totalExpense;

  const chartData = useMemo(() => {
    const byDate: Record<string, { date: string; revenue: number; expense: number; profit: number }> = {};
    filteredSales.forEach((i) => {
      if (!byDate[i.issueDate]) byDate[i.issueDate] = { date: i.issueDate, revenue: 0, expense: 0, profit: 0 };
      byDate[i.issueDate].revenue += i.totalAmount;
    });
    filteredExpenses.forEach((i) => {
      if (!byDate[i.paymentDate]) byDate[i.paymentDate] = { date: i.paymentDate, revenue: 0, expense: 0, profit: 0 };
      byDate[i.paymentDate].expense += i.totalAmount;
    });
    Object.keys(byDate).forEach((d) => {
      byDate[d].profit = byDate[d].revenue - byDate[d].expense;
    });
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredSales, filteredExpenses]);

  const handleExport = () => {
    const rows = [
      { [t('reports.revenue', 'Revenue')]: totalRevenue, [t('reports.expenses', 'Expenses')]: totalExpense, [t('reports.profit', 'Profit/Loss')]: profit },
    ];
    downloadCSV(rows, `profit-loss-${filters.fromDate || 'all'}-${filters.toDate || 'all'}.csv`);
  };

  if (loading) return <div className="text-sm text-gray-500 py-4">{t('common.loading', 'Loading...')}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="w-4 h-4 mr-1" /> {t('reports.exportCsv', 'Export CSV')}
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-green-50 dark:bg-green-900/20">
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('reports.revenue', 'Revenue')}</p>
          <p className="text-xl font-semibold text-green-700 dark:text-green-400">{formatCurrencyINR(totalRevenue)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-red-50 dark:bg-red-900/20">
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('reports.expenses', 'Expenses')}</p>
          <p className="text-xl font-semibold text-red-700 dark:text-red-400">{formatCurrencyINR(totalExpense)}</p>
        </div>
        <div className={`rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${profit >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('reports.profit', 'Profit/Loss')}</p>
          <p className={`text-xl font-semibold ${profit >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
            {formatCurrencyINR(profit)}
          </p>
        </div>
      </div>
      {chartData.length > 0 && (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${v}`} />
              <Tooltip formatter={(v) => (v != null ? [formatCurrencyINR(Number(v)), ''] : [])} />
              <Legend />
              <Bar dataKey="revenue" fill="#22c55e" name={t('reports.revenue', 'Revenue')} radius={4} stackId="a" />
              <Bar dataKey="expense" fill="#ef4444" name={t('reports.expenses', 'Expenses')} radius={4} stackId="a" />
              <Bar dataKey="profit" fill="#3b82f6" name={t('reports.profit', 'Profit')} radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
