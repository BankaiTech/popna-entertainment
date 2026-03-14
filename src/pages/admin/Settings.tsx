// Organization-based settings tab access
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/Card';
import { Package, Building2, CreditCard, ShoppingCart, Sliders, LayoutGrid } from 'lucide-react';
import ProductManagement from '@/components/settings/ProductManagement';
import CompanyProfileSettings from '@/components/settings/CompanyProfileSettings';
import BillingSettings from '@/components/settings/BillingSettings';
import POSSettings from '@/components/settings/POSSettings';
import CustomFieldsSettings from '@/components/settings/CustomFieldsSettings';
import IndustrySettings from '@/components/settings/IndustrySettings';
import { cn } from '@/lib/utils';
import { useOrganizationStore } from '@/store/useOrganizationStore';
import type { SettingsTabKey } from '@/models/types';

type SettingsTab = SettingsTabKey;

const Settings = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const { isSettingsTabAllowed } = useOrganizationStore();

  const allTabs: { id: SettingsTab; label: string; icon: typeof Building2; description: string }[] = [
    { id: 'company', label: t('settings.tabCompany', 'Company Details'), icon: Building2, description: t('settings.companyDesc', 'Configure company information for invoices and documents') },
    { id: 'products', label: t('settings.tabProducts', 'Products'), icon: Package, description: t('settings.productsDesc', 'Manage products, plans, and pricing') },
    { id: 'billing', label: t('settings.tabBilling', 'Billing & UPI'), icon: CreditCard, description: t('settings.billingDesc', 'Pay by UPI apps and manage subscription') },
    { id: 'pos', label: t('settings.tabPOS', 'POS / Checkout'), icon: ShoppingCart, description: t('settings.posTabDesc', 'Invoice format and checkout settings') },
    { id: 'custom-fields', label: t('settings.tabCustomFields', 'Custom Fields'), icon: Sliders, description: t('settings.customFieldsTabDesc', 'Define custom fields for customers and products') },
    { id: 'industry', label: t('settings.tabIndustry', 'Industry'), icon: LayoutGrid, description: t('settings.industryTabDesc', 'Business type and module visibility') },
  ];

  const tabs = useMemo(
    () => allTabs.filter((tab) => isSettingsTabAllowed(tab.id)),
    [isSettingsTabAllowed, t]
  );

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
        className="hidden sm:flex gap-1 p-1 rounded-xl bg-gray-100/60 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 w-full"
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
                'flex items-center gap-2 flex-1 justify-center px-5 py-2.5 rounded-lg text-sm font-medium transition-colors',
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
            {activeTab === 'company' && <CompanyProfileSettings />}
            {activeTab === 'products' && <ProductManagement />}
            {activeTab === 'billing' && <BillingSettings />}
            {activeTab === 'pos' && <POSSettings />}
            {activeTab === 'custom-fields' && <CustomFieldsSettings />}
            {activeTab === 'industry' && <IndustrySettings />}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
