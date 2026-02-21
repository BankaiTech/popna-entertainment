// SaaS Ready — Client/Partner Dashboard overview page
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { Users, AlertCircle, TrendingUp, UserCheck } from 'lucide-react';

const ClientDashboard = () => {
    const { t } = useTranslation();
    const { customers, complaints, loading, fetchCustomers, fetchComplaints, initialize } = useStore();

    useEffect(() => {
        const loadData = async () => {
            await initialize();
            await fetchCustomers();
            await fetchComplaints();
        };
        loadData();
    }, [initialize, fetchCustomers, fetchComplaints]);

    const activeCustomers = customers.filter((c) => c.status === 'Active').length;
    const inactiveCustomers = customers.filter((c) => c.status === 'Inactive').length;
    const activeComplaints = complaints.filter((c) => c.status === 'active').length;
    const onHoldComplaints = complaints.filter((c) => c.status === 'on-hold').length;
    const completedComplaints = complaints.filter((c) => c.status === 'completed').length;
    const paidCustomers = customers.filter((c) => c.paymentStatus === 'paid').length;
    const unpaidCustomers = customers.filter((c) => c.paymentStatus !== 'paid').length;

    const statCards = [
        {
            title: t('clientDashboard.totalCustomers', 'Total Customers'),
            value: customers.length,
            icon: Users,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            gradientFrom: 'from-blue-500',
            gradientTo: 'to-cyan-500',
        },
        {
            title: t('clientDashboard.activeCustomers', 'Active Customers'),
            value: activeCustomers,
            icon: UserCheck,
            color: 'text-green-600',
            bgColor: 'bg-green-50',
            gradientFrom: 'from-green-500',
            gradientTo: 'to-emerald-500',
        },
        {
            title: t('clientDashboard.activeComplaints', 'Active Complaints'),
            value: activeComplaints,
            icon: AlertCircle,
            color: 'text-orange-600',
            bgColor: 'bg-orange-50',
            gradientFrom: 'from-orange-500',
            gradientTo: 'to-red-500',
        },
        {
            title: t('clientDashboard.paidCustomers', 'Paid Customers'),
            value: paidCustomers,
            icon: TrendingUp,
            color: 'text-purple-600',
            bgColor: 'bg-purple-50',
            gradientFrom: 'from-purple-500',
            gradientTo: 'to-pink-500',
        },
    ];

    if (loading) {
        return <div className="text-center py-12">{t('common.loading')}</div>;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-lg sm:text-xl font-bold text-foreground mb-1">
                    {t('clientDashboard.title', 'Partner Dashboard')}
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground">
                    {t('clientDashboard.subtitle', 'Overview of your managed services')}
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <Card key={index} className="overflow-hidden group hover:-translate-y-1 transition-all duration-300">
                            <div className={`h-1 bg-gradient-to-r ${stat.gradientFrom} ${stat.gradientTo}`}></div>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
                                <CardTitle className="text-[10px] font-semibold uppercase tracking-wider">
                                    {stat.title}
                                </CardTitle>
                                <div className={`p-2.5 rounded-lg ${stat.bgColor} group-hover:scale-110 transition-transform duration-300`}>
                                    <Icon className={`w-5 h-5 ${stat.color}`} />
                                </div>
                            </CardHeader>
                            <CardContent className="pb-4 px-4">
                                <div className="text-xl font-bold text-foreground mb-1">
                                    <AnimatedCounter value={stat.value} duration={1500} />
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Payment Summary */}
                <Card className="overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
                    <CardHeader className="py-3">
                        <CardTitle className="text-base">{t('clientDashboard.paymentSummary', 'Payment Summary')}</CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center p-3 rounded-lg bg-green-50">
                                <span className="text-sm font-medium text-gray-700">{t('customers.paid', 'Paid')}</span>
                                <span className="text-lg font-bold text-green-600">{paidCustomers}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-lg bg-red-50">
                                <span className="text-sm font-medium text-gray-700">{t('customers.unpaid', 'Unpaid')}</span>
                                <span className="text-lg font-bold text-red-600">{unpaidCustomers}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-lg bg-gray-50">
                                <span className="text-sm font-medium text-gray-700">{t('dashboard.inactiveCustomers', 'Inactive Customers')}</span>
                                <span className="text-lg font-bold text-gray-600">{inactiveCustomers}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Complaints Summary */}
                <Card className="overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                    <CardHeader className="py-3">
                        <CardTitle className="text-base">{t('clientDashboard.complaintsSummary', 'Complaints Summary')}</CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center p-3 rounded-lg bg-orange-50">
                                <span className="text-sm font-medium text-gray-700">{t('complaints.active', 'Active')}</span>
                                <span className="text-lg font-bold text-orange-600">{activeComplaints}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-lg bg-yellow-50">
                                <span className="text-sm font-medium text-gray-700">{t('complaints.onHold', 'On Hold')}</span>
                                <span className="text-lg font-bold text-yellow-600">{onHoldComplaints}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-lg bg-green-50">
                                <span className="text-sm font-medium text-gray-700">{t('complaints.completed', 'Completed')}</span>
                                <span className="text-lg font-bold text-green-600">{completedComplaints}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ClientDashboard;
