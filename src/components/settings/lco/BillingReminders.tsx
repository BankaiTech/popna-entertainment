import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import type { OperatorSettings } from '@/api/operatorSettings';
import { useStore } from '@/store/useStore';
import { Field, inputClass, SaveBar, Section, Toggle, useOperatorSettings } from './SettingsUI';
import { tr } from '@/lib/lt';

const FIELDS: (keyof OperatorSettings)[] = [
  'reminderDaysBefore', 'secondReminderDaysBefore', 'internetRemindersEnabled',
  'internetPaymentSmsEnabled',
  'trackingEnabled', 'requireGpsForCollection', 'requireCheckinForCollection',
];
const days = (n: number) => (n === 0 ? tr('On the due date') : n === 1 ? tr('1 day before') : tr('{{n}} days before', { n }));

const BillingReminders = () => {
  const { settings: s, set, save, saving, errors, dirty } = useOperatorSettings();
  const { products, fetchProducts } = useStore();
  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  const cable = (Array.isArray(products) ? products : []).filter((p) => p.productType === 'cable' && p.isActive !== false);
  if (!s) return <p className="py-8 text-center text-muted-foreground">{tr('Loading…')}</p>;

  return (
    <div className="space-y-4">
      <Section title={tr('Cut-off dates')}
        hint={tr('Each cable provider has its own cut-off date. Reminder SMS are sent before it. Internet is due when the plan expires.')}>
        {cable.length === 0 ? (
          <p className="text-sm text-muted-foreground">{tr('No cable providers yet.')}</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {cable.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                <span className="font-medium truncate">{p.name}</span>
                {p.cutoffDate ? (
                  <span className="shrink-0">{tr('{{d}} of every month', { d: p.cutoffDate })}</span>
                ) : (
                  <span className="shrink-0 inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="w-4 h-4" />{tr('Not set')}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        <Link to="/admin/settings?tab=products" className="inline-block text-sm font-medium text-primary">
          {tr('Change in Providers & Plans')} →
        </Link>
      </Section>

      <Section title={tr('Reminder SMS')} hint={tr('Sent at 9 AM. Cable reminders are always on.')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={tr('First reminder')} error={errors.reminderDaysBefore}>
            <select className={inputClass} value={s.reminderDaysBefore} onChange={(e) => set('reminderDaysBefore', Number(e.target.value))}>
              {Array.from({ length: 16 }, (_, i) => i).map((d) => <option key={d} value={d}>{days(d)}</option>)}
            </select>
          </Field>
          <Field label={tr('Second reminder (optional)')} error={errors.secondReminderDaysBefore}>
            <select className={inputClass} value={s.secondReminderDaysBefore ?? ''}
              onChange={(e) => set('secondReminderDaysBefore', e.target.value === '' ? null : Number(e.target.value))}>
              <option value="">{tr('No second reminder')}</option>
              {Array.from({ length: 16 }, (_, i) => i).filter((d) => d < s.reminderDaysBefore).map((d) => <option key={d} value={d}>{days(d)}</option>)}
            </select>
          </Field>
        </div>
        <div className="divide-y divide-border">
          <Toggle label={tr('Cable reminders')} hint={tr('Always on for cable customers.')} checked disabled onChange={() => undefined} />
          {s.internetSmsAvailable && (
            <Toggle label={tr('Internet reminders')} hint={tr('Before the plan expires. Customers who opted out are skipped.')}
              checked={s.internetRemindersEnabled} onChange={(v) => set('internetRemindersEnabled', v)} />
          )}
        </div>
      </Section>

      <Section title={tr('Payment SMS')} hint={tr('Sent to the customer when a payment is saved.')}>
        <div className="divide-y divide-border">
          <Toggle label={tr('Cable payment SMS')} hint={tr('Always on.')} checked disabled onChange={() => undefined} />
          {s.internetSmsAvailable && (
            <Toggle label={tr('Internet payment SMS')} checked={s.internetPaymentSmsEnabled} onChange={(v) => set('internetPaymentSmsEnabled', v)} />
          )}
        </div>
      </Section>

      <Section title={tr('Field staff')} hint={tr('Location is recorded only between Start duty and End duty.')}>
        <div className="divide-y divide-border">
          <Toggle label={tr('Location tracking')} hint={tr('Turns My Duty and the Live Map on or off.')}
            checked={s.trackingEnabled} onChange={(v) => set('trackingEnabled', v)} />
          <Toggle label={tr('Agents must start duty before collecting')} disabled={!s.trackingEnabled}
            checked={s.requireCheckinForCollection} onChange={(v) => set('requireCheckinForCollection', v)} />
          <Toggle label={tr('Agents must share location with each payment')}
            checked={s.requireGpsForCollection} onChange={(v) => set('requireGpsForCollection', v)} />
        </div>
      </Section>

      <SaveBar disabled={!dirty(FIELDS)} saving={saving} onSave={() => save(FIELDS)} />
    </div>
  );
};

export default BillingReminders;
