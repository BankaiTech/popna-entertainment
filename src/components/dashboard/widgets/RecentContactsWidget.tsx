import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useDashboardData } from '@/hooks/useDashboardData';

export default function RecentContactsWidget() {
  const { t } = useTranslation();
  const { lastCustomers } = useDashboardData();

  return (
    <Card className="overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
      <CardHeader className="py-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm sm:text-base">
          {t('dashboard.recentContacts', 'Recent Contacts')}
        </CardTitle>
        <Link
          to="/admin/contacts"
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
                  {t('contacts.name', 'Name')}
                </th>
                <th className="text-left px-4 py-2 font-medium">
                  {t('contacts.email', 'Email')}
                </th>
                <th className="text-left px-4 py-2 font-medium">
                  {t('contacts.phone', 'Phone')}
                </th>
                <th className="text-left px-4 py-2 font-medium">
                  {t('contacts.addedOn', 'Added On')}
                </th>
              </tr>
            </thead>
            <tbody>
              {lastCustomers.map((customer) => (
                <tr
                  key={customer.id}
                  className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                >
                  <td className="px-4 py-2.5 font-medium">{customer.name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{customer.email ?? '-'}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{customer.mobile ?? '-'}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {customer.createdAt
                      ? new Date(customer.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '-'}
                  </td>
                </tr>
              ))}
              {lastCustomers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground text-sm">
                    {t('dashboard.noRecentContacts', 'No recent contacts')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile card list */}
        <div className="sm:hidden divide-y">
          {lastCustomers.map((customer) => (
            <div key={customer.id} className="px-4 py-3">
              <p className="text-sm font-medium">{customer.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {customer.email ?? customer.mobile ?? '-'}
              </p>
              {customer.createdAt && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(customer.createdAt).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              )}
            </div>
          ))}
          {lastCustomers.length === 0 && (
            <div className="px-4 py-8 text-center text-muted-foreground text-sm">
              {t('dashboard.noRecentContacts', 'No recent contacts')}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
