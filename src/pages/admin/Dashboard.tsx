// Admin Dashboard - widget-driven from industry template
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useOrganizationStore } from '@/store/useOrganizationStore';
import { getTemplateById } from '@/config/industryTemplates';
import { Card, CardContent } from '@/components/ui/Card';
import { Link } from 'react-router-dom';
import { FileText, UserPlus, ShoppingCart, Calendar, RefreshCw } from 'lucide-react';
import Button from '@/components/ui/Button';
import WidgetGrid, { categorizeWidgets } from '@/components/dashboard/WidgetGrid';
import { DashboardDataProvider, useDashboardData } from '@/hooks/useDashboardData';

const DEFAULT_WIDGETS = ['revenue', 'contacts', 'lowStock', 'pendingInvoices', 'todaySales', 'revenueChart', 'invoiceStatusPie', 'financialOverview', 'recentSalesTable'] as const;

function DashboardContent() {
  const { t } = useTranslation();
  const { currentOrganization, isModuleAllowed } = useOrganizationStore();
  const { loading, organization } = useDashboardData();

  const template = useMemo(
    () => (currentOrganization?.industryType ? getTemplateById(currentOrganization.industryType) : undefined),
    [currentOrganization?.industryType]
  );

  const allWidgets = template?.dashboardWidgets ?? [...DEFAULT_WIDGETS];
  const { kpi, chart, full } = categorizeWidgets(allWidgets);

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">{t('dashboard.loading')}</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-5 animate-fade-in pb-4 sm:pb-6">
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        {isModuleAllowed('invoices') && (
          <Link to="/admin/sales">
            <Button variant="outline" size="sm" className="gap-2">
              <FileText className="w-4 h-4" />
              {t('dashboard.quickActionNewInvoice', 'New Invoice')}
            </Button>
          </Link>
        )}
        {isModuleAllowed('contacts') && (
          <Link to="/admin/contacts">
            <Button variant="outline" size="sm" className="gap-2">
              <UserPlus className="w-4 h-4" />
              {t('dashboard.quickActionNewContact', 'New Contact')}
            </Button>
          </Link>
        )}
        {isModuleAllowed('pos') && (
          <Link to="/admin/pos">
            <Button variant="outline" size="sm" className="gap-2">
              <ShoppingCart className="w-4 h-4" />
              {t('dashboard.quickActionPOS', 'Point of Sale')}
            </Button>
          </Link>
        )}
        {isModuleAllowed('appointments') && (
          <Link to="/admin/appointments">
            <Button variant="outline" size="sm" className="gap-2">
              <Calendar className="w-4 h-4" />
              {t('dashboard.quickActionAppointments', 'Appointments')}
            </Button>
          </Link>
        )}
      </div>

      {/* Subscription Renewal Alert */}
      {organization && (() => {
        const endDate = new Date(organization.subscriptionEnd);
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);
        const daysUntilEnd = Math.ceil((endDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntilEnd > 7) return null;
        return (
          <Card className="overflow-hidden border-primary/20 bg-primary/5 w-full sm:max-w-md">
            <CardContent className="py-3 px-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <RefreshCw className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('dashboard.subscription', 'Subscription')}
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {daysUntilEnd <= 0
                      ? t('dashboard.subscriptionExpired', 'Expired')
                      : t('dashboard.validUntil', 'Valid until') + ' ' + organization.subscriptionEnd}
                  </p>
                </div>
              </div>
              <Link to="/admin/settings?tab=billing">
                <Button size="sm" className="whitespace-nowrap">
                  {t('dashboard.renewSubscription', 'Renew subscription')}
                </Button>
              </Link>
            </CardContent>
          </Card>
        );
      })()}

      {/* KPI Cards */}
      {kpi.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('dashboard.overview', 'Overview')}
          </h2>
          <WidgetGrid widgets={kpi} layout="kpi" />
        </div>
      )}

      {/* Charts */}
      {chart.length > 0 && (
        <WidgetGrid widgets={chart} layout="chart" />
      )}

      {/* Full-width sections & tables */}
      {full.length > 0 && (
        <WidgetGrid widgets={full} layout="full" />
      )}
    </div>
  );
}

const AdminDashboard = () => (
  <DashboardDataProvider>
    <DashboardContent />
  </DashboardDataProvider>
);

export default AdminDashboard;
