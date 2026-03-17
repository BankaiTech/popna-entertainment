import { useTranslation } from 'react-i18next';
import { DollarSign } from 'lucide-react';
import KpiCard from '../KpiCard';
import { getRestaurantMockData } from '@/api/dashboardMockData';

const mockData = getRestaurantMockData();

export default function RestaurantAvgBillWidget() {
  const { t } = useTranslation();
  return (
    <KpiCard
      title={t('dashboard.restaurant.avgBillValue', 'Avg Bill Value')}
      value={mockData.avgBillValue}
      icon={DollarSign}
      color="text-green-600 dark:text-green-400"
      bgColor="bg-green-50 dark:bg-green-900/30"
      isCurrency={true}
      trend={mockData.avgBillTrend}
    />
  );
}
