// Organization-based settings tab access
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
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

  // All possible tabs
  const allTabs: { id: SettingsTab; label: string; icon: typeof Building2; description: string }[] = [
    { id: 'company', label: t('settings.tabCompany', 'Company Details'), icon: Building2, description: t('settings.companyDesc', 'Configure company information for invoices and documents') },
    { id: 'products', label: t('settings.tabProducts', 'Products'), icon: Package, description: t('settings.productsDesc', 'Manage products, plans, and pricing') },
    { id: 'billing', label: t('settings.tabBilling', 'Billing & UPI'), icon: CreditCard, description: t('settings.billingDesc', 'Pay by UPI apps and manage subscription') },
  ];

  // Filter by organization allowed settings tabs
  const tabs = useMemo(
    () => allTabs.filter((tab) => isSettingsTabAllowed(tab.id)),
    [isSettingsTabAllowed, t]
  );

  // Display order: 1 Company Details, 2 Products, 3 Billing (filtered by org access)
  const [activeTab, setActiveTab] = useState<SettingsTab>(tabs.length > 0 ? tabs[0].id : 'company');

  // Sync active tab with URL ?tab=billing
  useEffect(() => {
    if (tabParam && tabs.some((tab) => tab.id === tabParam)) {
      setActiveTab(tabParam as SettingsTab);
    }
  }, [tabParam, tabs]);

  // Update active tab when tabs change
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
    <div className="space-y-6">
      <div>
        <h1 className="text-lg sm:text-xl font-bold text-foreground mb-1">{t('settings.title', 'Settings')}</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          {t('settings.subtitle', 'Configure products, company information, and website settings. Multi-tenant ready — backend will enforce org isolation.')}
        </p>
      </div>

      {/* Tabs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-nowrap overflow-x-auto gap-2 border-b border-border">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTabAndUrl(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[2px]',
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {activeTab === 'company' && <CompanyProfileSettings />}
          {activeTab === 'products' && <ProductManagement />}
          {activeTab === 'billing' && <BillingSettings />}
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
