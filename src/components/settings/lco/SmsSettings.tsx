import { Link } from 'react-router-dom';
import type { OperatorSettings } from '@/api/operatorSettings';
import { useLt } from '@/lib/lt';
import { Field, inputClass, SaveBar, Section, useOperatorSettings } from './SettingsUI';

const FIELDS: (keyof OperatorSettings)[] = ['smsDisplayName'];

// Preview only. Must match the DLT-approved templates in backend/notifications/templates.py
// (see backend/docs/DLT_SMS_TEMPLATES.md).
type Tpl = (name: string, body: string, org: string) => string;
const EN: Tpl = (name, body, org) =>
  `Dear Customer ${name},\n${body}\nThank you for your continued support.\nRegards,\n${org}\nPING4SMS`;
const TA_REMINDER: Tpl = (name, body, org) =>
  `${name}, கேபிள் கட்டணம் ${body}க்குள் செலுத்தவும். ${org}\nPING4SMS`;
const TA_RECEIPT: Tpl = (_name, body, org) =>
  `கேபிள் சந்தா ₹${body} அன்று பெறப்பட்டது. ${org}\nPING4SMS`;
const TEMPLATE: Record<'en' | 'ta', Record<'receipt' | 'reminder', Tpl>> = {
  en: { receipt: EN, reminder: EN },
  ta: { receipt: TA_RECEIPT, reminder: TA_REMINDER },
};
const EXAMPLES = {
  en: { receipt: 'Paid Rs.230, Receipt 000123', reminder: 'Rs.230 due 10-11-26, pay early' },
  ta: { receipt: '230, 19-11-2026', reminder: '₹230, 20-11-26 ' },
};

const SmsSettings = () => {
  const tr = useLt();
  const { settings: s, set, save, saving, errors, dirty } = useOperatorSettings();
  if (!s) return <p className="py-8 text-center text-muted-foreground">{tr('Loading…')}</p>;
  const org = (s.smsDisplayName || s.name).slice(0, 30);
  const lang = 'ta' as const; // all customer SMS go in Tamil for now (server setting SMS_ONLY_LANGUAGE)

  return (
    <div className="space-y-4">
      <Section title={tr('SMS to customers')} hint={tr('SMS are sent only to customers. You see every SMS in the SMS Log.')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={tr('Business name in SMS')} hint={tr('Max 30 characters')} error={errors.smsDisplayName}>
            <input className={inputClass} maxLength={30} value={s.smsDisplayName} placeholder={s.name}
              onChange={(e) => set('smsDisplayName', e.target.value)} />
          </Field>
        </div>
        <p className="text-xs text-muted-foreground">{tr('All SMS to customers are sent in Tamil.')}</p>
        <SaveBar disabled={!dirty(FIELDS)} saving={saving} onSave={() => save(FIELDS)} />
      </Section>

      <Section title={tr('Messages we send')} hint={tr('Approved with the telecom operators (DLT), so the wording cannot be edited here.')}>
        <ul className="space-y-3">
          {([['Payment receipt', 'receipt'], ['Due reminder', 'reminder']] as const).map(([title, key]) => (
            <li key={key} className="text-sm">
              <p className="font-medium">{tr(title)}</p>
              <pre className="mt-1 whitespace-pre-wrap break-words rounded-lg bg-muted/40 border border-border p-2 text-xs leading-relaxed font-sans">
                {TEMPLATE[lang][key]('Ravi', EXAMPLES[lang][key], org)}
              </pre>
            </li>
          ))}
        </ul>
      </Section>

      <Link to="/admin/sms-log" className="block text-center rounded-xl border border-border py-3 text-sm font-medium text-blue-600 hover:bg-muted/30">
        {tr('Open SMS Log')} →
      </Link>
    </div>
  );
};

export default SmsSettings;
