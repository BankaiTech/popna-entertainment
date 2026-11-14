// Organization-based settings tab access
import { tr } from '@/lib/lt';
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/Card';
import { Package, Building2, CreditCard, MessageSquare } from 'lucide-react';
import ProductManagement from '@/components/settings/ProductManagement';
import CompanyProfileSettings from '@/components/settings/CompanyProfileSettings';
import BillingSettings from '@/components/settings/BillingSettings';
import SmsTemplates from '@/components/settings/SmsTemplates';
import BusinessProfile from '@/components/settings/lco/BusinessProfile';
import BillingReminders from '@/components/settings/lco/BillingReminders';
import SmsSettings from '@/components/settings/lco/SmsSettings';
import { isMockMode } from '@/lib/apiHelpers';
import { cn } from '@/lib/utils';
import { useOrganizationStore } from '@/store/useOrganizationStore';
import type { SettingsTabKey } from '@/models/types';

type SettingsTab = SettingsTabKey;

const Settings = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const { isSettingsTabAllowed } = useOrganizationStore();

  // LCO Desk settings: only what a cable / broadband operator needs.
  const allTabs: { id: SettingsTab; label: string; icon: typeof Building2; description: string }[] = useMemo(() => [
    { id: 'company', label: tr('Business Profile'), icon: Building2, description: tr('Your plan, business details and UPI') },
    { id: 'products', label: tr('Providers & Plans'), icon: Package, description: tr('Service connection types (GTPL, RailWire...) and their plans') },
    { id: 'billing', label: tr('Billing & Reminders'), icon: CreditCard, description: tr('Due dates, reminder SMS, payment SMS and field staff rules') },
    { id: 'sms-templates', label: tr('SMS'), icon: MessageSquare, description: tr('Business name in SMS, SMS language and the messages we send') },
  ], []);

  const tabs = useMemo(
    () => allTabs.filter((tab) => isSettingsTabAllowed(tab.id)),
    [isSettingsTabAllowed, allTabs]
  );
  const realApi = !isMockMode();

  const [activeTab, setActiveTab] = useState<SettingsTab>(tabs.length > 0 ? tabs[0].id : 'company');

  useEffect(() => {
    if (tabParam && tabs.some((tab) => tab.id === tabParam)) {
      setActiveTab(tabParam as SettingsTab);
    }
  }, [tabParam, tabs]);

  useEffect(() => {
    if (tabs.length > 0 && !tabs.find((tab) => tab.id === activeTab)) {
      setActiveTab(tabs[0].id);
    }
  }, [tabs, activeTab]);

  const setActiveTabAndUrl = (tab: SettingsTab) => {
    setActiveTab(tab);
    if (tab === tabs[0]?.id) {
      const next = new URLSearchParams(searchParams);
      next.delete('tab');
      setSearchParams(next, { replace: true });
    } else {
      setSearchParams({ tab }, { replace: true });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 px-0 sm:px-0 pb-6 sm:pb-0">
      {/* Page header */}

      {/* Mobile: dropdown for tabs */}
      <div className="sm:hidden w-full">
        <label htmlFor="settings-tab-select" className="sr-only">
          {t('settings.tabsLabel', 'Settings tabs')}
        </label>
        <select
          id="settings-tab-select"
          value={activeTab}
          onChange={(e) => setActiveTabAndUrl(e.target.value as SettingsTab)}
          className="w-full h-12 px-4 rounded-xl border border-border bg-card text-foreground font-medium text-base"
          aria-label={t('settings.tabsLabel', 'Settings tabs')}
        >
          {tabs.map((tab) => (
            <option key={tab.id} value={tab.id}>
              {tab.label}
            </option>
          ))}
        </select>
      </div>

      {/* Desktop: pill tab list */}
      <nav
        role="tablist"
        aria-label={t('settings.tabsLabel', 'Settings tabs')}
        className="hidden sm:flex gap-1 p-1 rounded-xl bg-gray-100/60 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 w-full overflow-x-auto"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`settings-panel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTabAndUrl(tab.id)}
              className={cn(
                'flex items-center gap-2 shrink-0 xl:flex-1 xl:shrink justify-center px-3 lg:px-5 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                isActive
                  ? 'bg-white dark:bg-gray-900 text-primary shadow-sm border border-gray-200 dark:border-gray-700'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-white/60 dark:hover:bg-gray-700/60'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Tab panel */}
      <Card className="overflow-hidden">
        <CardContent className="p-4 sm:p-6">
          
          <div
            role="tabpanel"
            id={`settings-panel-${activeTab}`}
            aria-labelledby={`tab-${activeTab}`}
            className="min-w-0"
          >
            {activeTab === 'company' && (realApi ? <BusinessProfile /> : <CompanyProfileSettings />)}
            {activeTab === 'products' && <ProductManagement />}
            {activeTab === 'billing' && (realApi ? <BillingReminders /> : <BillingSettings />)}
            {activeTab === 'sms-templates' && (realApi ? <SmsSettings /> : <SmsTemplates />)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
