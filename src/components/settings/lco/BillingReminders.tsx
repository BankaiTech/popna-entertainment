import type { OperatorSettings } from '@/api/operatorSettings';
import { Field, inputClass, SaveBar, Section, Toggle, useOperatorSettings } from './SettingsUI';
import { tr } from '@/lib/lt';

const FIELDS: (keyof OperatorSettings)[] = [
  'defaultDueDay', 'reminderDaysBefore', 'secondReminderDaysBefore', 'internetRemindersEnabled',
  'internetPaymentSmsEnabled',
  'trackingEnabled', 'requireGpsForCollection', 'requireCheckinForCollection',
];
const days = (n: number) => (n === 0 ? tr('On the due date') : n === 1 ? tr('1 day before') : tr('{{n}} days before', { n }));

const BillingReminders = () => {
  const { settings: s, set, save, saving, errors, dirty } = useOperatorSettings();
  if (!s) return <p className="py-8 text-center text-muted-foreground">{tr('Loading…')}</p>;

  return (
    <div className="space-y-4">
      <Section title={tr('Due dates')}
        hint={tr('Cable is due on a fixed day every month (the provider\'s cut-off day). Internet is due when the plan expires.')}>
        <Field label={tr('Default cable due day')} hint={tr('Used when a provider or customer has no due day of its own.')} error={errors.defaultDueDay}>
          <select className={inputClass} value={s.defaultDueDay} onChange={(e) => set('defaultDueDay', Number(e.target.value))}>
            {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{tr('{{d}} of every month', { d })}</option>)}
          </select>
        </Field>
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
          <Toggle label={tr('Internet reminders')} hint={tr('Before the plan expires. Customers who opted out are skipped.')}
            checked={s.internetRemindersEnabled} onChange={(v) => set('internetRemindersEnabled', v)} />
        </div>
      </Section>

      <Section title={tr('Payment SMS')} hint={tr('Sent to the customer when a payment is saved.')}>
        <div className="divide-y divide-border">
          <Toggle label={tr('Cable payment SMS')} hint={tr('Always on.')} checked disabled onChange={() => undefined} />
          <Toggle label={tr('Internet payment SMS')} checked={s.internetPaymentSmsEnabled} onChange={(v) => set('internetPaymentSmsEnabled', v)} />
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
