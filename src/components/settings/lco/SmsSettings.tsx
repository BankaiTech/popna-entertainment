import { useEffect, useState } from 'react';
import apiClient from '@/lib/apiClient';
import { toCamelCase, unwrapApiData } from '@/lib/apiHelpers';
import type { OperatorSettings } from '@/api/operatorSettings';
import { Field, inputClass, SaveBar, Section, useOperatorSettings } from './SettingsUI';

interface SmsLog { id: number; kind: string; mobile: string; message: string; status: string; sentAt: string | null; createdAt: string }

const FIELDS: (keyof OperatorSettings)[] = ['smsDisplayName'];
const KIND: Record<string, string> = {
  payment_receipt: 'Payment receipt', owner_payment_alert: 'Owner alert', due_reminder: 'Reminder', owner_daily_summary: 'Daily summary',
};
const STATUS_TONE: Record<string, string> = {
  sent: 'text-green-700', pending: 'text-amber-600', sending: 'text-amber-600', failed: 'text-red-600',
};

const MESSAGES = (org: string) => [
  { title: 'Payment receipt → customer', text: `Dear Ravi, Rs.230 received for Cable TV Nov 2026 on 05-11-2026 10:30 AM by Murugan. Receipt ${'DEMO01-000123'}. Balance Rs.0. -${org}` },
  { title: 'Payment alert → owner', text: 'Murugan collected Rs.230 from Ravi (98400xxxxx) on 05-11-2026 10:30 AM. Receipt DEMO01-000123. -LCO Desk' },
  { title: 'Due reminder → customer', text: `Dear Ravi, your Cable TV payment of Rs.230 is due on 10-11-2026. Please pay in advance to avoid disconnection. -${org}` },
  { title: 'Daily summary → owner', text: `${org}: 05-11-2026 collections Rs.12,450 from 54 payments. Cash Rs.9,200, UPI Rs.3,250. -LCO Desk` },
];

const SmsSettings = () => {
  const { settings: s, set, save, saving, errors, dirty } = useOperatorSettings();
  const [logs, setLogs] = useState<SmsLog[]>([]);

  useEffect(() => {
    apiClient.get('/sms-logs').then((r) => {
      const list = unwrapApiData<unknown[]>(r);
      setLogs((Array.isArray(list) ? list : []).slice(0, 50).map((x) => toCamelCase<SmsLog>(x)));
    }).catch(() => undefined);
  }, []);

  if (!s) return <p className="py-8 text-center text-muted-foreground">Loading…</p>;
  const org = (s.smsDisplayName || s.name).slice(0, 30);

  return (
    <div className="space-y-4">
      <Section title="Sender name" hint="Shown at the end of customer SMS. Max 30 characters.">
        <Field label="Name in SMS" error={errors.smsDisplayName}>
          <input className={inputClass} maxLength={30} value={s.smsDisplayName} placeholder={s.name}
            onChange={(e) => set('smsDisplayName', e.target.value)} />
        </Field>
        <SaveBar disabled={!dirty(FIELDS)} saving={saving} onSave={() => save(FIELDS)} />
      </Section>

      <Section title="Messages we send" hint="These texts are registered with telecom operators (DLT), so they can't be edited here.">
        <ul className="space-y-3">
          {MESSAGES(org).map((m) => (
            <li key={m.title} className="text-sm">
              <p className="font-medium">{m.title}</p>
              <p className="mt-1 rounded-lg bg-muted/40 border border-border p-2 text-xs leading-relaxed">{m.text}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Recent SMS" hint="Last 50. Use this when a customer says they didn't get a message.">
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No SMS yet.</p>
        ) : (
          <ul className="divide-y divide-border text-sm max-h-96 overflow-y-auto">
            {logs.map((l) => (
              <li key={l.id} className="py-2 flex justify-between gap-3">
                <span className="min-w-0">
                  <span className="block font-medium">{KIND[l.kind] ?? l.kind} · {l.mobile}</span>
                  <span className="block text-xs text-muted-foreground truncate">{l.message}</span>
                </span>
                <span className="text-right shrink-0">
                  <span className={`block text-xs font-semibold capitalize ${STATUS_TONE[l.status] ?? ''}`}>{l.status}</span>
                  <span className="block text-xs text-muted-foreground">
                    {new Date(l.sentAt ?? l.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
};

export default SmsSettings;
