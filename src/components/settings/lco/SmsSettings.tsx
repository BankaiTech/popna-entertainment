import { Link } from 'react-router-dom';
import type { OperatorSettings } from '@/api/operatorSettings';
import { useLt } from '@/lib/lt';
import { Field, inputClass, SaveBar, Section, useOperatorSettings } from './SettingsUI';

const FIELDS: (keyof OperatorSettings)[] = ['smsDisplayName', 'smsLanguage'];

// Must match the DLT-approved templates exactly (see backend/docs/DLT_SMS_TEMPLATES.md).
const TEMPLATE = {
  en: (name: string, body: string, org: string) =>
    `Dear Customer ${name},\n${body}\nThank you for your continued support.\nRegards,\n${org}\nPING4SMS`,
  ta: (name: string, body: string, org: string) =>
    `அன்புள்ள வாடிக்கையாளர் ${name},\n${body}\nஉங்கள் தொடர்ந்து வழங்கும் ஆதரவிற்கு நன்றி.\nஅன்புடன்,\n${org}\nPING4SMS`,
};
const EXAMPLES = {
  en: { receipt: 'Paid Rs.230, Receipt 000123', reminder: 'Rs.230 due 10-11-26, pay early' },
  ta: { receipt: 'ரூ.230 பெறப்பட்டது, ரசீது 000123', reminder: 'ரூ.230 10-11-26க்குள் செலுத்தவும்' },
};

const SmsSettings = () => {
  const tr = useLt();
  const { settings: s, set, save, saving, errors, dirty } = useOperatorSettings();
  if (!s) return <p className="py-8 text-center text-muted-foreground">{tr('Loading…')}</p>;
  const org = (s.smsDisplayName || s.name).slice(0, 30);
  const lang = s.smsLanguage ?? 'en';

  return (
    <div className="space-y-4">
      <Section title={tr('SMS to customers')} hint={tr('SMS are sent only to customers. You see every SMS in the SMS Log.')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={tr('Business name in SMS')} hint={tr('Max 30 characters')} error={errors.smsDisplayName}>
            <input className={inputClass} maxLength={30} value={s.smsDisplayName} placeholder={s.name}
              onChange={(e) => set('smsDisplayName', e.target.value)} />
          </Field>
          <Field label={tr('Default SMS language')} hint={tr('Can be changed for each customer')} error={errors.smsLanguage}>
            <select className={inputClass} value={lang} onChange={(e) => set('smsLanguage', e.target.value as 'en' | 'ta')}>
              <option value="en">English</option>
              <option value="ta">தமிழ் (Tamil)</option>
            </select>
          </Field>
        </div>
        <SaveBar disabled={!dirty(FIELDS)} saving={saving} onSave={() => save(FIELDS)} />
      </Section>

      <Section title={tr('Messages we send')} hint={tr('Approved with the telecom operators (DLT), so the wording cannot be edited here.')}>
        <ul className="space-y-3">
          {([['Payment receipt', 'receipt'], ['Due reminder', 'reminder']] as const).map(([title, key]) => (
            <li key={key} className="text-sm">
              <p className="font-medium">{tr(title)}</p>
              <pre className="mt-1 whitespace-pre-wrap break-words rounded-lg bg-muted/40 border border-border p-2 text-xs leading-relaxed font-sans">
                {TEMPLATE[lang]('Ravi', EXAMPLES[lang][key], org)}
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
