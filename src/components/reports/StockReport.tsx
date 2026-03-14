import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { inventoryProductsApi } from '@/api/inventoryProducts';
import type { InventoryProduct } from '@/models/types';
import { formatCurrencyINR } from '@/lib/utils';
import { downloadCSV, type ReportFilters } from './reportUtils';
import Button from '@/components/ui/Button';
import { Download } from 'lucide-react';

interface StockReportProps {
  filters: ReportFilters;
}

export default function StockReport({ filters }: StockReportProps) {
  const { t } = useTranslation();
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    inventoryProductsApi.getAll().then(setProducts).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = products;
    if (filters.branchId) {
      const bid = Number(filters.branchId);
      list = list.filter((p) => p.branchId == null || p.branchId === bid);
    }
    return list;
  }, [products, filters.branchId]);

  const chartData = useMemo(() => {
    return filtered
      .map((p) => ({
        name: p.name.length > 15 ? p.name.slice(0, 15) + '…' : p.name,
        stock: p.currentStock ?? 0,
        value: (p.currentStock ?? 0) * (p.price ?? 0),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filtered]);

  const handleExport = () => {
    const rows = filtered.map((p) => ({
      [t('reports.product', 'Product')]: p.name,
      [t('reports.sku', 'SKU')]: p.sku ?? '',
      [t('reports.stock', 'Stock')]: p.currentStock ?? 0,
      [t('reports.value', 'Value')]: (p.currentStock ?? 0) * (p.price ?? 0),
    }));
    downloadCSV(rows, `stock-report-${filters.fromDate || 'all'}-${filters.toDate || 'all'}.csv`);
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
            <BarChart data={chartData} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${v}`} />
              <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => (v != null ? [formatCurrencyINR(Number(v)), t('reports.value', 'Value')] : [])} />
              <Bar dataKey="value" fill="#10b981" name={t('reports.stockValue', 'Stock Value')} radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-2 px-2 font-medium text-gray-500 dark:text-gray-400">{t('reports.product', 'Product')}</th>
              <th className="text-left py-2 px-2 font-medium text-gray-500 dark:text-gray-400">{t('reports.sku', 'SKU')}</th>
              <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400">{t('reports.stock', 'Stock')}</th>
              <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400">{t('reports.value', 'Value')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 50).map((p) => (
              <tr key={p.id} className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2 px-2 text-gray-900 dark:text-gray-100">{p.name}</td>
                <td className="py-2 px-2 text-gray-600 dark:text-gray-400">{p.sku ?? '–'}</td>
                <td className="py-2 px-2 text-right text-gray-700 dark:text-gray-300">{p.currentStock ?? 0}</td>
                <td className="py-2 px-2 text-right font-medium text-gray-900 dark:text-gray-100">
                  {formatCurrencyINR((p.currentStock ?? 0) * (p.price ?? 0))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length > 50 && <p className="text-xs text-gray-500">Showing 50 of {filtered.length}</p>}
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {t('reports.totalStockValue', 'Total Stock Value')}: {formatCurrencyINR(filtered.reduce((s, p) => s + (p.currentStock ?? 0) * (p.price ?? 0), 0))}
      </p>
    </div>
  );
}
