// Organization-based settings tab access
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/Card';
import { Package, Building2, CreditCard } from 'lucide-react';
import ProductManagement from '@/components/settings/ProductManagement';
import CompanyProfileSettings from '@/components/settings/CompanyProfileSettings';
import BillingSettings from '@/components/settings/BillingSettings';
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

  const activeTabInfo = tabs.find((t) => t.id === activeTab);

  return (
    <div className="space-y-4 sm:space-y-6 px-0 sm:px-0 pb-6 sm:pb-0">
      {/* Page header */}
      <div>
        <h1 className="text-lg sm:text-xl font-bold text-foreground">{t('settings.title', 'Settings')}</h1>
        <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
          {t('settings.subtitle', 'Configure products, company information, and billing.')}
        </p>
      </div>

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
        className="hidden sm:flex gap-1 p-1 rounded-xl bg-muted/40 border border-border w-full"
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
                  ? 'bg-card text-primary shadow-sm border border-border'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
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
          {activeTabInfo && (
            <div className="mb-4 sm:mb-5 pb-3 border-b border-border">
              <h2 className="text-base font-semibold text-foreground">{activeTabInfo.label}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{activeTabInfo.description}</p>
            </div>
          )}
          <div
            role="tabpanel"
            id={`settings-panel-${activeTab}`}
            aria-labelledby={`tab-${activeTab}`}
            className="min-w-0"
          >
            {activeTab === 'company' && <CompanyProfileSettings />}
            {activeTab === 'products' && <ProductManagement />}
            {activeTab === 'billing' && <BillingSettings />}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
