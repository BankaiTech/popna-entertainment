// Customer Dashboard - Popna: Plan, Payment, Complaints, Invoices; mobile-first
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/useAuthStore';
import { useStore } from '@/store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import {
  Plus, AlertCircle, LogOut, FileText, Download, CreditCard,
  Wallet, IndianRupee, CalendarClock, Wifi, MessageSquare, History, CheckCircle2
} from 'lucide-react';
import type { Complaint, SalesInvoice } from '@/models/types';
import { cn, formatCurrencyINR } from '@/lib/utils';
import CustomerComplaintModal from '@/components/CustomerComplaintModal';
import FooterCredit from '@/components/FooterCredit';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import Logo from '@/components/Logo';
import { salesInvoicesApi } from '@/api/invoices';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { upiPaymentApi } from '@/api/upiPayment';
import UpiPaymentModal from '@/components/UpiPaymentModal';
import { getNextDueDateForCustomer } from '@/lib/billingUtils';
import { showInfo } from '@/utils/toast';

const CustomerDashboard = () => {
  const { t } = useTranslation();
  const { customerId, logout } = useAuthStore();
  const navigate = useNavigate();
  const { customers, complaints, products, initialize, fetchProducts } = useStore();
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
  const [myInvoices, setMyInvoices] = useState<SalesInvoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);

  // UPI Payment: customer pays org - use organization admin's UPI
  const [isUpiDialogOpen, setIsUpiDialogOpen] = useState(false);
  const [orgUpiConfig, setOrgUpiConfig] = useState<{ upiId: string; upiDisplayName: string; enabled: boolean } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      await initialize();
      await fetchProducts();
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

  // Load org (admin) UPI config for customer "Pay Now" - customer pays organization
  const currentCustomer = customers.find((c) => c.id === customerId);
  useEffect(() => {
    if (!currentCustomer?.organizationId) {
      setOrgUpiConfig(null);
      return;
    }
    let cancelled = false;
    upiPaymentApi.getConfig(currentCustomer.organizationId).then((data) => {
      if (!cancelled) {
        setOrgUpiConfig({
          upiId: data.upiId ?? '',
          upiDisplayName: data.upiDisplayName ?? '',
          enabled: data.enabled ?? false,
        });
      }
    }).catch(() => {
      if (!cancelled) setOrgUpiConfig(null);
    });
    return () => { cancelled = true; };
  }, [currentCustomer?.organizationId]);

  const myComplaints = complaints.filter((c) => c.customerId === customerId);
  const totalPending = useMemo(
    () => myInvoices.filter((inv) => inv.status !== 'paid').reduce((sum, inv) => sum + inv.totalAmount, 0),
    [myInvoices]
  );
  const totalPaid = useMemo(
    () => myInvoices.filter((inv) => inv.status === 'paid').reduce((sum, inv) => sum + inv.totalAmount, 0),
    [myInvoices]
  );
  const memberSince = useMemo(() => {
    if (currentCustomer?.createdAt) return new Date(currentCustomer.createdAt);
    if (myInvoices.length > 0) {
      const sorted = [...myInvoices].sort((a, b) => new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime());
      return new Date(sorted[0].issueDate);
    }
    return null;
  }, [currentCustomer, myInvoices]);

  const getStatusColor = (status: Complaint['status']) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'on-hold': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
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
      case 'paid': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'sent': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'overdue': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });

  const handleDownloadInvoice = (invoice: SalesInvoice) => {
    showInfo(t('customerDashboard.downloadingInvoice', { number: invoice.invoiceNumber }));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const canPayViaOrgUpi = !!(orgUpiConfig?.enabled && orgUpiConfig?.upiId);
  const payAmount = currentCustomer?.balanceAmount ?? totalPending ?? 0;

  if (!currentCustomer) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">{t('customerDashboard.loadingCustomer')}</p>
        </div>
      </div>
    );
  }

  const customerProduct = useMemo(
    () => products.find((p) => p.name === currentCustomer.connectionType),
    [products, currentCustomer.connectionType]
  );

  const nextDueDate = useMemo(
    () => getNextDueDateForCustomer(currentCustomer, customerProduct),
    [currentCustomer, customerProduct]
  );

  const daysUntilDue = useMemo(() => {
    if (!nextDueDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(nextDueDate);
    due.setHours(0, 0, 0, 0);
    return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }, [nextDueDate]);

  const isRenewWindow = daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 7;
  const isCableCustomer = customerProduct?.productType === 'cable';

  // KPI cards - same style as admin dashboard
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
      value: nextDueDate ? formatDate(nextDueDate.toISOString()) : '-',
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
    {
      title: t('customerDashboard.totalPaid', 'Total Paid'),
      value: formatCurrencyINR(totalPaid),
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      isText: true,
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
      {/* Sticky header - mobile-optimized, no overflow */}
      <header className="sticky top-0 left-0 right-0 z-50 h-12 sm:h-14 shrink-0 flex items-center justify-between px-3 sm:px-6 border-b border-border bg-card gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
          <Logo className="h-8 sm:h-10 w-auto object-contain shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{t('customerDashboard.welcome')}</p>
            <p className="text-sm sm:text-base font-semibold text-foreground truncate">{currentCustomer.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <ThemeSwitcher />
          <LanguageSwitcher />
          <Button variant="outline" size="sm" onClick={handleLogout} className="flex items-center gap-1.5 sm:gap-2 text-sm p-2 sm:px-3 sm:py-2 min-h-[44px] sm:min-h-0">
            <LogOut className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">{t('nav.logout')}</span>
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col w-full bg-muted/20 min-w-0">
        <div className="flex-1 overflow-auto p-3 sm:p-6 pb-6">
          <div className="space-y-4 sm:space-y-6 animate-fade-in max-w-5xl mx-auto">
            {/* Quick actions - prominent on mobile */}
            <div className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('customerDashboard.quickActions', 'Quick actions')}
              </h2>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Button
                  onClick={() => setIsUpiDialogOpen(true)}
                  className="flex-1 min-h-[48px] sm:min-h-0 shadow-md text-base sm:text-sm"
                >
                  <IndianRupee className="w-5 h-5 sm:w-4 sm:h-4 mr-2 shrink-0" />
                  {isRenewWindow
                    ? t('customerDashboard.renewNow', 'Renew Subscription')
                    : t('customerDashboard.payNow', 'Pay Now')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsComplaintModalOpen(true)}
                  className="flex-1 min-h-[48px] sm:min-h-0 text-base sm:text-sm"
                >
                  <MessageSquare className="w-5 h-5 sm:w-4 sm:h-4 mr-2 shrink-0" />
                  {t('customerDashboard.addComplaint')}
                </Button>
              </div>
            </div>

            {/* Overview / KPI cards - 1 col mobile, 2 sm, 4 lg */}
            <div className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('customerDashboard.overview', 'Overview')}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {kpiCards.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <Card key={index} className="overflow-hidden group hover:shadow-md transition-all duration-200">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3 sm:pt-4 sm:px-4">
                        <CardTitle className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">{stat.title}</CardTitle>
                        <div className={cn('p-2 rounded-lg shrink-0', stat.bgColor)}>
                          <Icon className={cn('w-4 h-4 sm:w-5 sm:h-5', stat.color)} />
                        </div>
                      </CardHeader>
                      <CardContent className="pb-3 px-3 sm:pb-4 sm:px-4">
                        <div className={cn('text-base sm:text-lg font-bold text-foreground break-words', stat.color)}>
                          {stat.value}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {isCableCustomer && customerProduct?.cutoffDate && (
              <p className="text-xs text-muted-foreground">
                {t(
                  'customerDashboard.cableCutoffInfo',
                  'Your cable service renews on day {{day}} of every month.',
                  { day: customerProduct.cutoffDate }
                )}
              </p>
            )}

            {/* My Complaints */}
            <div id="section-complaints" className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('customerDashboard.myComplaints')}
              </h2>
              <Card className="overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-orange-500 to-red-500" />
                <CardHeader className="py-3 px-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-500 shrink-0" />
                    <span className="text-sm font-medium text-foreground">{myComplaints.length} {t('customerDashboard.complaintsCount', 'complaints')}</span>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setIsComplaintModalOpen(true)} className="w-full sm:w-auto min-h-[44px] sm:min-h-0">
                    <Plus className="w-4 h-4 mr-2 shrink-0" />
                    {t('customerDashboard.addComplaint')}
                  </Button>
                </CardHeader>
                <CardContent className="py-2 px-3 sm:px-4 pb-4">
                  {myComplaints.length === 0 ? (
                    <div className="text-center py-8 sm:py-12 text-muted-foreground">
                      <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 opacity-30" />
                      <p className="text-sm font-medium">{t('customerDashboard.noComplaints')}</p>
                      <p className="text-xs mt-1">{t('customerDashboard.noComplaintsSub')}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {myComplaints.map((complaint) => (
                        <div key={complaint.id} className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 p-3 sm:p-4 rounded-lg border border-border/50 bg-card hover:shadow-sm transition-all min-h-[44px]">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground line-clamp-2 sm:truncate">{complaint.customerDescription}</p>
                            <p className="text-xs text-muted-foreground mt-1">{t('customerDashboard.created')} {formatDate(complaint.createdAt)}</p>
                          </div>
                          <span className={cn('px-2 py-1 rounded-full text-xs font-semibold w-fit', getStatusColor(complaint.status))}>
                            {getStatusLabel(complaint.status)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Payment history / Invoices */}
            <div id="section-invoices" className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('customerDashboard.paymentHistory', 'Payment History')}
              </h2>
              <Card className="overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-green-500 to-emerald-500" />
                <CardHeader className="py-3 px-3 sm:px-4 flex flex-row items-center justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4 text-green-600 shrink-0" />
                    {myInvoices.length} {t('customerDashboard.invoicesCount', 'invoices')}
                    {memberSince && (
                      <span className="text-xs font-normal text-muted-foreground ml-2">
                        · {t('customerDashboard.memberSince', 'Member since')} {formatDate(memberSince.toISOString())}
                      </span>
                    )}
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={() => navigate('/customer/history')} className="flex items-center gap-1.5 text-xs">
                    <History className="w-3.5 h-3.5" />
                    {t('customerDashboard.viewFullHistory', 'Full History')}
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {loadingInvoices ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">{t('customerDashboard.loadingInvoices')}</div>
                  ) : myInvoices.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-medium">{t('customerDashboard.noInvoices')}</p>
                      <p className="text-xs mt-1">{t('customerDashboard.noInvoicesSub')}</p>
                    </div>
                  ) : (
                    <>
                      <div className="hidden md:block overflow-x-auto">
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
                              <tr key={invoice.id} className={cn('border-b border-border hover:bg-muted/50 transition-colors', idx % 2 === 0 ? 'bg-card' : 'bg-muted/30')}>
                                <td className="px-3 py-2 text-sm font-medium text-foreground">{invoice.invoiceNumber}</td>
                                <td className="px-3 py-2 text-sm text-muted-foreground">{invoice.planName}</td>
                                <td className="px-3 py-2 text-sm font-semibold text-foreground">{formatCurrencyINR(invoice.totalAmount)}</td>
                                <td className="px-3 py-2 text-sm text-muted-foreground">{formatDate(invoice.issueDate)}</td>
                                <td className="px-3 py-2 text-sm text-muted-foreground">{formatDate(invoice.dueDate)}</td>
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
                      <div className="md:hidden space-y-3 p-3">
                        {myInvoices.map((invoice) => (
                          <div key={invoice.id} className="bg-card border border-border rounded-lg p-4 space-y-3 min-h-[44px]">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-foreground">{invoice.invoiceNumber}</p>
                                <p className="text-sm text-muted-foreground truncate">{invoice.planName}</p>
                              </div>
                              <span className={cn('px-2 py-1 rounded-full text-xs font-semibold shrink-0', getInvoiceStatusColor(invoice.status))}>
                                {invoice.status.toUpperCase()}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <p className="text-xs text-muted-foreground">{t('customerDashboard.amount')}</p>
                                <p className="font-bold text-foreground">{formatCurrencyINR(invoice.totalAmount)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">{t('customerDashboard.issueDate')}</p>
                                <p className="font-medium">{formatDate(invoice.issueDate)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">{t('customerDashboard.dueDate')}</p>
                                <p className="font-medium">{formatDate(invoice.dueDate)}</p>
                              </div>
                            </div>
                            <div className="flex justify-end pt-2 border-t border-border">
                              <button
                                onClick={() => handleDownloadInvoice(invoice)}
                                className="flex items-center gap-2 px-4 py-3 min-h-[44px] text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors touch-manipulation"
                              >
                                <Download className="w-4 h-4" />
                                {t('customerDashboard.download')}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <footer className="shrink-0 mt-auto border-t border-border bg-card py-3 px-4 sm:px-6">
          <FooterCredit />
        </footer>
      </main>

      {/* Customer Complaint Modal */}
      <CustomerComplaintModal
        isOpen={isComplaintModalOpen}
        onClose={() => setIsComplaintModalOpen(false)}
        customer={currentCustomer}
      />

      {/* Pay Now: customer pays org - show organization admin's UPI/QR */}
      {canPayViaOrgUpi && orgUpiConfig && (
        <UpiPaymentModal
          isOpen={isUpiDialogOpen}
          onClose={() => setIsUpiDialogOpen(false)}
          upiId={orgUpiConfig.upiId}
          businessName={orgUpiConfig.upiDisplayName || t('customerDashboard.yourProvider', 'Your Provider')}
          amount={payAmount}
          description={t('customerDashboard.planPayment', 'Plan payment')}
          transactionRef={`CUST${currentCustomer?.id ?? ''}_${Date.now()}`}
          onPaymentInitiated={() => setIsUpiDialogOpen(false)}
        />
      )}
      {/* Fallback when org has not configured UPI */}
      {!canPayViaOrgUpi && (
        <Dialog open={isUpiDialogOpen} onClose={() => setIsUpiDialogOpen(false)}>
          <DialogHeader title={t('customerDashboard.upiPayment', 'UPI Payment')} onClose={() => setIsUpiDialogOpen(false)} />
          <DialogBody className="p-4 sm:p-6">
            <p className="text-sm text-muted-foreground">
              {t('customerDashboard.providerUpiNotConfigured', 'Your provider has not set up UPI payments. Please contact them for payment details.')}
            </p>
          </DialogBody>
          <DialogFooter>
            <Button onClick={() => setIsUpiDialogOpen(false)}>{t('common.close', 'Close')}</Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
};

export default CustomerDashboard;
