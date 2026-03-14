import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Quote } from 'lucide-react';
import { cn } from '@/lib/utils';
import Invoices from './Invoices';
import Quotations from './Quotations';

type SalesTab = 'invoices' | 'quotations';

const TABS: { id: SalesTab; labelKey: string; icon: typeof FileText }[] = [
  { id: 'invoices', labelKey: 'nav.invoices', icon: FileText },
  { id: 'quotations', labelKey: 'nav.quotations', icon: Quote },
];

export default function Sales() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<SalesTab>('invoices');

  return (
    <div className="space-y-4">
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex flex-wrap gap-1 -mb-px">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-3 text-sm font-medium rounded-t-lg border-b-2 transition-colors',
                  activeTab === tab.id
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                )}
              >
                <Icon className="w-4 h-4" />
                {t(tab.labelKey, tab.id)}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="pt-2">
        {activeTab === 'invoices' && <Invoices />}
        {activeTab === 'quotations' && <Quotations />}
      </div>
    </div>
  );
}
