import { useTranslation } from 'react-i18next';
import { ShoppingBag } from 'lucide-react';
import KpiCard from '../KpiCard';
import { getRetailMockData } from '@/api/dashboardMockData';

const mockData = getRetailMockData();

export default function RetailAvgOrderWidget() {
  const { t } = useTranslation();
  return (
    <KpiCard
      title={t('dashboard.retail.avgOrderValue', 'Avg Order Value')}
      value={mockData.avgOrderValue}
      icon={ShoppingBag}
      color="text-purple-600 dark:text-purple-400"
      bgColor="bg-purple-50 dark:bg-purple-900/30"
      isCurrency={true}
      trend={mockData.avgOrderTrend}
    />
  );
}
