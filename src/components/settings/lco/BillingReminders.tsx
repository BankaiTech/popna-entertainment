import type { OperatorSettings } from '@/api/operatorSettings';
import { Field, inputClass, SaveBar, Section, Toggle, useOperatorSettings } from './SettingsUI';

const FIELDS: (keyof OperatorSettings)[] = [
  'defaultDueDay', 'reminderDaysBefore', 'secondReminderDaysBefore', 'internetRemindersEnabled',
  'internetPaymentSmsEnabled', 'ownerAlertMode', 'ownerMobile', 'extraAlertMobiles',
  'trackingEnabled', 'requireGpsForCollection', 'requireCheckinForCollection',
];
const days = (n: number) => (n === 0 ? 'On the due date' : `${n} day${n === 1 ? '' : 's'} before`);

const BillingReminders = () => {
  const { settings: s, set, save, saving, errors, dirty } = useOperatorSettings();
  if (!s) return <p className="py-8 text-center text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-4">
      <Section title="Due dates"
        hint="Cable is due on a fixed day every month (the provider's cut-off day). Internet is due when the plan expires.">
        <Field label="Default cable due day" hint="Used when a provider or customer has no due day of its own." error={errors.defaultDueDay}>
          <select className={inputClass} value={s.defaultDueDay} onChange={(e) => set('defaultDueDay', Number(e.target.value))}>
            {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d} of every month</option>)}
          </select>
        </Field>
      </Section>

      <Section title="Reminder SMS" hint="Sent at 9 AM. Cable reminders are always on.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="First reminder" error={errors.reminderDaysBefore}>
            <select className={inputClass} value={s.reminderDaysBefore} onChange={(e) => set('reminderDaysBefore', Number(e.target.value))}>
              {Array.from({ length: 16 }, (_, i) => i).map((d) => <option key={d} value={d}>{days(d)}</option>)}
            </select>
          </Field>
          <Field label="Second reminder (optional)" error={errors.secondReminderDaysBefore}>
            <select className={inputClass} value={s.secondReminderDaysBefore ?? ''}
              onChange={(e) => set('secondReminderDaysBefore', e.target.value === '' ? null : Number(e.target.value))}>
              <option value="">No second reminder</option>
              {Array.from({ length: 16 }, (_, i) => i).filter((d) => d < s.reminderDaysBefore).map((d) => <option key={d} value={d}>{days(d)}</option>)}
            </select>
          </Field>
        </div>
        <div className="divide-y divide-border">
          <Toggle label="Cable reminders" hint="Always on for cable customers." checked disabled onChange={() => undefined} />
          <Toggle label="Internet reminders" hint="Before the plan expires. Customers who opted out are skipped."
            checked={s.internetRemindersEnabled} onChange={(v) => set('internetRemindersEnabled', v)} />
        </div>
      </Section>

      <Section title="Payment SMS" hint="Sent the moment a payment is saved: amount, date, time and who collected it.">
        <div className="divide-y divide-border">
          <Toggle label="Cable payment SMS" hint="Always on." checked disabled onChange={() => undefined} />
          <Toggle label="Internet payment SMS" checked={s.internetPaymentSmsEnabled} onChange={(v) => set('internetPaymentSmsEnabled', v)} />
        </div>
        <Field label="Owner alerts" error={errors.ownerAlertMode}>
          <select className={inputClass} value={s.ownerAlertMode} onChange={(e) => set('ownerAlertMode', e.target.value as OperatorSettings['ownerAlertMode'])}>
            <option value="per_payment">SMS for every payment</option>
            <option value="daily_summary">One summary SMS at 9 PM (saves SMS cost)</option>
          </select>
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Owner mobile" error={errors.ownerMobile}>
            <input className={inputClass} inputMode="numeric" maxLength={14} value={s.ownerMobile} onChange={(e) => set('ownerMobile', e.target.value)} />
          </Field>
          <Field label="Also alert (optional)" hint="More mobiles, separated by commas" error={errors.extraAlertMobiles}>
            <input className={inputClass} value={s.extraAlertMobiles} onChange={(e) => set('extraAlertMobiles', e.target.value)} />
          </Field>
        </div>
      </Section>

      <Section title="Field staff" hint="Location is recorded only between Start duty and End duty.">
        <div className="divide-y divide-border">
          <Toggle label="Location tracking" hint="Turns My Duty and the Live Map on or off."
            checked={s.trackingEnabled} onChange={(v) => set('trackingEnabled', v)} />
          <Toggle label="Agents must start duty before collecting" disabled={!s.trackingEnabled}
            checked={s.requireCheckinForCollection} onChange={(v) => set('requireCheckinForCollection', v)} />
          <Toggle label="Agents must share location with each payment"
            checked={s.requireGpsForCollection} onChange={(v) => set('requireGpsForCollection', v)} />
        </div>
      </Section>

      <SaveBar disabled={!dirty(FIELDS)} saving={saving} onSave={() => save(FIELDS)} />
    </div>
  );
};

export default BillingReminders;
