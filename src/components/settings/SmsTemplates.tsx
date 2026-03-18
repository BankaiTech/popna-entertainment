import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSmsTemplatesStore } from '@/store/useSmsTemplatesStore';
import type { SmsLanguage, SmsTemplate } from '@/models/types';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { showSuccess } from '@/utils/toast';
import { MessageSquare, Settings2, Send, RotateCcw, Save, Plus } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { MOCK_ORGANIZATION_ID } from '@/models/types';

const SMS_LANGUAGES: Array<{ lang: SmsLanguage; labelKey: string; fallback: string }> = [
  { lang: 'en', labelKey: 'sms.langEn', fallback: 'EN' },
  { lang: 'hi', labelKey: 'sms.langHi', fallback: 'हि' },
  { lang: 'ta', labelKey: 'sms.langTa', fallback: 'தமிழ்' },
  { lang: 'te', labelKey: 'sms.langTe', fallback: 'తె' },
  { lang: 'kn', labelKey: 'sms.langKn', fallback: 'ಕ' },
  { lang: 'ml', labelKey: 'sms.langMl', fallback: 'മ' },
];

function getSmsCount(text: string): { chars: number; sms: number } {
  const chars = text.length;
  const sms = chars === 0 ? 0 : chars <= 160 ? 1 : Math.ceil(chars / 153);
  return { chars, sms };
}

