import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { purchaseInvoicesApi } from '@/api/purchaseInvoices';
import type { PurchaseInvoice } from '@/models/types';
import { formatCurrencyINR } from '@/lib/utils';
import { downloadCSV, filterByDateRange, type ReportFilters } from './reportUtils';
import Button from '@/components/ui/Button';
import { Download } from 'lucide-react';

interface PurchaseReportProps {
  filters: ReportFilters;
}

export default function PurchaseReport({ filters }: PurchaseReportProps) {
  const { t } = useTranslation();
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    purchaseInvoicesApi.getAll().then(setInvoices).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => filterByDateRange(invoices, (i) => i.issueDate, filters.fromDate, filters.toDate),
    [invoices, filters]
  );

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
      [t('reports.vendor', 'Vendor')]: i.vendorName,
      [t('reports.amount', 'Amount')]: i.amount,
      [t('reports.total', 'Total')]: i.totalAmount,
    }));
    downloadCSV(rows, `purchase-report-${filters.fromDate || 'all'}-${filters.toDate || 'all'}.csv`);
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
              <Bar dataKey="total" fill="#8b5cf6" name={t('reports.purchases', 'Purchases')} radius={4} />
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
              <th className="text-left py-2 px-2 font-medium text-gray-500 dark:text-gray-400">{t('reports.vendor', 'Vendor')}</th>
              <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400">{t('reports.total', 'Total')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 50).map((inv) => (
              <tr key={inv.id} className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2 px-2 text-gray-900 dark:text-gray-100">{inv.invoiceNumber}</td>
                <td className="py-2 px-2 text-gray-600 dark:text-gray-400">{inv.issueDate}</td>
                <td className="py-2 px-2 text-gray-700 dark:text-gray-300">{inv.vendorName}</td>
                <td className="py-2 px-2 text-right font-medium text-gray-900 dark:text-gray-100">{formatCurrencyINR(inv.totalAmount)}</td>
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
