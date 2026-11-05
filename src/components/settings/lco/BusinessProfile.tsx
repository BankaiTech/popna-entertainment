import { formatDateIN } from '@/lib/subscription';
import type { OperatorSettings } from '@/api/operatorSettings';
import { Field, inputClass, SaveBar, Section, useOperatorSettings } from './SettingsUI';

const FIELDS: (keyof OperatorSettings)[] = [
  'businessAddress', 'gstin', 'contactPhone', 'contactEmail', 'upiId', 'upiPayeeName',
];
const limit = (used: number, max: number | null) => `${used} of ${max == null ? 'unlimited' : max}`;

const BusinessProfile = () => {
  const { settings: s, set, save, saving, errors, dirty } = useOperatorSettings();
  if (!s) return <p className="py-8 text-center text-muted-foreground">Loading…</p>;

  const subText =
    s.subscriptionState === 'expired' ? 'Expired'
      : s.daysLeft == null ? 'Active'
        : `Active · ${s.daysLeft} day${s.daysLeft === 1 ? '' : 's'} left`;

  return (
    <div className="space-y-4">
      <Section title="Your LCO Desk plan" hint="Set by LCO Desk. Contact us to renew or increase limits.">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-muted-foreground">Business</dt><dd className="font-medium">{s.name} ({s.code})</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Status</dt>
            <dd className={s.daysLeft != null && s.daysLeft <= 15 ? 'text-amber-600 font-medium' : 'font-medium'}>{subText}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Valid</dt>
            <dd>{formatDateIN(s.subscriptionStart)} → {formatDateIN(s.subscriptionEnd)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Connection types</dt><dd>{limit(s.providersUsed, s.maxProviders)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Connection products</dt><dd>{limit(s.plansUsed, s.maxPlans)}</dd></div>
        </dl>
      </Section>

      <Section title="Business details" hint="Printed on receipts and invoices.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field label="Address" error={errors.businessAddress}>
              <textarea rows={3} className={`${inputClass} h-auto py-2`} value={s.businessAddress}
                onChange={(e) => set('businessAddress', e.target.value)} />
            </Field>
          </div>
          <Field label="Phone" error={errors.contactPhone}>
            <input className={inputClass} inputMode="numeric" maxLength={14} value={s.contactPhone}
              onChange={(e) => set('contactPhone', e.target.value)} />
          </Field>
          <Field label="Email" error={errors.contactEmail}>
            <input className={inputClass} type="email" value={s.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} />
          </Field>
          <Field label="GSTIN (optional)" hint="15 characters, e.g. 33ABCDE1234F1Z5" error={errors.gstin}>
            <input className={`${inputClass} uppercase`} maxLength={15} value={s.gstin} onChange={(e) => set('gstin', e.target.value.toUpperCase())} />
          </Field>
        </div>
      </Section>

      <Section title="UPI for customer payments" hint="Used for UPI QR stickers and payment links.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="UPI ID" hint="e.g. sricable@okaxis" error={errors.upiId}>
            <input className={inputClass} value={s.upiId} onChange={(e) => set('upiId', e.target.value.trim())} />
          </Field>
          <Field label="Payee name" error={errors.upiPayeeName}>
            <input className={inputClass} maxLength={60} value={s.upiPayeeName} onChange={(e) => set('upiPayeeName', e.target.value)} />
          </Field>
        </div>
      </Section>

      <SaveBar disabled={!dirty(FIELDS)} saving={saving} onSave={() => save(FIELDS)} />
    </div>
  );
};

export default BusinessProfile;
