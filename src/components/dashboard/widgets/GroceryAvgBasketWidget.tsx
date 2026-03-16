import { useTranslation } from 'react-i18next';
import { ShoppingCart } from 'lucide-react';
import KpiCard from '../KpiCard';
import { getGroceryMockData } from '@/api/dashboardMockData';

const mockData = getGroceryMockData();

export default function GroceryAvgBasketWidget() {
  const { t } = useTranslation();
  return (
    <KpiCard
      title={t('dashboard.grocery.avgBasketSize', 'Avg Basket Size')}
      value={mockData.avgBasketSize}
      icon={ShoppingCart}
      color="text-blue-600 dark:text-blue-400"
      bgColor="bg-blue-50 dark:bg-blue-900/30"
      isCurrency={true}
      trend={mockData.avgBasketTrend}
    />
  );
}
