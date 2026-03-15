/**
 * CustomerHistoryPanel — Admin slide-over panel showing full customer history.
 * Industry-aware: shows only tabs relevant to the org's industry type.
 * Tabs: Overview | Invoices | Complaints | Appointments | Subscriptions | Service Requests
 */
import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useOrganizationStore } from '@/store/useOrganizationStore';
import { getTemplateById } from '@/config/industryTemplates';
import { salesInvoicesApi } from '@/api/invoices';
import { complaintsApi } from '@/api/complaints';
import { subscriptionsApi } from '@/api/subscriptions';
import { appointmentsApi } from '@/api/appointments';
import { serviceRequestsApi } from '@/api/serviceRequests';
import type {
  Customer,
  SalesInvoice,
  Complaint,
  Subscription,
  Appointment,
  ServiceRequest,
} from '@/models/types';
import { cn, formatCurrencyINR } from '@/lib/utils';
import {
  X, User, Phone, Mail, MapPin, Calendar, FileText, MessageSquare,
  RefreshCw, Wrench, CheckCircle2, Clock, XCircle, AlertCircle,
  IndianRupee, TrendingUp, Wifi, Star
} from 'lucide-react';

interface Props {
  customer: Customer | null;
  onClose: () => void;
}

type PanelTab = 'overview' | 'invoices' | 'complaints' | 'appointments' | 'subscriptions' | 'service-requests';

const formatDate = (d: string | Date) =>
  new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });

const formatDateTime = (d: string | Date) =>
  new Date(d).toLocaleString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

// ── Status badge helpers ──────────────────────────────────────────────────────

function InvoiceStatusBadge({ status }: { status: SalesInvoice['status'] }) {
  const cls =
    status === 'paid'
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      : status === 'overdue'
        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
  return <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase', cls)}>{status}</span>;
}

function ComplaintStatusBadge({ status }: { status: Complaint['status'] }) {
  const cls =
    status === 'completed'
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      : status === 'on-hold'
        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
  return <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase', cls)}>{status.replace(/-/g, ' ')}</span>;
}

function SubStatusBadge({ status }: { status: Subscription['status'] }) {
  const cls =
    status === 'active'
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      : status === 'expired'
        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  return <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase', cls)}>{status}</span>;
}

function ApptStatusBadge({ status }: { status: Appointment['status'] }) {
  const cls =
    status === 'completed'
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      : status === 'cancelled'
        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
        : status === 'in-progress'
          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
  return <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase', cls)}>{status.replace(/-/g, ' ')}</span>;
}

function SRStatusBadge({ status }: { status: ServiceRequest['status'] }) {
  const cls =
    status === 'resolved' || status === 'closed'
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      : status === 'in-progress'
        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
        : status === 'assigned'
          ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300'
          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  return <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase', cls)}>{status.replace(/-/g, ' ')}</span>;
}

// ── Main component ────────────────────────────────────────────────────────────

