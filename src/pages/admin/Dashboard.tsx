import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Users, Wifi, TrendingUp, UserCheck, UserX, AlertCircle } from 'lucide-react';
import { customersApi } from '@/api/api';
import type { Customer, Provider } from '@/models/types';
import { getConnectionTypeLabel } from '@/lib/providerUtils';

const AdminDashboard = () => {
  const { dashboardStats, loading, fetchDashboardStats, initialize, fetchCustomers, customers, complaints } = useStore();
  const { role } = useAuthStore();
  const [lastCustomers, setLastCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    const loadData = async () => {
      await initialize();
      await fetchCustomers();
      await fetchDashboardStats();
      const allCustomers = await customersApi.getAll();
      const sorted = allCustomers
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);
      setLastCustomers(sorted);
    };
    loadData();
  }, [fetchDashboardStats, fetchCustomers, initialize]);

  // Calculate active complaints count
  const activeComplaintsCount = complaints.filter((c) => c.status === 'active').length;

  // GTPL Payment Summary (Admin only). Counts from GTPL customers; updates when customers/paymentStatus change.
  const gtplCustomers = customers.filter((c) => c.connectionType === 'GTPL');
  const gtplPaidCount = gtplCustomers.filter((c) => c.paymentStatus === 'paid').length;
  const gtplUnpaidCount = gtplCustomers.filter((c) => c.paymentStatus !== 'paid').length;

  // Show data immediately if available, don't show loading if we have data
  if (!dashboardStats && loading) {
    return <div className="text-center py-12">Loading dashboard...</div>;
  }

  // If no stats but not loading, initialize
  if (!dashboardStats && !loading) {
    return null; // Will be handled by useEffect
  }
  if (!dashboardStats) return null;

  const statCards = [
    {
      title: 'Total Customers',
      value: dashboardStats.totalCustomers,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Cable (GTPL)',
      value: dashboardStats.gtplCustomers,
      icon: Wifi,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Internet — BSNL',
      value: dashboardStats.bsnlCustomers,
      icon: Wifi,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Internet — Railwire',
      value: dashboardStats.railwireCustomers,
      icon: Wifi,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Internet — Krishiinet',
      value: dashboardStats.krishiinetCustomers,
      icon: Wifi,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'New This Month',
      value: dashboardStats.newCustomersThisMonth,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Active Customers',
      value: dashboardStats.activeCustomers,
      icon: UserCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Inactive Customers',
      value: dashboardStats.inactiveCustomers,
      icon: UserX,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      title: 'Active Complaints',
      value: activeComplaintsCount,
      icon: AlertCircle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Overview of your ISP management system</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-md ${stat.bgColor}`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* GTPL Payment Status — Admin only; hidden from Employee and Customer */}
      {role === 'admin' && (
        <Card>
          <CardHeader>
            <CardTitle>GTPL Payment Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 border border-green-200">
                <span className="text-sm font-medium text-green-800">Paid</span>
                <span className="text-2xl font-bold text-green-700">{gtplPaidCount}</span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg bg-red-50 border border-red-200">
                <span className="text-sm font-medium text-red-800">Unpaid</span>
                <span className="text-2xl font-bold text-red-700">{gtplUnpaidCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Provider Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Active by Service (Cable vs Internet)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(dashboardStats.activeByProvider).map(([provider, count]) => (
                <div key={provider} className="flex justify-between items-center">
                  <span className="text-sm font-medium">{getConnectionTypeLabel(provider as Provider)}</span>
                  <span className="text-lg font-bold text-green-600">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inactive by Service (Cable vs Internet)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(dashboardStats.inactiveByProvider).map(([provider, count]) => (
                <div key={provider} className="flex justify-between items-center">
                  <span className="text-sm font-medium">{getConnectionTypeLabel(provider as Provider)}</span>
                  <span className="text-lg font-bold text-red-600">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Last 5 Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Last 5 Customers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">ID</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Name</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Mobile</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Connection Type</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Package Rate</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {lastCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center p-4 text-muted-foreground">
                      No customers found
                    </td>
                  </tr>
                ) : (
                  lastCustomers.map((customer) => (
                    <tr key={customer.id} className="border-b border-border hover:bg-muted/50">
                      <td className="p-3 text-sm">{customer.id}</td>
                      <td className="p-3 text-sm font-medium">{customer.name}</td>
                      <td className="p-3 text-sm">{customer.mobile}</td>
                      <td className="p-3 text-sm">{getConnectionTypeLabel(customer.connectionType)}</td>
                      <td className="p-3 text-sm">{customer.package}</td>
                      <td className="p-3 text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            customer.status === 'Active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {customer.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
