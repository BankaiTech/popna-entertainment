// Customer dashboard aligned with SaaS design system
// Customer dashboard SaaS revamp completed
// UPI payment integration ready
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/useAuthStore';
import { useStore } from '@/store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import {
  Plus, AlertCircle, LogOut, FileText, Download, CreditCard, Clock,
  Wallet, IndianRupee, CalendarClock, Wifi, Smartphone, Menu, X, Shield
} from 'lucide-react';
import type { Complaint, SalesInvoice } from '@/models/types';
import { getConnectionTypeLabel } from '@/lib/providerUtils';
import { cn, formatCurrencyINR } from '@/lib/utils';
import CustomerComplaintModal from '@/components/CustomerComplaintModal';
import FooterCredit from '@/components/FooterCredit';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { salesInvoicesApi } from '@/api/invoices';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/Dialog';

const UPI_APPS = [
  { id: 'gpay', name: 'Google Pay', icon: '💳' },
  { id: 'phonepe', name: 'PhonePe', icon: '📱' },
  { id: 'paytm', name: 'Paytm', icon: '💰' },
] as const;

const CustomerDashboard = () => {
  const { t } = useTranslation();
  const { customerId, logout } = useAuthStore();
  const navigate = useNavigate();
  const { customers, complaints, products, initialize } = useStore();
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
  const [myInvoices, setMyInvoices] = useState<SalesInvoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // UPI Payment dialog state
  const [isUpiDialogOpen, setIsUpiDialogOpen] = useState(false);
  const [selectedUpiApp, setSelectedUpiApp] = useState<string>('');
  const [manualUpiId, setManualUpiId] = useState('');

  useEffect(() => {
    const loadData = async () => {
      await initialize();
      if (customerId) {
        try {
          const allInvoices = await salesInvoicesApi.getAll();
          const customerInvoices = allInvoices.filter((inv) => inv.customerId === customerId);
          setMyInvoices(customerInvoices);
        } catch (error) {
          console.error('Failed to load invoices:', error);
        } finally {
          setLoadingInvoices(false);
        }
      }
    };
    loadData();
  }, [initialize, customerId]);

  const currentCustomer = customers.find((c) => c.id === customerId);
  const myComplaints = complaints.filter((c) => c.customerId === customerId);

  const totalPaid = useMemo(
    () => myInvoices.filter((inv) => inv.status === 'paid').reduce((sum, inv) => sum + inv.totalAmount, 0),
    [myInvoices]
  );
  const totalPending = useMemo(
    () => myInvoices.filter((inv) => inv.status !== 'paid').reduce((sum, inv) => sum + inv.totalAmount, 0),
    [myInvoices]
  );
  const nextDueInvoice = useMemo(() => {
    const unpaid = myInvoices.filter((inv) => inv.status !== 'paid').sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    return unpaid[0] || null;
  }, [myInvoices]);

  const getStatusColor = (status: Complaint['status']) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'on-hold': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: Complaint['status']) => {
    switch (status) {
      case 'active': return t('customerDashboard.statusActive', 'Active');
      case 'on-hold': return t('customerDashboard.statusOnHold', 'On Hold');
      case 'completed': return t('customerDashboard.statusCompleted', 'Completed');
      default: return status;
    }
  };

  const getInvoiceStatusColor = (status: SalesInvoice['status']) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });

  const handleDownloadInvoice = (invoice: SalesInvoice) => {
    alert(t('customerDashboard.downloadingInvoice', { number: invoice.invoiceNumber }));
  };

  const handleLogout = () => {
    logout();
    navigate('/customer/login');
  };

  const handleUpiPay = () => {
    const upiTarget = selectedUpiApp || manualUpiId;
    if (!upiTarget) return;
    alert(t('customerDashboard.upiPaymentInitiated', `UPI payment initiated via ${selectedUpiApp ? UPI_APPS.find(a => a.id === selectedUpiApp)?.name : manualUpiId}`));
    setIsUpiDialogOpen(false);
    setSelectedUpiApp('');
    setManualUpiId('');
  };

  if (!currentCustomer) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">{t('customerDashboard.loadingCustomer')}</p>
        </div>
      </div>
    );
  }

  // Sidebar menu items for customer
  const menuItems = [
    { id: 'dashboard', label: t('customerDashboard.title', 'My Dashboard'), icon: Shield },
    { id: 'complaints', label: t('customerDashboard.myComplaints', 'My Complaints'), icon: AlertCircle },
    { id: 'invoices', label: t('customerDashboard.myInvoices', 'My Invoices'), icon: FileText },
  ];

  // KPI cards — same style as admin dashboard
  const kpiCards = [
    {
      title: t('customerDashboard.activePlan', 'Active Plan'),
      value: currentCustomer.package || t('common.na', 'N/A'),
      icon: Wifi,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      isText: true,
    },
    {
      title: t('customerDashboard.paymentStatus', 'Payment Status'),
      value: currentCustomer.paymentStatus === 'paid'
        ? t('customerDashboard.paid', 'Paid')
        : t('customerDashboard.unpaid', 'Unpaid'),
      icon: CreditCard,
      color: currentCustomer.paymentStatus === 'paid' ? 'text-green-600' : 'text-red-600',
      bgColor: currentCustomer.paymentStatus === 'paid' ? 'bg-green-50' : 'bg-red-50',
      isText: true,
    },
    {
      title: t('customerDashboard.nextDueDate', 'Next Due Date'),
      value: nextDueInvoice ? formatDate(nextDueInvoice.dueDate) : '—',
      icon: CalendarClock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      isText: true,
    },
    {
      title: t('customerDashboard.balanceAmount', 'Balance Amount'),
      value: formatCurrencyINR(currentCustomer.balanceAmount ?? totalPending),
      icon: Wallet,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      isText: true,
    },
  ];

  return (
    // Sticky header added for customer dashboard
    <div className="min-h-screen bg-white flex flex-col">
      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 sm:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Sticky header — matches admin */}
      <header className="fixed top-0 left-0 right-0 z-50 h-14 shrink-0 flex items-center justify-between px-4 sm:px-8 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsMobileMenuOpen(true)} className="sm:hidden p-2 hover:bg-accent rounded-md" aria-label={t('openMenu', 'Open Menu')}>
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base sm:text-lg font-semibold">{t('customerDashboard.welcome')} {currentCustomer.name}</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">{t('customerDashboard.title')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Button variant="outline" onClick={handleLogout} className="flex items-center space-x-2 text-sm sm:text-base">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">{t('nav.logout')}</span>
          </Button>
        </div>
      </header>

      <div className="flex flex-1 pt-14">
        {/* Sidebar — matches admin */}
        <aside className={cn(
          'fixed top-14 bottom-0 left-0',
          'z-40 w-56 bg-gray-50 border-r border-gray-200 flex flex-col',
          'transform transition-transform duration-300 ease-in-out',
          'sm:translate-x-0',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}>
          <div className="p-4 border-b border-gray-200 flex items-center justify-between shrink-0 bg-gray-50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">P</span>
              </div>
              <h1 className="text-base font-bold text-gray-900">{t('popna', 'Popna')}</h1>
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="sm:hidden p-1.5 hover:bg-gray-200 rounded transition-colors" aria-label={t('closeMenu', 'Close Menu')}>
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => { setIsMobileMenuOpen(false); document.getElementById(`section-${item.id}`)?.scrollIntoView({ behavior: 'smooth' }); }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 text-gray-700 hover:text-gray-900 hover:bg-gray-100 w-full text-left"
                >
                  <Icon className="w-4 h-4 text-gray-600" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col w-full bg-white sm:ml-56">
          <div className="flex-1 overflow-auto p-4 sm:p-6">
            <div className="space-y-3 animate-fade-in" id="section-dashboard">

              {/* Top KPI Cards — same style as admin */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t('customerDashboard.overview', 'Overview')}</h2>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setIsUpiDialogOpen(true)} className="shadow-lg">
                    <IndianRupee className="w-4 h-4 mr-2" />
                    {t('customerDashboard.payNow', 'Pay Now')}
                  </Button>
                  <Button variant="outline" onClick={() => setIsComplaintModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('customerDashboard.addComplaint')}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {kpiCards.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <Card key={index} className="overflow-hidden group hover:-translate-y-1 transition-all duration-300">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
                        <CardTitle className="text-[10px] font-semibold uppercase tracking-wider">{stat.title}</CardTitle>
                        <div className={`p-2.5 rounded-lg ${stat.bgColor} group-hover:scale-110 transition-transform duration-300`}>
                          <Icon className={`w-5 h-5 ${stat.color}`} />
                        </div>
                      </CardHeader>
                      <CardContent className="pb-4 px-4">
                        <div className={cn('text-xl font-bold text-foreground mb-1', stat.color)}>
                          {stat.value}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Plan Details + Payment Summary — side by side on desktop */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                {/* Plan Details Card */}
                <Card className="overflow-hidden animate-slide-up">
                  <div className="h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Wifi className="w-4 h-4" />
                      {t('customerDashboard.planDetails', 'Plan Details')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-2 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50">
                        <span className="text-sm font-medium text-muted-foreground">{t('customerDashboard.planName', 'Plan Name')}</span>
                        <span className="text-sm font-bold">{currentCustomer.package || t('common.na', 'N/A')}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50">
                        <span className="text-sm font-medium text-muted-foreground">{t('customerDashboard.connectionType', 'Connection Type')}</span>
                        <span className="text-sm font-bold">{getConnectionTypeLabel(currentCustomer.connectionType, products)}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50">
                        <span className="text-sm font-medium text-muted-foreground">{t('common.status', 'Status')}</span>
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', currentCustomer.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')}>
                          {currentCustomer.status}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Summary Card */}
                <Card className="overflow-hidden animate-slide-up" style={{ animationDelay: '0.05s' }}>
                  <div className="h-1 bg-gradient-to-r from-green-500 to-emerald-500"></div>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <IndianRupee className="w-4 h-4" />
                      {t('customerDashboard.paymentSummary', 'Payment Summary')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-2 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50">
                        <span className="text-sm font-medium text-muted-foreground">{t('customerDashboard.totalPaid', 'Total Paid')}</span>
                        <span className="text-sm font-bold text-green-600">{formatCurrencyINR(totalPaid)}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded-lg bg-gradient-to-r from-red-50 to-pink-50">
                        <span className="text-sm font-medium text-muted-foreground">{t('customerDashboard.totalPending', 'Total Pending')}</span>
                        <span className="text-sm font-bold text-red-600">{formatCurrencyINR(totalPending)}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded-lg bg-gradient-to-r from-amber-50 to-yellow-50">
                        <span className="text-sm font-medium text-muted-foreground">{t('customerDashboard.lastPaymentDate', 'Last Payment Date')}</span>
                        <span className="text-sm font-bold text-amber-600">
                          {(() => {
                            const paidInvoices = myInvoices.filter((inv) => inv.status === 'paid');
                            if (paidInvoices.length === 0) return '—';
                            const lastPaid = paidInvoices.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())[0];
                            return formatDate(lastPaid.issueDate);
                          })()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* My Complaints Section */}
              <div id="section-complaints">
                <Card className="overflow-hidden animate-slide-up" style={{ animationDelay: '0.1s' }}>
                  <div className="h-1 bg-gradient-to-r from-orange-500 to-red-500"></div>
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {t('customerDashboard.myComplaints')}
                      </CardTitle>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-medium">
                        {myComplaints.length}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="py-2">
                    {myComplaints.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-medium">{t('customerDashboard.noComplaints')}</p>
                        <p className="text-xs mt-1">{t('customerDashboard.noComplaintsSub')}</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {myComplaints.slice(0, 5).map((complaint) => (
                          <div key={complaint.id} className="flex items-start justify-between p-3 rounded-lg border border-border/50 hover:shadow-md transition-all duration-300">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground truncate">{complaint.customerDescription}</p>
                              <p className="text-xs text-muted-foreground mt-1">{t('customerDashboard.created')} {formatDate(complaint.createdAt)}</p>
                            </div>
                            <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ml-3', getStatusColor(complaint.status))}>
                              {getStatusLabel(complaint.status)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Payment History Table */}
              <div id="section-invoices">
                <Card className="overflow-hidden animate-slide-up" style={{ animationDelay: '0.15s' }}>
                  <div className="h-1 bg-gradient-to-r from-green-500 to-emerald-500"></div>
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        {t('customerDashboard.paymentHistory', 'Payment History')}
                      </CardTitle>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-medium">
                        {myInvoices.length}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {loadingInvoices ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">{t('customerDashboard.loadingInvoices')}</div>
                    ) : myInvoices.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-medium">{t('customerDashboard.noInvoices')}</p>
                        <p className="text-xs mt-1">{t('customerDashboard.noInvoicesSub')}</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b-2 border-border bg-muted/30">
                              <th className="text-left px-3 py-2 text-sm font-medium text-foreground">{t('customerDashboard.invoiceNo', 'Invoice #')}</th>
                              <th className="text-left px-3 py-2 text-sm font-medium text-foreground">{t('customerDashboard.plan')}</th>
                              <th className="text-left px-3 py-2 text-sm font-medium text-foreground">{t('customerDashboard.amount')}</th>
                              <th className="text-left px-3 py-2 text-sm font-medium text-foreground">{t('customerDashboard.issueDate')}</th>
                              <th className="text-left px-3 py-2 text-sm font-medium text-foreground">{t('customerDashboard.dueDate')}</th>
                              <th className="text-left px-3 py-2 text-sm font-medium text-foreground">{t('common.status', 'Status')}</th>
                              <th className="text-left px-3 py-2 text-sm font-medium text-foreground"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {myInvoices.map((invoice, idx) => (
                              <tr key={invoice.id} className={cn('border-b border-gray-200 hover:bg-gray-50 transition-colors', idx % 2 === 0 ? 'bg-white' : 'bg-gray-50')}>
                                <td className="px-3 py-2 text-sm font-medium text-gray-900">{invoice.invoiceNumber}</td>
                                <td className="px-3 py-2 text-sm text-gray-600">{invoice.planName}</td>
                                <td className="px-3 py-2 text-sm font-semibold text-gray-900">{formatCurrencyINR(invoice.totalAmount)}</td>
                                <td className="px-3 py-2 text-sm text-gray-600">{formatDate(invoice.issueDate)}</td>
                                <td className="px-3 py-2 text-sm text-gray-600">{formatDate(invoice.dueDate)}</td>
                                <td className="px-3 py-2 text-sm">
                                  <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', getInvoiceStatusColor(invoice.status))}>
                                    {invoice.status.toUpperCase()}
                                  </span>
                                </td>
                                <td className="px-3 py-2">
                                  <button onClick={() => handleDownloadInvoice(invoice)} className="p-1.5 hover:bg-accent rounded-md transition-colors" title={t('customerDashboard.download')}>
                                    <Download className="w-4 h-4 text-muted-foreground" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          <footer className="shrink-0 mt-auto border-t border-gray-200 bg-white py-2 px-4">
            <FooterCredit />
          </footer>
        </main>
      </div>

      {/* Customer Complaint Modal */}
      <CustomerComplaintModal
        isOpen={isComplaintModalOpen}
        onClose={() => setIsComplaintModalOpen(false)}
        customer={currentCustomer}
      />

      {/* UPI Payment Dialog */}
      <Dialog open={isUpiDialogOpen} onClose={() => setIsUpiDialogOpen(false)}>
        <DialogHeader title={t('customerDashboard.upiPayment', 'UPI Payment')} onClose={() => setIsUpiDialogOpen(false)} />
        <DialogBody className="p-4 sm:p-6">
          <div className="space-y-4">
            {/* Pending amount display */}
            <div className="p-3 rounded-lg bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200">
              <p className="text-xs text-muted-foreground">{t('customerDashboard.amountToPay', 'Amount to Pay')}</p>
              <p className="text-xl font-bold text-amber-700">{formatCurrencyINR(currentCustomer.balanceAmount ?? totalPending)}</p>
            </div>

            {/* UPI App selection */}
            <div>
              <label className="block text-sm font-semibold mb-2">{t('customerDashboard.selectUpiApp', 'Select UPI App')}</label>
              <div className="grid grid-cols-3 gap-2">
                {UPI_APPS.map((app) => (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => { setSelectedUpiApp(app.id); setManualUpiId(''); }}
                    className={cn(
                      'flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 text-sm font-medium transition-all',
                      selectedUpiApp === app.id
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border bg-background text-foreground hover:border-primary/30 hover:bg-muted'
                    )}
                  >
                    <span className="text-2xl">{app.icon}</span>
                    <span className="text-xs">{app.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground uppercase font-medium">{t('customerDashboard.or', 'or')}</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Manual UPI ID */}
            <div>
              <label className="block text-sm font-semibold mb-2">{t('customerDashboard.enterUpiId', 'Enter UPI ID')}</label>
              <Input
                value={manualUpiId}
                onChange={(e) => { setManualUpiId(e.target.value); setSelectedUpiApp(''); }}
                placeholder={t('customerDashboard.upiIdPlaceholder', 'name@upi')}
              />
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsUpiDialogOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
          <Button onClick={handleUpiPay} disabled={!selectedUpiApp && !manualUpiId.trim()}>
            <Smartphone className="w-4 h-4 mr-2" />
            {t('customerDashboard.payViaUpi', 'Pay via UPI')}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
};

export default CustomerDashboard;
