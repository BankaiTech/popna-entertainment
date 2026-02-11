import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Package, Building2, Globe } from 'lucide-react';
import ProductManagement from '@/components/settings/ProductManagement';
import CompanyProfileSettings from '@/components/settings/CompanyProfileSettings';
import WebsiteSettings from '@/components/settings/WebsiteSettings';
import { cn } from '@/lib/utils';

type SettingsTab = 'products' | 'company' | 'website';

const Settings = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('products');

  const tabs = [
    { id: 'products' as SettingsTab, label: 'Products', icon: Package },
    { id: 'company' as SettingsTab, label: 'Company Profile', icon: Building2 },
    { id: 'website' as SettingsTab, label: 'Website Settings', icon: Globe },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Settings</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Configure products, company information, and website settings. Multi-tenant ready — backend will enforce org isolation.
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
          {activeTab === 'products' && <ProductManagement />}
          {activeTab === 'company' && <CompanyProfileSettings />}
          {activeTab === 'website' && <WebsiteSettings />}
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
