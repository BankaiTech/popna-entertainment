import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { salesInvoicesApi } from '@/api/invoices';
import type { SalesInvoice } from '@/models/types';
import { formatCurrencyINR } from '@/lib/utils';
import { downloadCSV, filterByDateRange, type ReportFilters } from './reportUtils';
import Button from '@/components/ui/Button';
import { Download } from 'lucide-react';

interface SalesReportProps {
  filters: ReportFilters;
}

export default function SalesReport({ filters }: SalesReportProps) {
  const { t } = useTranslation();
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const inv = await salesInvoicesApi.getAll();
      setInvoices(inv);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    let list = filterByDateRange(invoices, (i) => i.issueDate, filters.fromDate, filters.toDate);
    if (filters.branchId) {
      const bid = Number(filters.branchId);
      list = list.filter((i) => i.branchId == null || i.branchId === bid);
    }
    return list;
  }, [invoices, filters]);

  const chartData = useMemo(() => {
    const byDate: Record<string, { date: string; total: number; count: number }> = {};
    filtered.forEach((inv) => {
      const d = inv.issueDate;
      if (!byDate[d]) byDate[d] = { date: d, total: 0, count: 0 };
      byDate[d].total += inv.totalAmount;
      byDate[d].count += 1;
    });
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  }, [filtered]);

  const handleExport = () => {
    const rows = filtered.map((i) => ({
      [t('reports.invoiceNumber', 'Invoice #')]: i.invoiceNumber,
      [t('reports.date', 'Date')]: i.issueDate,
      [t('reports.customer', 'Customer')]: i.customerName,
      [t('reports.amount', 'Amount')]: i.amount,
      [t('reports.tax', 'Tax')]: i.gstAmount,
      [t('reports.total', 'Total')]: i.totalAmount,
      [t('common.status', 'Status')]: i.status,
    }));
    downloadCSV(rows, `sales-report-${filters.fromDate || 'all'}-${filters.toDate || 'all'}.csv`);
  };

  if (loading) return <div className="text-sm text-gray-500 py-4">{t('common.loading', 'Loading...')}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="w-4 h-4 mr-1" /> {t('reports.exportCsv', 'Export CSV')}
        </Button>
      </div>
      {chartData.length > 0 && (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${v}`} />
              <Tooltip formatter={(v) => (v != null ? [formatCurrencyINR(Number(v)), t('reports.total', 'Total')] : [])} labelFormatter={(l) => t('reports.date', 'Date') + ': ' + l} />
              <Bar dataKey="total" fill="var(--color-primary, #3b82f6)" name={t('reports.sales', 'Sales')} radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-2 px-2 font-medium text-gray-500 dark:text-gray-400">{t('reports.invoiceNumber', 'Invoice #')}</th>
              <th className="text-left py-2 px-2 font-medium text-gray-500 dark:text-gray-400">{t('reports.date', 'Date')}</th>
              <th className="text-left py-2 px-2 font-medium text-gray-500 dark:text-gray-400">{t('reports.customer', 'Customer')}</th>
              <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400">{t('reports.total', 'Total')}</th>
              <th className="text-left py-2 px-2 font-medium text-gray-500 dark:text-gray-400">{t('common.status', 'Status')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 50).map((inv) => (
              <tr key={inv.id} className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2 px-2 text-gray-900 dark:text-gray-100">{inv.invoiceNumber}</td>
                <td className="py-2 px-2 text-gray-600 dark:text-gray-400">{inv.issueDate}</td>
                <td className="py-2 px-2 text-gray-700 dark:text-gray-300">{inv.customerName}</td>
                <td className="py-2 px-2 text-right font-medium text-gray-900 dark:text-gray-100">{formatCurrencyINR(inv.totalAmount)}</td>
                <td className="py-2 px-2 text-gray-600 dark:text-gray-400">{inv.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length > 50 && <p className="text-xs text-gray-500">Showing 50 of {filtered.length}</p>}
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {t('reports.grandTotal', 'Grand Total')}: {formatCurrencyINR(filtered.reduce((s, i) => s + i.totalAmount, 0))}
      </p>
    </div>
  );
}
