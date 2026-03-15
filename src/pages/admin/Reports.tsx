import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardHeading, CardToolbar } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { BarChart3, ShoppingCart, Package, TrendingUp, Receipt, Wallet } from 'lucide-react';
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
  const [filters, setFilters] = useState<ReportFilters>({ fromDate: '', toDate: '', branchId: '' });
  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    branchesApi.getAll().then(setBranches);
  }, []);

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="py-2.5 px-3 sm:px-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <CardHeading className="p-0 w-full md:w-auto md:min-w-0 shrink-0">
            <div className="flex items-center gap-2 w-full min-w-0">
              <Input
                type="date"
                value={filters.fromDate}
                onChange={(e) => setFilters((f) => ({ ...f, fromDate: e.target.value }))}
                className="h-9 text-sm w-full min-w-0"
                title={t('common.fromDate', 'From date')}
              />
              <span className="text-muted-foreground shrink-0 text-sm">–</span>
              <Input
                type="date"
                value={filters.toDate}
                onChange={(e) => setFilters((f) => ({ ...f, toDate: e.target.value }))}
                className="h-9 text-sm w-full min-w-0"
                title={t('common.toDate', 'To date')}
              />
            </div>
          </CardHeading>
          <CardToolbar className="flex flex-col gap-2 w-full min-w-0 sm:flex-row sm:items-center sm:gap-3 sm:w-auto">
            <Select
              value={filters.branchId}
              onChange={(e) => setFilters((f) => ({ ...f, branchId: e.target.value }))}
              className="h-9 text-sm w-full min-w-0 sm:w-44"
            >
              <option value="">{t('reports.allBranches', 'All branches')}</option>
              {branches.map((b) => (
                <option key={b.id} value={String(b.id)}>{b.name}</option>
              ))}
            </Select>
          </CardToolbar>
        </CardHeader>
        <CardContent className="p-0">
          {/* Report type tabs */}
          <div className="border-b border-border px-3">
            <nav className="flex flex-wrap gap-1 -mb-px">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap',
                      activeTab === tab.id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {t(tab.labelKey, tab.id)}
                  </button>
                );
              })}
            </nav>
          </div>
          <div className="p-3 sm:p-4">
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