export default function SmsTemplates() {
  const { t } = useTranslation();
  const orgId = useAuthStore.getState().organizationId ?? MOCK_ORGANIZATION_ID;
  const { templates, apiConfig, fetchTemplates, fetchApiConfig, saveTemplate, resetToDefault, saveApiConfig } =
    useSmsTemplatesStore();

  const [activeLang, setActiveLang] = useState<SmsLanguage>('en');
  const [draft, setDraft] = useState<{ name: string; content: string; variableHints: string }>({
    name: '',
    content: '',
    variableHints: '',
  });
  const [apiForm, setApiForm] = useState({ apiUrl: '', apiKey: '', senderId: '', isEnabled: false });
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchTemplates();
    fetchApiConfig();
  }, [fetchTemplates, fetchApiConfig]);

  // Sync API form when config loads
  useEffect(() => {
    if (apiConfig) {
      setApiForm({
        apiUrl: apiConfig.apiUrl,
        apiKey: apiConfig.apiKey,
        senderId: apiConfig.senderId,
        isEnabled: apiConfig.isEnabled,
      });
    }
  }, [apiConfig]);

  // Sync draft when active language or templates change
  useEffect(() => {
    const tpl = templates.find((t) => t.language === activeLang);
    if (tpl) {
      setDraft({ name: tpl.name, content: tpl.content, variableHints: tpl.variableHints });
    } else {
      setDraft({ name: '', content: '', variableHints: '' });
    }
  }, [activeLang, templates]);

  const currentTemplate = templates.find((t) => t.language === activeLang);

  const handleSave = async () => {
    const id = currentTemplate?.id ?? `${orgId}-default-${activeLang}`;
    const tpl: SmsTemplate = {
      id,
      organizationId: orgId,
      name: draft.name,
      language: activeLang,
      content: draft.content,
      variableHints: draft.variableHints,
      isDefault: currentTemplate?.isDefault ?? true,
      updatedAt: new Date().toISOString(),
    };
    await saveTemplate(tpl);
    showSuccess(t('sms.saved', 'Template saved'));
  };

  const handleReset = async () => {
    await resetToDefault(activeLang);
    showSuccess(t('sms.resetDefault', 'Reset to Default'));
  };

  const handleInsertVar = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newContent = draft.content.slice(0, start) + '{#var#}' + draft.content.slice(end);
    setDraft((d) => ({ ...d, content: newContent }));
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + 7, start + 7);
    });
  };

  const handleSaveApiConfig = async () => {
    await saveApiConfig(apiForm);
    showSuccess(t('sms.apiSaved', 'API config saved'));
  };

  const { chars, sms } = getSmsCount(draft.content);

  return (
    <div className="space-y-6">
      {/* Language Tabs + Template Editor */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            {t('sms.tabTitle', 'SMS Templates')}
          </h2>
        </div>

        {/* Language Tab Bar */}
        <div className="flex gap-1 p-1 rounded-lg bg-muted border border-border mb-4 w-full overflow-x-auto">
          {SMS_LANGUAGES.map(({ lang, labelKey, fallback }) => (
            <button
              key={lang}
              onClick={() => setActiveLang(lang)}
              className={cn(
                'flex-1 min-w-[44px] px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
                activeLang === lang
                  ? 'bg-background text-foreground shadow-sm border border-border'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
              )}
            >
              {t(labelKey, fallback)}
            </button>
          ))}
        </div>

        {/* Template Form */}
        <div className="space-y-3">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1 text-foreground">
              {t('sms.templateName', 'Template Name')}
            </label>
            <Input
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="e.g. Payment Reminder"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium mb-1 text-foreground">
              {t('sms.messageContent', 'Message Content')}
            </label>
            <textarea
              ref={textareaRef}
              value={draft.content}
              onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
              rows={8}
              className="w-full rounded-lg border border-border bg-background text-foreground text-sm p-3 resize-y font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Dear Customer {#var#}, ..."
            />
            <div className="flex items-center justify-between mt-1 gap-2 flex-wrap">
              <span className={cn('text-xs', chars > 306 ? 'text-red-500' : 'text-muted-foreground')}>
                {t('sms.charCount', '{{count}} characters ({{sms}} SMS)', { count: chars, sms })}
              </span>
              <Button variant="outline" size="sm" onClick={handleInsertVar} className="flex items-center gap-1.5 h-7 text-xs px-2.5">
                <Plus className="w-3 h-3" />
                {t('sms.insertVar', 'Insert {#var#}')}
              </Button>
            </div>
          </div>

          {/* Variable Hints */}
          <div>
            <label className="block text-sm font-medium mb-1 text-foreground">
              {t('sms.variables', 'Variables (in order)')}
            </label>
            <Input
              value={draft.variableHints}
              onChange={(e) => setDraft((d) => ({ ...d, variableHints: e.target.value }))}
              placeholder={t('sms.variablesHint', 'Describe each {#var#} placeholder, comma separated')}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 flex-wrap pt-1">
            <Button variant="outline" size="sm" onClick={handleReset} className="flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" />
              {t('sms.resetDefault', 'Reset to Default')}
            </Button>
            <Button size="sm" onClick={handleSave} className="flex items-center gap-1.5">
              <Save className="w-3.5 h-3.5" />
              {t('sms.saveTemplate', 'Save Template')}
            </Button>
          </div>
        </div>
      </div>

      {/* SMS API Configuration */}
      <Card className="border-border">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-muted-foreground" />
              {t('sms.apiConfig', 'SMS API Configuration')}
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTestDialog(true)}
              disabled={!apiConfig?.isEnabled}
              className="flex items-center gap-1.5 text-xs"
            >
              <Send className="w-3.5 h-3.5" />
              {t('sms.testSms', 'Test SMS')}
            </Button>
          </div>

          {!apiConfig?.isEnabled && (
            <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
              {t('sms.apiNotConfigured', 'Configure SMS API to send messages')}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1 text-foreground">{t('sms.apiUrl', 'API URL')}</label>
              <Input
                value={apiForm.apiUrl}
                onChange={(e) => setApiForm((f) => ({ ...f, apiUrl: e.target.value }))}
                placeholder="https://api.smsprovider.com/send"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">{t('sms.apiKey', 'API Key')}</label>
              <Input
                type="password"
                value={apiForm.apiKey}
                onChange={(e) => setApiForm((f) => ({ ...f, apiKey: e.target.value }))}
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">{t('sms.senderId', 'Sender ID')}</label>
              <Input
                value={apiForm.senderId}
                onChange={(e) => setApiForm((f) => ({ ...f, senderId: e.target.value }))}
                placeholder="MYBIZ"
              />
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={apiForm.isEnabled}
                onChange={(e) => setApiForm((f) => ({ ...f, isEnabled: e.target.checked }))}
                className="w-4 h-4 rounded border-border accent-primary"
              />
              <span className="text-sm text-foreground">{t('sms.enableSms', 'Enable SMS')}</span>
            </label>
            <Button size="sm" onClick={handleSaveApiConfig} className="flex items-center gap-1.5">
              <Save className="w-3.5 h-3.5" />
              {t('sms.saveApiConfig', 'Save API Config')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test SMS Dialog */}
      {showTestDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-background border border-border rounded-xl shadow-xl w-full max-w-sm p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">{t('sms.testSms', 'Test SMS')}</h3>
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">{t('sms.testPhone', 'Phone Number')}</label>
              <Input
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="+91 99999 99999"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t('sms.testMessage', 'Select Template')}: {draft.name}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowTestDialog(false)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  showSuccess(t('sms.sendTest', 'Send'));
                  setShowTestDialog(false);
                }}
                className="flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                {t('sms.sendTest', 'Send')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