const CustomerHistoryPanel = ({ customer, onClose }: Props) => {
  const { t } = useTranslation();
  const { currentOrganization } = useOrganizationStore();

  const template = useMemo(
    () => (currentOrganization?.industryType ? getTemplateById(currentOrganization.industryType) : undefined),
    [currentOrganization?.industryType]
  );
  const enabledModules: string[] = template?.enabledModules ?? [];

  // Determine which tabs to show based on industry
  const showComplaints = enabledModules.includes('complaints');
  const showAppointments = enabledModules.includes('appointments');
  const showSubscriptions = enabledModules.includes('subscriptions');
  const showServiceRequests = enabledModules.includes('service-requests');

  const availableTabs = useMemo<PanelTab[]>(() => {
    const tabs: PanelTab[] = ['overview', 'invoices'];
    if (showComplaints) tabs.push('complaints');
    if (showAppointments) tabs.push('appointments');
    if (showSubscriptions) tabs.push('subscriptions');
    if (showServiceRequests) tabs.push('service-requests');
    return tabs;
  }, [showComplaints, showAppointments, showSubscriptions, showServiceRequests]);

  const [activeTab, setActiveTab] = useState<PanelTab>('overview');
  const [loading, setLoading] = useState(true);

  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);

  useEffect(() => {
    if (!customer) return;
    setLoading(true);
    setActiveTab('overview');

    const cid = customer.id;

    Promise.allSettled([
      salesInvoicesApi.getAll().then((all) => setInvoices(all.filter((i) => i.customerId === cid))),
      showComplaints
        ? complaintsApi.getAll().then((all) => setComplaints(all.filter((c) => c.customerId === cid)))
        : Promise.resolve(),
      showSubscriptions
        ? subscriptionsApi.getAll().then((all) => setSubscriptions(all.filter((s) => s.customerId === cid)))
        : Promise.resolve(),
      showAppointments
        ? appointmentsApi.getAll().then((all) => setAppointments(all.filter((a) => a.customerId === cid)))
        : Promise.resolve(),
      showServiceRequests
        ? serviceRequestsApi.getAll().then((all) => setServiceRequests(all.filter((sr) => sr.customerId === cid)))
        : Promise.resolve(),
    ]).finally(() => setLoading(false));
  }, [customer?.id, showComplaints, showSubscriptions, showAppointments, showServiceRequests]);

  // KPIs
  const totalPaid = useMemo(() => invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.totalAmount, 0), [invoices]);
  const totalDue = useMemo(() => invoices.filter((i) => i.status !== 'paid').reduce((s, i) => s + i.totalAmount, 0), [invoices]);
  const resolvedComplaints = useMemo(() => complaints.filter((c) => c.status === 'completed').length, [complaints]);
  const activeSubscription = useMemo(() => subscriptions.find((s) => s.status === 'active'), [subscriptions]);

  if (!customer) return null;

  const tabLabel: Record<PanelTab, string> = {
    overview: t('customerHistory.tab.overview', 'Overview'),
    invoices: t('customerHistory.tab.invoices', 'Invoices'),
    complaints: t('customerHistory.tab.complaints', 'Complaints'),
    appointments: t('customerHistory.tab.appointments', 'Appointments'),
    subscriptions: t('customerHistory.tab.subscriptions', 'Subscriptions'),
    'service-requests': t('customerHistory.tab.serviceRequests', 'Requests'),
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('customerHistory.panelTitle', 'Customer History')}
        className="fixed inset-y-0 right-0 z-50 flex flex-col w-full max-w-2xl bg-white dark:bg-gray-950 shadow-2xl border-l border-border"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground truncate">{customer.name}</p>
              <p className="text-xs text-muted-foreground truncate">{customer.mobile}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-muted transition-colors shrink-0"
            aria-label={t('common.close', 'Close')}
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="flex overflow-x-auto border-b border-border shrink-0 bg-card">
          {availableTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'shrink-0 px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors',
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
              )}
            >
              {tabLabel[tab]}
            </button>
          ))}
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
              <Clock className="w-4 h-4 mr-2 animate-spin" />
              {t('common.loading', 'Loading...')}
            </div>
          ) : (
            <>
              {/* OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="p-4 space-y-4">
                  {/* Contact info */}
                  <section className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t('customerHistory.contactInfo', 'Contact Info')}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { icon: Phone, label: t('common.mobile', 'Mobile'), value: customer.mobile },
                        { icon: Mail, label: t('common.email', 'Email'), value: customer.email || '-' },
                        { icon: Wifi, label: t('common.category', 'Category'), value: customer.connectionType || '-' },
                        { icon: Star, label: t('common.planItem', 'Plan'), value: customer.package || '-' },
                        customer.area ? { icon: MapPin, label: t('common.area', 'Area'), value: customer.area } : null,
                        customer.createdAt ? { icon: Calendar, label: t('customerHistory.memberSince', 'Member Since'), value: formatDate(customer.createdAt) } : null,
                      ].filter(Boolean).map((item) => {
                        if (!item) return null;
                        const Icon = item.icon;
                        return (
                          <div key={item.label} className="flex items-start gap-2 bg-muted/30 rounded-lg px-3 py-2">
                            <Icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{item.label}</p>
                              <p className="text-sm font-semibold text-foreground truncate">{item.value}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  {/* KPIs */}
                  <section className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t('customerHistory.accountSummary', 'Account Summary')}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <KpiCard icon={CheckCircle2} iconClass="text-green-500" bg="bg-green-50 dark:bg-green-900/20"
                        label={t('customerHistory.totalPaid', 'Total Paid')} value={formatCurrencyINR(totalPaid)} />
                      <KpiCard icon={IndianRupee} iconClass="text-red-500" bg="bg-red-50 dark:bg-red-900/20"
                        label={t('customerHistory.totalDue', 'Total Due')} value={formatCurrencyINR(totalDue)} />
                      <KpiCard icon={FileText} iconClass="text-blue-500" bg="bg-blue-50 dark:bg-blue-900/20"
                        label={t('customerHistory.invoicesTotal', 'Invoices')} value={String(invoices.length)} />
                      {showComplaints && (
                        <KpiCard icon={MessageSquare} iconClass="text-amber-500" bg="bg-amber-50 dark:bg-amber-900/20"
                          label={t('customerHistory.ticketsTotal', 'Tickets')} value={`${resolvedComplaints}/${complaints.length}`} />
                      )}
                      {showAppointments && (
                        <KpiCard icon={Calendar} iconClass="text-indigo-500" bg="bg-indigo-50 dark:bg-indigo-900/20"
                          label={t('customerHistory.appointments', 'Appts')} value={String(appointments.length)} />
                      )}
                      {showSubscriptions && activeSubscription && (
                        <KpiCard icon={TrendingUp} iconClass="text-emerald-500" bg="bg-emerald-50 dark:bg-emerald-900/20"
                          label={t('customerHistory.activePlan', 'Active Plan')} value={activeSubscription.planName} />
                      )}
                    </div>
                  </section>

                  {/* Recent activity */}
                  <section className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t('customerHistory.recentActivity', 'Recent Activity')}
                    </h3>
                    {invoices.length === 0 && complaints.length === 0 && appointments.length === 0 ? (
                      <EmptyState icon={Clock} message={t('customerHistory.noActivity', 'No activity yet')} />
                    ) : (
                      <div className="space-y-1.5">
                        {[
                          ...invoices.slice(0, 3).map((inv) => ({
                            key: `inv-${inv.id}`,
                            date: inv.issueDate,
                            icon: FileText,
                            color: 'text-blue-500',
                            title: inv.invoiceNumber,
                            sub: inv.planName || '',
                            right: <InvoiceStatusBadge status={inv.status} />,
                          })),
                          ...complaints.slice(0, 2).map((c) => ({
                            key: `comp-${c.id}`,
                            date: c.createdAt,
                            icon: MessageSquare,
                            color: 'text-amber-500',
                            title: `${t('customerHistory.ticket', 'Ticket')} #${c.id}`,
                            sub: c.customerDescription?.slice(0, 50) ?? '',
                            right: <ComplaintStatusBadge status={c.status} />,
                          })),
                        ]
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .slice(0, 5)
                          .map((item) => {
                            const Icon = item.icon;
                            return (
                              <div key={item.key} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                                <Icon className={cn('w-3.5 h-3.5 mt-0.5 shrink-0', item.color)} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                                  {item.sub && <p className="text-xs text-muted-foreground truncate">{item.sub}</p>}
                                  <p className="text-[10px] text-muted-foreground">{formatDate(item.date)}</p>
                                </div>
                                <div className="shrink-0">{item.right}</div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </section>
                </div>
              )}

              {/* INVOICES */}
              {activeTab === 'invoices' && (
                <TabSection
                  items={invoices}
                  emptyIcon={FileText}
                  emptyMsg={t('customerHistory.noInvoices', 'No invoices found')}
                  renderItem={(inv: SalesInvoice) => (
                    <div key={inv.id} className="flex items-start gap-3 p-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <div className="pt-0.5">
                        {inv.status === 'paid'
                          ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                          : inv.status === 'overdue'
                            ? <XCircle className="w-4 h-4 text-red-500" />
                            : <Clock className="w-4 h-4 text-amber-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 justify-between">
                          <span className="text-sm font-semibold text-foreground">{inv.invoiceNumber}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-foreground">{formatCurrencyINR(inv.totalAmount)}</span>
                            <InvoiceStatusBadge status={inv.status} />
                          </div>
                        </div>
                        {inv.planName && <p className="text-xs text-muted-foreground mt-0.5">{inv.planName}</p>}
                        <p className="text-xs text-muted-foreground">{formatDate(inv.issueDate)}</p>
                      </div>
                    </div>
                  )}
                />
              )}

              {/* COMPLAINTS */}
              {activeTab === 'complaints' && (
                <TabSection
                  items={complaints}
                  emptyIcon={MessageSquare}
                  emptyMsg={t('customerHistory.noComplaints', 'No complaints found')}
                  renderItem={(c: Complaint) => (
                    <div key={c.id} className="flex items-start gap-3 p-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <div className="pt-0.5">
                        {c.status === 'completed'
                          ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                          : c.status === 'on-hold'
                            ? <AlertCircle className="w-4 h-4 text-yellow-500" />
                            : <MessageSquare className="w-4 h-4 text-blue-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-foreground">
                            {t('customerHistory.ticket', 'Ticket')} #{c.id}
                          </span>
                          <ComplaintStatusBadge status={c.status} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{c.customerDescription}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(c.createdAt)}</p>
                        {c.internalDescription && (
                          <p className="text-xs text-primary mt-1 italic">
                            {t('customerHistory.adminNote', 'Note')}: {c.internalDescription}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                />
              )}

              {/* APPOINTMENTS */}
              {activeTab === 'appointments' && (
                <TabSection
                  items={appointments}
                  emptyIcon={Calendar}
                  emptyMsg={t('customerHistory.noAppointments', 'No appointments found')}
                  renderItem={(a: Appointment) => (
                    <div key={a.id} className="flex items-start gap-3 p-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <div className="pt-0.5">
                        {a.status === 'completed'
                          ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                          : a.status === 'cancelled'
                            ? <XCircle className="w-4 h-4 text-red-500" />
                            : <Calendar className="w-4 h-4 text-indigo-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-foreground">{a.serviceType}</span>
                          <ApptStatusBadge status={a.status} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(a.scheduledAt)}</p>
                        {a.staffAssigned && (
                          <p className="text-xs text-muted-foreground">
                            {t('customerHistory.staff', 'Staff')}: {a.staffAssigned}
                          </p>
                        )}
                        {a.notes && <p className="text-xs text-muted-foreground italic mt-0.5">{a.notes}</p>}
                      </div>
                    </div>
                  )}
                />
              )}

              {/* SUBSCRIPTIONS */}
              {activeTab === 'subscriptions' && (
                <TabSection
                  items={subscriptions}
                  emptyIcon={RefreshCw}
                  emptyMsg={t('customerHistory.noSubscriptions', 'No subscriptions found')}
                  renderItem={(s: Subscription) => (
                    <div key={s.id} className="flex items-start gap-3 p-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <div className="pt-0.5">
                        <RefreshCw className={cn('w-4 h-4', s.status === 'active' ? 'text-green-500' : 'text-muted-foreground')} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-foreground">{s.planName}</span>
                          <SubStatusBadge status={s.status} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatCurrencyINR(s.amount)} · {s.billingCycle}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t('customerHistory.startDate', 'Started')}: {formatDate(s.startDate)}
                          {s.nextBillingDate && ` · ${t('customerHistory.nextBilling', 'Next')}: ${formatDate(s.nextBillingDate)}`}
                        </p>
                      </div>
                    </div>
                  )}
                />
              )}

              {/* SERVICE REQUESTS */}
              {activeTab === 'service-requests' && (
                <TabSection
                  items={serviceRequests}
                  emptyIcon={Wrench}
                  emptyMsg={t('customerHistory.noServiceRequests', 'No service requests found')}
                  renderItem={(sr: ServiceRequest) => (
                    <div key={sr.id} className="flex items-start gap-3 p-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <div className="pt-0.5">
                        {sr.status === 'resolved' || sr.status === 'closed'
                          ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                          : sr.status === 'in-progress'
                            ? <Wrench className="w-4 h-4 text-blue-500" />
                            : <Clock className="w-4 h-4 text-amber-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-foreground">{sr.requestType}</span>
                          <SRStatusBadge status={sr.status} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{sr.description}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(sr.createdAt)}</p>
                        {sr.assignedTo && (
                          <p className="text-xs text-muted-foreground">
                            {t('customerHistory.assignedTo', 'Assigned')}: {sr.assignedTo}
                          </p>
                        )}
                        {sr.slaBreached && (
                          <p className="text-xs text-red-500 font-medium mt-0.5">
                            {t('customerHistory.slaBreach', 'SLA Breached')}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                />
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

// ── Small reusable sub-components ─────────────────────────────────────────────

function KpiCard({
  icon: Icon, iconClass, bg, label, value,
}: {
  icon: React.ElementType; iconClass: string; bg: string; label: string; value: string;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-2.5">
      <div className="flex items-center gap-2 mb-1">
        <div className={cn('p-1 rounded-md', bg)}>
          <Icon className={cn('w-3 h-3', iconClass)} />
        </div>
        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground leading-tight">{label}</span>
      </div>
      <p className={cn('text-sm font-bold truncate', iconClass)}>{value}</p>
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <Icon className="w-10 h-10 mb-3 opacity-20" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

function TabSection<T>({
  items, emptyIcon, emptyMsg, renderItem,
}: {
  items: T[]; emptyIcon: React.ElementType; emptyMsg: string; renderItem: (item: T) => React.ReactNode;
}) {
  if (items.length === 0) return <EmptyState icon={emptyIcon} message={emptyMsg} />;
  return <div>{items.map(renderItem)}</div>;
}

export default CustomerHistoryPanel;
