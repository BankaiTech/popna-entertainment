// Customer app: month-by-month bills with the receipts paid against each.
import { useEffect, useState } from 'react';
import { ReceiptText } from 'lucide-react';
import { useLt } from '@/lib/lt';
import { customerPortalApi, type PortalBill, type PortalPayment } from '@/api/customerPortal';
import {
  billStatusClass, billStatusLabel, fmtDate, fmtMonth, methodLabel, rupees,
} from './portalShared';

type Row = PortalBill & { payments: PortalPayment[] };

const CustomerHistory = () => {
  const tr = useLt();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    customerPortalApi.bills().then(setRows).catch((e: Error) => setError(e.message));
  }, []);

  return (
    <div className="space-y-3">
      <h1 className="text-xl md:text-2xl font-bold">{tr('Bills and receipts')}</h1>
      {error && <p role="alert" className="text-sm text-red-600">{tr(error)}</p>}
      {rows === null && !error && (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => <div key={i} className="h-24 rounded-2xl bg-gray-200/70 dark:bg-slate-800 animate-pulse" />)}
        </div>
      )}
      {rows?.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <ReceiptText className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          {tr('No bills yet.')}
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2 md:gap-4">
      {rows?.map((b) => (
        <article key={b.id} className="rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">{fmtMonth(b.period)}</h2>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${billStatusClass(b.status)}`}>
              {billStatusLabel(b.status, b.balance)}
            </span>
          </div>
          <dl className="mt-2 grid grid-cols-3 gap-2 text-sm">
            <div>
              <dt className="text-xs text-gray-500">{tr('Bill')}</dt>
              <dd className="font-semibold">{rupees(b.amountDue)}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">{tr('Paid')}</dt>
              <dd className="font-semibold text-green-700">{rupees(b.amountPaid)}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">{tr('Balance')}</dt>
              <dd className={`font-semibold ${Number(b.balance) > 0 ? 'text-red-600' : ''}`}>{rupees(b.balance)}</dd>
            </div>
          </dl>
          {Number(b.discount) > 0 && (
            <p className="mt-1 text-xs text-gray-500">{tr('Discount')}: {rupees(b.discount)}</p>
          )}
          {b.payments.length > 0 && (
            <ul className="mt-3 border-t border-gray-100 dark:border-slate-800 pt-2 space-y-2">
              {b.payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-gray-500 break-all">{tr('Receipt')} {p.receiptNo}</p>
                    <p className="text-xs text-gray-500">{fmtDate(p.collectedAt)} · {methodLabel(p.method)}</p>
                  </div>
                  <span className="font-semibold shrink-0">
                    {Number(p.amount) > 0 ? rupees(p.amount) : tr('Marked paid')}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {b.status !== 'paid' && Number(b.balance) > 0 && (
            <p className="mt-2 text-xs text-gray-500">{tr('Last date')}: {fmtDate(b.dueDate)}</p>
          )}
        </article>
      ))}
      </div>
    </div>
  );
};

export default CustomerHistory;
