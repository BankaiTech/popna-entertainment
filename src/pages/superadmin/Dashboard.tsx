// Super Admin Dashboard — Businexa: Organizations, subscriptions, tenant overview
import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import Button from '@/components/ui/Button';
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  CalendarClock,
  ArrowRight,
  Users,
  Settings,
} from 'lucide-react';
import { organizationsApi } from '@/api/organizations';
import type { Organization, OrganizationStatus } from '@/models/types';
import { ALL_MODULES } from '@/models/types';
import { cn } from '@/lib/utils';

const SuperAdminDashboard = () => {
  const { t } = useTranslation();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const orgs = await organizationsApi.getAll();
      setOrganizations(orgs);
      setLoading(false);
    };
    load();
  }, []);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const stats = useMemo(() => {
    const active = organizations.filter((o) => o.status === 'active').length;
    const disabled = organizations.filter((o) => o.status === 'disabled').length;
    const suspended = organizations.filter((o) => o.status === 'suspended').length;
    let expiringSoon = 0;
    organizations.forEach((org) => {
      const end = new Date(org.subscriptionEnd);
      end.setHours(0, 0, 0, 0);
      const daysLeft = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 30 && daysLeft > 0 && org.status === 'active') expiringSoon++;
    });
    const expired = organizations.filter((o) => {
      const end = new Date(o.subscriptionEnd);
      end.setHours(0, 0, 0, 0);
      return end.getTime() < today.getTime() && o.status === 'active';
    }).length;
    return {
      total: organizations.length,
      active,
      disabled,
      suspended,
      expiringSoon,
      expired,
    };
  }, [organizations, today]);

  const recentOrgs = useMemo(
    () => [...organizations].sort((a, b) => b.subscriptionEnd.localeCompare(a.subscriptionEnd)).slice(0, 5),
    [organizations]
  );

  const getStatusColor = (status: OrganizationStatus) => {
    switch (status) {
      case 'active':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'disabled':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      case 'suspended':
        return 'bg-red-50 text-red-700 border-red-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-muted-foreground text-sm">{t('common.loading', 'Loading...')}</p>
      </div>
    );
  }

  const kpiCards = [
    {
      title: t('superadminDashboard.totalOrgs', 'Total Organizations'),
      value: stats.total,
      icon: Building2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: t('superadminDashboard.active', 'Active'),
      value: stats.active,
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: t('superadminDashboard.expiringSoon', 'Expiring in 30 days'),
      value: stats.expiringSoon,
      icon: CalendarClock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      title: t('superadminDashboard.suspended', 'Suspended / Disabled'),
      value: stats.suspended + stats.disabled,
      icon: stats.suspended + stats.disabled > 0 ? AlertTriangle : XCircle,
      color: stats.suspended + stats.disabled > 0 ? 'text-orange-600' : 'text-gray-600',
      bgColor: stats.suspended + stats.disabled > 0 ? 'bg-orange-50' : 'bg-gray-50',
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in pb-4 sm:pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-foreground">
            {t('superadminDashboard.title', 'Super Admin Dashboard')}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t('superadminDashboard.subtitle', 'Manage organizations and subscriptions')}
          </p>
        </div>
        <Link to="/superadmin/organizations" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
            <Settings className="w-4 h-4 mr-2" />
            {t('superadminDashboard.manageOrganizations', 'Manage Organizations')}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>

      {/* KPI cards — mobile: 2 cols, tablet: 4 cols */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t('superadminDashboard.overview', 'Overview')}
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {kpiCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="overflow-hidden group hover:-translate-y-0.5 transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 px-3 sm:pt-3 sm:px-4">
                  <CardTitle className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider line-clamp-2">
                    {stat.title}
                  </CardTitle>
                  <div
                    className={cn(
                      'p-1.5 sm:p-2 rounded-lg shrink-0 group-hover:scale-110 transition-transform duration-300',
                      stat.bgColor
                    )}
                  >
                    <Icon className={cn('w-3.5 h-3.5 sm:w-4 sm:h-4', stat.color)} />
                  </div>
                </CardHeader>
                <CardContent className="pb-2 px-3 sm:pb-3 sm:px-4">
                  <div className="text-lg sm:text-xl font-bold text-foreground">
                    <AnimatedCounter value={stat.value} duration={1000} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recent organizations */}
      <Card className="overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary to-primary/70" />
        <CardHeader className="py-3 flex flex-row items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            {t('superadminDashboard.recentOrganizations', 'Recent Organizations')}
          </CardTitle>
          <Link to="/superadmin/organizations">
            <Button variant="outline" size="sm" className="text-xs shrink-0">
              {t('dashboard.viewAllContacts', 'View all')}
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {recentOrgs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm px-4">
              {t('superadminDashboard.noOrgs', 'No organizations yet. Add one from Manage Organizations.')}
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-border bg-muted/30">
                      <th className="text-left px-3 py-2 text-sm font-medium text-foreground">
                        {t('organizations.name', 'Name')}
                      </th>
                      <th className="text-left px-3 py-2 text-sm font-medium text-foreground">
                        {t('organizations.status', 'Status')}
                      </th>
                      <th className="text-left px-3 py-2 text-sm font-medium text-foreground">
                        {t('organizations.subscription', 'Subscription')}
                      </th>
                      <th className="text-left px-3 py-2 text-sm font-medium text-foreground">
                        {t('organizations.modules', 'Modules')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrgs.map((org, idx) => (
                      <tr
                        key={org.id}
                        className={cn(
                          'border-b border-border hover:bg-muted/20 transition-colors',
                          idx % 2 === 0 ? 'bg-card' : 'bg-muted/5'
                        )}
                      >
                        <td className="px-3 py-2 text-sm font-medium text-foreground">{org.name}</td>
                        <td className="px-3 py-2 text-sm">
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                              getStatusColor(org.status)
                            )}
                          >
                            {org.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-sm text-muted-foreground">
                          {org.subscriptionStart} — {org.subscriptionEnd}
                        </td>
                        <td className="px-3 py-2 text-sm text-muted-foreground">
                          {org.allowedModules.length} / {ALL_MODULES.length}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden space-y-3 p-3">
                {recentOrgs.map((org) => (
                  <Link key={org.id} to="/superadmin/organizations">
                    <div className="bg-card border border-border rounded-lg p-4 space-y-2 active:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Building2 className="w-4 h-4 text-primary shrink-0" />
                          <p className="text-sm font-semibold text-foreground truncate">{org.name}</p>
                        </div>
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border shrink-0',
                            getStatusColor(org.status)
                          )}
                        >
                          {org.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t('organizations.subscription', 'Subscription')}: {org.subscriptionStart} — {org.subscriptionEnd}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('organizations.modules', 'Modules')}: {org.allowedModules.length}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminDashboard;
