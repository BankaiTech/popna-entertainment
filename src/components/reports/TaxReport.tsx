import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { salesInvoicesApi } from '@/api/invoices';
import { purchaseInvoicesApi } from '@/api/purchaseInvoices';
import type { SalesInvoice, PurchaseInvoice } from '@/models/types';
import { formatCurrencyINR } from '@/lib/utils';
import { downloadCSV, filterByDateRange, type ReportFilters } from './reportUtils';
import Button from '@/components/ui/Button';
import { Download } from 'lucide-react';

interface TaxReportProps {
  filters: ReportFilters;
}

export default function TaxReport({ filters }: TaxReportProps) {
  const { t } = useTranslation();
  const [sales, setSales] = useState<SalesInvoice[]>([]);
  const [purchases, setPurchases] = useState<PurchaseInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [s, p] = await Promise.all([salesInvoicesApi.getAll(), purchaseInvoicesApi.getAll()]);
      setSales(s);
      setPurchases(p);
      setLoading(false);
    };
    load();
  }, []);

  const filteredSales = useMemo(
    () => filterByDateRange(sales, (i) => i.issueDate, filters.fromDate, filters.toDate),
    [sales, filters]
  );
  const filteredPurchases = useMemo(
    () => filterByDateRange(purchases, (i) => i.issueDate, filters.fromDate, filters.toDate),
    [purchases, filters]
  );

  const salesTax = filteredSales.reduce((s, i) => s + (i.gstAmount ?? 0), 0);
  const purchaseTax = filteredPurchases.reduce((s, i) => s + (i.gstBreakup?.cgst ?? 0) + (i.gstBreakup?.sgst ?? 0) + (i.gstBreakup?.igst ?? 0), 0);
  const netTax = salesTax - purchaseTax;

  const chartData = useMemo(() => {
    const byDate: Record<string, { date: string; salesTax: number; purchaseTax: number }> = {};
    filteredSales.forEach((i) => {
      if (!byDate[i.issueDate]) byDate[i.issueDate] = { date: i.issueDate, salesTax: 0, purchaseTax: 0 };
      byDate[i.issueDate].salesTax += i.gstAmount ?? 0;
    });
    filteredPurchases.forEach((i) => {
      const tax = (i.gstBreakup?.cgst ?? 0) + (i.gstBreakup?.sgst ?? 0) + (i.gstBreakup?.igst ?? 0);
      if (!byDate[i.issueDate]) byDate[i.issueDate] = { date: i.issueDate, salesTax: 0, purchaseTax: 0 };
      byDate[i.issueDate].purchaseTax += tax;
    });
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredSales, filteredPurchases]);

  const handleExport = () => {
    const rows = [
      { [t('reports.salesTax', 'Sales GST')]: salesTax, [t('reports.purchaseTax', 'Purchase GST')]: purchaseTax, [t('reports.netTax', 'Net GST')]: netTax },
    ];
    downloadCSV(rows, `tax-report-${filters.fromDate || 'all'}-${filters.toDate || 'all'}.csv`);
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
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('reports.salesTax', 'Sales GST')}</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">{formatCurrencyINR(salesTax)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('reports.purchaseTax', 'Purchase GST')}</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">{formatCurrencyINR(purchaseTax)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('reports.netTax', 'Net GST')}</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">{formatCurrencyINR(netTax)}</p>
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
              <Bar dataKey="salesTax" fill="#3b82f6" name={t('reports.salesTax', 'Sales GST')} radius={4} />
              <Bar dataKey="purchaseTax" fill="#8b5cf6" name={t('reports.purchaseTax', 'Purchase GST')} radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
