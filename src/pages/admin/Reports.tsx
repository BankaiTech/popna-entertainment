import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardHeading } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { BarChart3, FileText, ShoppingCart, Package, TrendingUp, Receipt, Wallet } from 'lucide-react';
import { branchesApi } from '@/api/branches';
import type { Branch } from '@/models/types';
import SalesReport from '@/components/reports/SalesReport';
import PurchaseReport from '@/components/reports/PurchaseReport';
import StockReport from '@/components/reports/StockReport';
import ProfitLossReport from '@/components/reports/ProfitLossReport';
import TaxReport from '@/components/reports/TaxReport';
import ExpenseReport from '@/components/reports/ExpenseReport';
import type { ReportFilters } from '@/components/reports/reportUtils';
import { cn } from '@/lib/utils';

type ReportTab = 'sales' | 'purchase' | 'stock' | 'profit-loss' | 'tax' | 'expense';

const TABS: { id: ReportTab; labelKey: string; icon: typeof BarChart3 }[] = [
  { id: 'sales', labelKey: 'reports.tabSales', icon: BarChart3 },
  { id: 'purchase', labelKey: 'reports.tabPurchase', icon: ShoppingCart },
  { id: 'stock', labelKey: 'reports.tabStock', icon: Package },
  { id: 'profit-loss', labelKey: 'reports.tabProfitLoss', icon: TrendingUp },
  { id: 'tax', labelKey: 'reports.tabTax', icon: Receipt },
  { id: 'expense', labelKey: 'reports.tabExpense', icon: Wallet },
];

export default function Reports() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ReportTab>('sales');
  const [filters, setFilters] = useState<ReportFilters>({
    fromDate: '',
    toDate: '',
    branchId: '',
  });
  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    branchesApi.getAll().then(setBranches);
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardHeading>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {t('reports.title', 'Reports')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('reports.subtitle', 'Date range and branch filters with charts and CSV export.')}
            </p>
          </CardHeading>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('common.fromDate', 'From date')}</label>
              <Input
                type="date"
                value={filters.fromDate}
                onChange={(e) => setFilters((f) => ({ ...f, fromDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('common.toDate', 'To date')}</label>
              <Input
                type="date"
                value={filters.toDate}
                onChange={(e) => setFilters((f) => ({ ...f, toDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('reports.branch', 'Branch')}</label>
              <select
                value={filters.branchId}
                onChange={(e) => setFilters((f) => ({ ...f, branchId: e.target.value }))}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm min-w-[160px]"
              >
                <option value="">{t('reports.allBranches', 'All branches')}</option>
                {branches.map((b) => (
                  <option key={b.id} value={String(b.id)}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tabs */}
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
                      'flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors',
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

          {/* Tab content */}
          <div className="pt-2">
            {activeTab === 'sales' && <SalesReport filters={filters} />}
            {activeTab === 'purchase' && <PurchaseReport filters={filters} />}
            {activeTab === 'stock' && <StockReport filters={filters} />}
            {activeTab === 'profit-loss' && <ProfitLossReport filters={filters} />}
            {activeTab === 'tax' && <TaxReport filters={filters} />}
            {activeTab === 'expense' && <ExpenseReport filters={filters} />}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
