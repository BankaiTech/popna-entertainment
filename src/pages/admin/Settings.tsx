// Organization-based settings tab access
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Package, Building2 } from 'lucide-react';
import ProductManagement from '@/components/settings/ProductManagement';
import CompanyProfileSettings from '@/components/settings/CompanyProfileSettings';
import { cn } from '@/lib/utils';
import { useOrganizationStore } from '@/store/useOrganizationStore';
import type { SettingsTabKey } from '@/models/types';

type SettingsTab = SettingsTabKey;

const Settings = () => {
  const { t } = useTranslation();
  const { isSettingsTabAllowed } = useOrganizationStore();

  // All possible tabs
  const allTabs: { id: SettingsTab; label: string; icon: typeof Building2; description: string }[] = [
    { id: 'company', label: t('settings.tabCompany', 'Company Details'), icon: Building2, description: t('settings.companyDesc', 'Configure company information for invoices and documents') },
    { id: 'products', label: t('settings.tabProducts', 'Products'), icon: Package, description: t('settings.productsDesc', 'Manage products, plans, and pricing') },
  ];

  // Filter by organization allowed settings tabs
  const tabs = useMemo(
    () => allTabs.filter((tab) => isSettingsTabAllowed(tab.id)),
    [isSettingsTabAllowed, t]
  );

  // Display order: 1 Company Details, 2 Products (filtered by org access)
  const [activeTab, setActiveTab] = useState<SettingsTab>(tabs.length > 0 ? tabs[0].id : 'company');

  // Update active tab when tabs change
  useEffect(() => {
    if (tabs.length > 0 && !tabs.find((tab) => tab.id === activeTab)) {
      setActiveTab(tabs[0].id);
    }
  }, [tabs, activeTab]);

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
          <div className="flex flex-wrap gap-2 border-b border-border">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
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
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
