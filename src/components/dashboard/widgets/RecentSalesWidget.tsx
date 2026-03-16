import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useDashboardData } from '@/hooks/useDashboardData';
import { formatCurrencyINR } from '@/lib/utils';

export default function RecentSalesWidget() {
  const { t } = useTranslation();
  const { invoices } = useDashboardData();

  const recentInvoices = useMemo(() => {
    return [...invoices]
      .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())
      .slice(0, 5);
  }, [invoices]);

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      paid: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
      sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
      draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
      overdue: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? colors.draft}`}>
        {t(`invoices.status.${status}`, status)}
      </span>
    );
  };

  return (
    <Card className="overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-violet-500 to-purple-500" />
      <CardHeader className="py-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm sm:text-base">
          {t('dashboard.recentSales', 'Recent Sales')}
        </CardTitle>
        <Link
          to="/admin/invoices"
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          {t('common.viewAll', 'View All')}
          <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground text-xs">
                <th className="text-left px-4 py-2 font-medium">
                  {t('invoices.invoiceNumber', 'Invoice #')}
                </th>
                <th className="text-left px-4 py-2 font-medium">
                  {t('invoices.customer', 'Customer')}
                </th>
                <th className="text-left px-4 py-2 font-medium">
                  {t('invoices.date', 'Date')}
                </th>
                <th className="text-right px-4 py-2 font-medium">
                  {t('invoices.amount', 'Amount')}
                </th>
                <th className="text-center px-4 py-2 font-medium">
                  {t('invoices.status', 'Status')}
                </th>
              </tr>
            </thead>
            <tbody>
              {recentInvoices.map((inv) => (
                <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-2.5 font-medium">{inv.invoiceNumber}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{inv.customerName}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {new Date(inv.issueDate).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium">
                    {formatCurrencyINR(inv.totalAmount)}
                  </td>
                  <td className="px-4 py-2.5 text-center">{statusBadge(inv.status)}</td>
                </tr>
              ))}
              {recentInvoices.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">
                    {t('dashboard.noRecentSales', 'No recent sales')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile card list */}
        <div className="sm:hidden divide-y">
          {recentInvoices.map((inv) => (
            <div key={inv.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{inv.customerName}</p>
                <p className="text-xs text-muted-foreground">
                  {inv.invoiceNumber} &middot;{' '}
                  {new Date(inv.issueDate).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                  })}
                </p>
              </div>
              <div className="text-right flex flex-col items-end gap-1">
                <span className="text-sm font-semibold">{formatCurrencyINR(inv.totalAmount)}</span>
                {statusBadge(inv.status)}
              </div>
            </div>
          ))}
          {recentInvoices.length === 0 && (
            <div className="px-4 py-8 text-center text-muted-foreground text-sm">
              {t('dashboard.noRecentSales', 'No recent sales')}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
