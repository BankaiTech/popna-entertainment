/**
 * Customer History Page — full chronological account activity timeline.
 * Shows: payment history, complaint history, subscription events, account summary.
 */
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/useAuthStore';
import { useStore } from '@/store/useStore';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import {
  ArrowLeft, FileText, MessageSquare, CheckCircle2, Clock,
  XCircle, IndianRupee, Calendar, User, Wifi, LogOut
} from 'lucide-react';
import type { SalesInvoice, Complaint } from '@/models/types';
import { cn, formatCurrencyINR } from '@/lib/utils';
import { salesInvoicesApi } from '@/api/invoices';
import Logo from '@/components/Logo';
import FooterCredit from '@/components/FooterCredit';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import LanguageSwitcher from '@/components/LanguageSwitcher';

type TimelineEntry =
  | { type: 'invoice'; date: Date; data: SalesInvoice }
  | { type: 'complaint'; date: Date; data: Complaint };

const CustomerHistory = () => {
  const { t } = useTranslation();
  const { customerId, logout } = useAuthStore();
  const navigate = useNavigate();
  const { customers, complaints, initialize } = useStore();
  const [myInvoices, setMyInvoices] = useState<SalesInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'payments' | 'complaints'>('all');

  useEffect(() => {
    const load = async () => {
      await initialize();
      if (customerId) {
        try {
          const all = await salesInvoicesApi.getAll();
          setMyInvoices(all.filter((inv) => inv.customerId === customerId));
        } finally {
          setLoading(false);
        }
      }
    };
    load();
  }, [initialize, customerId]);

  const currentCustomer = customers.find((c) => c.id === customerId);
  const myComplaints = complaints.filter((c) => c.customerId === customerId);

  const formatDate = (d: Date | string) =>
    new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });

  const totalPaid = useMemo(
    () => myInvoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.totalAmount, 0),
    [myInvoices]
  );
  const totalDue = useMemo(
    () => myInvoices.filter((i) => i.status !== 'paid').reduce((s, i) => s + i.totalAmount, 0),
    [myInvoices]
  );
  const resolvedComplaints = myComplaints.filter((c) => c.status === 'completed').length;

  const memberSince = useMemo(() => {
    if (currentCustomer?.createdAt) return new Date(currentCustomer.createdAt);
    if (myInvoices.length > 0) {
      return new Date([...myInvoices].sort((a, b) => new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime())[0].issueDate);
    }
    return null;
  }, [currentCustomer, myInvoices]);

  const timeline: TimelineEntry[] = useMemo(() => {
    const entries: TimelineEntry[] = [
      ...myInvoices.map((inv): TimelineEntry => ({ type: 'invoice', date: new Date(inv.issueDate), data: inv })),
      ...myComplaints.map((c): TimelineEntry => ({ type: 'complaint', date: new Date(c.createdAt), data: c })),
    ];
    return entries.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [myInvoices, myComplaints]);

  const filteredTimeline = useMemo(() => {
    if (activeTab === 'payments') return timeline.filter((e) => e.type === 'invoice');
    if (activeTab === 'complaints') return timeline.filter((e) => e.type === 'complaint');
    return timeline;
  }, [timeline, activeTab]);

  const getInvoiceIcon = (status: SalesInvoice['status']) => {
    if (status === 'paid') return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    if (status === 'overdue') return <XCircle className="w-4 h-4 text-red-500" />;
    return <Clock className="w-4 h-4 text-amber-500" />;
  };

  const getComplaintIcon = (status: Complaint['status']) => {
    if (status === 'completed') return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    if (status === 'on-hold') return <Clock className="w-4 h-4 text-yellow-500" />;
    return <MessageSquare className="w-4 h-4 text-blue-500" />;
  };

  const getInvoiceStatusColor = (status: SalesInvoice['status']) => {
    if (status === 'paid') return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    if (status === 'overdue') return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
  };

  const getComplaintStatusColor = (status: Complaint['status']) => {
    if (status === 'completed') return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    if (status === 'on-hold') return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
  };

  if (!currentCustomer) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">{t('customerDashboard.loadingCustomer')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 left-0 right-0 z-50 h-12 sm:h-14 shrink-0 flex items-center justify-between px-3 sm:px-6 border-b border-border bg-card gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
          <Button variant="ghost" size="sm" onClick={() => navigate('/customer/dashboard')} className="p-2 shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Logo className="h-8 sm:h-10 w-auto object-contain shrink-0" />
          <p className="text-sm font-semibold text-foreground truncate hidden sm:block">
            {t('customerHistory.title', 'Account History')}
          </p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <ThemeSwitcher />
          <LanguageSwitcher />
          <Button variant="outline" size="sm" onClick={() => { logout(); navigate('/login'); }} className="flex items-center gap-1.5 p-2 sm:px-3">
            <LogOut className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">{t('nav.logout')}</span>
          </Button>
        </div>
      </header>

      <main className="flex-1 p-3 sm:p-6 space-y-4 max-w-5xl mx-auto w-full">
        {/* Account Summary */}
        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('customerHistory.accountSummary', 'Account Summary')}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: t('customerHistory.customerName', 'Name'), value: currentCustomer.name, icon: User, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
              { label: t('customerHistory.activePlan', 'Plan'), value: currentCustomer.package || '-', icon: Wifi, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
              { label: t('customerHistory.memberSince', 'Member Since'), value: memberSince ? formatDate(memberSince) : '-', icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
              { label: t('customerHistory.totalPaid', 'Total Paid'), value: formatCurrencyINR(totalPaid), icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
              { label: t('customerHistory.totalDue', 'Total Due'), value: formatCurrencyINR(totalDue), icon: IndianRupee, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.label} className="overflow-hidden">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn('p-1.5 rounded-md', item.bg)}>
                        <Icon className={cn('w-3.5 h-3.5', item.color)} />
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{item.label}</span>
                    </div>
                    <p className={cn('text-sm font-bold truncate', item.color)}>{item.value}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {/* Complaint summary row */}
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {myComplaints.length} {t('customerHistory.ticketsTotal', 'total tickets')}
            </span>
            <span className="text-border">·</span>
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="w-3 h-3" />
              {resolvedComplaints} {t('customerHistory.resolved', 'resolved')}
            </span>
            <span className="text-border">·</span>
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {myInvoices.length} {t('customerHistory.invoicesTotal', 'invoices')}
            </span>
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('customerHistory.activityTimeline', 'Activity Timeline')}
            </h2>
            {/* Filter tabs */}
            <div className="flex rounded-lg border border-border overflow-hidden text-xs">
              {(['all', 'payments', 'complaints'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'px-3 py-1.5 font-medium transition-colors capitalize',
                    activeTab === tab
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card text-muted-foreground hover:bg-muted'
                  )}
                >
                  {t(`customerHistory.tab.${tab}`, tab)}
                </button>
              ))}
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="text-center py-12 text-muted-foreground text-sm">{t('common.loading', 'Loading...')}</div>
              ) : filteredTimeline.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">{t('customerHistory.noActivity', 'No activity yet')}</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredTimeline.map((entry, idx) => (
                    <div key={`${entry.type}-${idx}`} className="flex gap-3 p-3 sm:p-4 hover:bg-muted/30 transition-colors">
                      {/* Timeline dot */}
                      <div className="flex flex-col items-center pt-0.5">
                        <div className="shrink-0">
                          {entry.type === 'invoice'
                            ? getInvoiceIcon((entry.data as SalesInvoice).status)
                            : getComplaintIcon((entry.data as Complaint).status)}
                        </div>
                        {idx < filteredTimeline.length - 1 && (
                          <div className="w-px flex-1 bg-border mt-2 min-h-[16px]" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pb-1">
                        {entry.type === 'invoice' ? (
                          (() => {
                            const inv = entry.data as SalesInvoice;
                            return (
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                    {inv.invoiceNumber}
                                    {inv.planName && <span className="font-normal text-muted-foreground">— {inv.planName}</span>}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-0.5">{formatDate(inv.issueDate)}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-sm font-bold text-foreground">{formatCurrencyINR(inv.totalAmount)}</span>
                                  <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', getInvoiceStatusColor(inv.status))}>
                                    {inv.status.toUpperCase()}
                                  </span>
                                </div>
                              </div>
                            );
                          })()
                        ) : (
                          (() => {
                            const comp = entry.data as Complaint;
                            return (
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                                    <MessageSquare className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                    {t('customerHistory.ticket', 'Ticket')} #{comp.id}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{comp.customerDescription}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5">{formatDate(comp.createdAt)}</p>
                                </div>
                                <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold w-fit shrink-0', getComplaintStatusColor(comp.status))}>
                                  {comp.status.replace(/-/g, ' ').toUpperCase()}
                                </span>
                              </div>
                            );
                          })()
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="shrink-0 border-t border-border bg-card py-3 px-4 sm:px-6">
        <FooterCredit />
      </footer>
    </div>
  );
};

export default CustomerHistory;
