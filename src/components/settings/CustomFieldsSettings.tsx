// Custom field definitions for contacts/entities (mock: in-memory list)
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Plus, Trash2, Globe } from 'lucide-react';

const SUPPORTED_LOCALES = ['en', 'ta', 'hi', 'te', 'kn', 'ml'] as const;
const LOCALE_NAMES: Record<string, string> = { en: 'English', ta: 'தமிழ்', hi: 'हिन्दी', te: 'తెలుగు', kn: 'ಕನ್ನಡ', ml: 'മലയാളം' };

export interface CustomFieldDefinition {
  id: string;
  name: string;
  label: string;
  labels?: Record<string, string>;
  type: 'text' | 'number' | 'date' | 'checkbox';
  entity: 'customer' | 'product' | 'invoice';
}

const DEFAULT_FIELDS: CustomFieldDefinition[] = [];

const CustomFieldsSettings = () => {
  const { t, i18n } = useTranslation();
  const [fields, setFields] = useState<CustomFieldDefinition[]>(DEFAULT_FIELDS);
  const [expandedLocales, setExpandedLocales] = useState<Set<string>>(new Set());

  const addField = () => {
    setFields((prev) => [
      ...prev,
      {
        id: `cf-${Date.now()}`,
        name: '',
        label: '',
        labels: {},
        type: 'text',
        entity: 'customer',
      },
    ]);
  };

  const updateField = (id: string, patch: Partial<CustomFieldDefinition>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const updateFieldLocaleLabel = (id: string, locale: string, value: string) => {
    setFields((prev) => prev.map((f) => {
      if (f.id !== id) return f;
      return { ...f, labels: { ...(f.labels || {}), [locale]: value } };
    }));
  };

  const removeField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
  };

  const toggleLocales = (id: string) => {
    setExpandedLocales((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const currentLocale = i18n.language?.slice(0, 2) || 'en';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{t('settings.customFieldsTitle', 'Custom Fields')}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t('settings.customFieldsDesc', 'Define custom fields for customers, products, or invoices. These appear in the respective forms.')}
        </p>
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 shrink-0" />
          {t('settings.customFieldsMultiLanguageNote', 'Add labels in multiple languages. Use the translate button (🌐) per field to add other languages.')}
        </p>
      </div>

      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={addField}>
          <Plus className="w-4 h-4 mr-2" />
          {t('settings.addCustomField', 'Add field')}
        </Button>
      </div>

      {fields.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          {t('settings.noCustomFieldsDefined', 'No custom fields defined. Click "Add field" to create one.')}
        </div>
      ) : (
        <div className="space-y-4">
          {fields.map((field) => (
            <div key={field.id} className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="flex flex-wrap items-end gap-3 p-4">
                <div className="flex-1 min-w-[120px]">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{t('settings.fieldName', 'Field key')}</label>
                  <Input
                    value={field.name}
                    onChange={(e) => updateField(field.id, { name: e.target.value.replace(/\s/g, '_') })}
                    placeholder="e.g. loyalty_tier"
                  />
                </div>
                <div className="flex-1 min-w-[120px]">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    {t('settings.currentLanguageLabel', 'Label ({{language}})', { language: LOCALE_NAMES[currentLocale] || 'English' })}
                  </label>
                  <Input
                    value={currentLocale === 'en' ? field.label : (field.labels?.[currentLocale] ?? field.label)}
                    onChange={(e) => currentLocale === 'en' ? updateField(field.id, { label: e.target.value }) : updateFieldLocaleLabel(field.id, currentLocale, e.target.value)}
                    placeholder="e.g. Loyalty Tier"
                  />
                </div>
                <div className="w-32">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{t('settings.fieldType', 'Type')}</label>
                  <Select
                    value={field.type}
                    onChange={(e) => updateField(field.id, { type: e.target.value as CustomFieldDefinition['type'] })}
                  >
                    <option value="text">{t('settings.typeText', 'Text')}</option>
                    <option value="number">{t('settings.typeNumber', 'Number')}</option>
                    <option value="date">{t('settings.typeDate', 'Date')}</option>
                    <option value="checkbox">{t('settings.typeCheckbox', 'Checkbox')}</option>
                  </Select>
                </div>
                <div className="w-36">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{t('settings.fieldEntity', 'Applies to')}</label>
                  <Select
                    value={field.entity}
                    onChange={(e) => updateField(field.id, { entity: e.target.value as CustomFieldDefinition['entity'] })}
                  >
                    <option value="customer">{t('settings.entityCustomer', 'Customer')}</option>
                    <option value="product">{t('settings.entityProduct', 'Product')}</option>
                    <option value="invoice">{t('settings.entityInvoice', 'Invoice')}</option>
                  </Select>
                </div>
                <button
                  type="button"
                  onClick={() => toggleLocales(field.id)}
                  className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
                  title={t('settings.translateLabels', 'Translate labels')}
                >
                  <Globe className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => removeField(field.id)}
                  className="p-2 text-destructive hover:bg-destructive/10 rounded"
                  title={t('common.remove', 'Remove')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {expandedLocales.has(field.id) && (
                <div className="border-t border-border bg-muted/20 dark:bg-muted/10 px-4 py-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    {t('settings.translatedLabels', 'Translated labels (all languages)')}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {SUPPORTED_LOCALES.map((locale) => (
                      <div key={locale} className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground w-14 shrink-0">{LOCALE_NAMES[locale]}</span>
                        <Input
                          value={locale === 'en' ? (field.label ?? '') : (field.labels?.[locale] || '')}
                          onChange={(e) => locale === 'en' ? updateField(field.id, { label: e.target.value }) : updateFieldLocaleLabel(field.id, locale, e.target.value)}
                          placeholder={locale === 'en' ? 'e.g. Loyalty Tier' : (field.label || '...')}
                          className="text-xs h-8"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {t('settings.customFieldsHint', 'Custom field values are stored per record. This screen only defines which fields exist.')}
      </p>
    </div>
  );
};

export default CustomFieldsSettings;
