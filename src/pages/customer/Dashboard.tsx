// Customer app home: this month's bill, plan, and how to reach the operator.
import { Link, useOutletContext } from 'react-router-dom';
import { CalendarClock, Phone, Tv, Wifi, MessageSquareWarning, ChevronRight, ReceiptText } from 'lucide-react';
import { useLt } from '@/lib/lt';
import {
  billStatusLabel, fmtDate, fmtMonth, rupees, type PortalContext,
} from './portalShared';

const CustomerDashboard = () => {
  const tr = useLt();
  const { profile } = useOutletContext<PortalContext>();

  if (!profile) {
    return (
      <div className="space-y-4" aria-busy="true">
        {[0, 1, 2].map((i) => <div key={i} className="h-28 rounded-2xl bg-gray-200/70 dark:bg-slate-800 animate-pulse" />)}
      </div>
    );
  }

  const bill = profile.currentBill;
  const isNet = profile.category === 'internet';
  const due = bill ? Number(bill.balance) : 0;
  const unpaid = !!bill && bill.status !== 'paid' && due > 0;
  const overdue = unpaid && bill && new Date(bill.dueDate) < new Date(new Date().toDateString());
  const phone = profile.operator.phone;

  return (
    <div className="space-y-4 md:space-y-6">
      <h1 className="text-xl md:text-2xl font-bold">{tr('Hello, {{name}}', { name: profile.name })}</h1>

      {/* Desktop: bill (wide) and plan side by side. Phone: one under the other. */}
      <div className="grid gap-4 md:grid-cols-5 md:gap-6">
      <div className="md:col-span-3 space-y-2">
      {/* This month's bill */}
      <section className={`rounded-2xl p-5 md:p-7 text-white shadow-sm ${!bill ? 'bg-gradient-to-br from-slate-500 to-slate-700'
        : unpaid
          ? (overdue ? 'bg-gradient-to-br from-red-600 to-rose-700' : 'bg-gradient-to-br from-blue-600 to-indigo-700')
          : 'bg-gradient-to-br from-emerald-600 to-teal-700'}`}>
        {bill ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-white/80">{fmtMonth(bill.period)}</p>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/20">
                {billStatusLabel(bill.status, bill.balance)}
              </span>
            </div>
            <p className="mt-2 text-sm text-white/80">{unpaid ? tr('Amount to pay') : tr('This month')}</p>
            <p className="text-4xl md:text-5xl font-extrabold tracking-tight">{rupees(unpaid ? bill.balance : bill.amountPaid)}</p>
            {unpaid ? (
              <p className="mt-3 flex items-start gap-1.5 text-sm">
                <CalendarClock className="w-4 h-4 shrink-0 mt-0.5" />
                {overdue
                  ? tr('Last date was {{date}}. Please pay soon to avoid disconnection.', { date: fmtDate(bill.dueDate) })
                  : tr('Pay before {{date}}', { date: fmtDate(bill.dueDate) })}
              </p>
            ) : (
              <p className="mt-3 text-sm text-white/90">{tr('Thank you! Nothing to pay now.')}</p>
            )}
            {unpaid && Number(bill.amountPaid) > 0 && (
              <p className="mt-1 text-xs text-white/80">{tr('Already paid {{amount}}', { amount: rupees(bill.amountPaid) })}</p>
            )}
          </>
        ) : (
          <p className="text-sm">{tr('No bill yet for this month.')}</p>
        )}
      </section>

      {unpaid && (
        <p className="text-xs text-gray-500 px-1">
          {tr('Pay your collector or at the office. You will get a receipt SMS after paying.')}
        </p>
      )}
      </div>

      {/* Plan */}
      <section className="md:col-span-2 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-4 md:p-5 self-start w-full">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0">
            {isNet ? <Wifi className="w-5 h-5" /> : <Tv className="w-5 h-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500">{isNet ? tr('Internet plan') : tr('Cable TV plan')}</p>
            <p className="font-semibold break-words">{profile.plan}</p>
            <p className="text-xs text-gray-500 break-words">{profile.provider}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-bold">{rupees(profile.monthlyAmount)}</p>
            <p className="text-xs text-gray-500">{tr('per month')}</p>
          </div>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm border-t border-gray-100 dark:border-slate-800 pt-3">
          {profile.stbNumber && (
            <div className="min-w-0">
              <dt className="text-xs text-gray-500">{tr('Box number')}</dt>
              <dd className="font-mono break-all">{profile.stbNumber}</dd>
            </div>
          )}
          {isNet && profile.validUntil && (
            <div>
              <dt className="text-xs text-gray-500">{tr('Valid until')}</dt>
              <dd>{fmtDate(profile.validUntil)}</dd>
            </div>
          )}
          {profile.area && (
            <div className="min-w-0">
              <dt className="text-xs text-gray-500">{tr('Area')}</dt>
              <dd className="break-words">{profile.area}</dd>
            </div>
          )}
        </dl>
      </section>
      </div>

      {/* Help */}
      <section className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {profile.complaintsEnabled ? (
        <Link to="/customer/complaints?new=1"
          className="rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-4 flex flex-col gap-2 active:bg-gray-50 dark:active:bg-slate-800 md:hover:border-blue-300">
          <MessageSquareWarning className="w-6 h-6 text-amber-600" />
          <span className="font-semibold text-sm">{tr('Report a problem')}</span>
          <span className="text-xs text-gray-500">{tr('No signal, box, wire, internet')}</span>
        </Link>
        ) : null}
        {phone ? (
          <a href={`tel:+91${phone}`}
            className="rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-4 flex flex-col gap-2 active:bg-gray-50 dark:active:bg-slate-800 md:hover:border-blue-300">
            <Phone className="w-6 h-6 text-green-600" />
            <span className="font-semibold text-sm">{tr('Call operator')}</span>
            <span className="text-xs text-gray-500 font-mono">{phone}</span>
          </a>
        ) : null}
        <Link to="/customer/history"
          className="col-span-2 md:col-span-1 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-4 flex items-center md:items-start md:flex-col gap-2 active:bg-gray-50 dark:active:bg-slate-800">
          <ReceiptText className="w-6 h-6 text-blue-600 shrink-0" />
          <span className="font-semibold text-sm flex-1">{tr('Old bills and receipts')}</span>
          <ChevronRight className="w-4 h-4 text-gray-400 md:hidden" />
        </Link>
      </section>
    </div>
  );
};

export default CustomerDashboard;
