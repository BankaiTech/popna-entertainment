// POS Settings - invoice format, auto-print, logo toggle
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getPOSSettings, savePOSSettings, type POSSettingsData } from '@/lib/posReceiptUtils';
import { Printer, Image } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function POSSettings() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<POSSettingsData>(getPOSSettings);

  useEffect(() => {
    savePOSSettings(settings);
  }, [settings]);

  const update = (patch: Partial<POSSettingsData>) => setSettings((s) => ({ ...s, ...patch }));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
          {t('settings.posTitle', 'POS / Checkout Settings')}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('settings.posDesc', 'Configure invoice format and checkout behavior for Point of Sale.')}
        </p>
      </div>

      {/* Invoice Format */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">
          {t('settings.invoiceFormat', 'Invoice Format')}
        </label>
        <div className="space-y-2">
          <label
            onClick={() => update({ invoiceFormat: 'thermal' })}
            className={cn(
              'flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all',
              settings.invoiceFormat === 'thermal'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            )}
          >
            <div className="mt-0.5 shrink-0">
              <div className={cn(
                'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                settings.invoiceFormat === 'thermal'
                  ? 'border-blue-500'
                  : 'border-gray-300 dark:border-gray-600'
              )}>
                {settings.invoiceFormat === 'thermal' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
              </div>
            </div>
            <div>
              <div className={cn('text-sm font-medium', settings.invoiceFormat === 'thermal' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100')}>
                {t('settings.thermalReceipt', 'Thermal Receipt (80mm)')}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {t('settings.thermalDesc', 'Small receipt for thermal printers. Compact layout with essential details.')}
              </div>
            </div>
          </label>

          <label
            onClick={() => update({ invoiceFormat: 'a4' })}
            className={cn(
              'flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all',
              settings.invoiceFormat === 'a4'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            )}
          >
            <div className="mt-0.5 shrink-0">
              <div className={cn(
                'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                settings.invoiceFormat === 'a4'
                  ? 'border-blue-500'
                  : 'border-gray-300 dark:border-gray-600'
              )}>
                {settings.invoiceFormat === 'a4' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
              </div>
            </div>
            <div>
              <div className={cn('text-sm font-medium', settings.invoiceFormat === 'a4' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100')}>
                {t('settings.a4Invoice', 'A4 Tax Invoice')}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {t('settings.a4Desc', 'Full-page GST tax invoice with CGST/SGST breakdown and amount in words.')}
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-5">
        {/* Auto-print */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Printer className="w-4 h-4 text-gray-400" />
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {t('settings.autoPrint', 'Auto-print on checkout')}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {t('settings.autoPrintDesc', 'Automatically open print dialog after confirming checkout.')}
              </div>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.autoPrint}
            onClick={() => update({ autoPrint: !settings.autoPrint })}
            className={cn(
              'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
              settings.autoPrint ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
            )}
          >
            <span className={cn('pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform', settings.autoPrint ? 'translate-x-5' : 'translate-x-0')} />
          </button>
        </div>

        {/* Show logo */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image className="w-4 h-4 text-gray-400" />
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {t('settings.showLogo', 'Show company logo')}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {t('settings.showLogoDesc', 'Include company logo in printed receipts and invoices.')}
              </div>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.showLogo}
            onClick={() => update({ showLogo: !settings.showLogo })}
            className={cn(
              'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
              settings.showLogo ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
            )}
          >
            <span className={cn('pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform', settings.showLogo ? 'translate-x-5' : 'translate-x-0')} />
          </button>
        </div>
      </div>
    </div>
  );
}
