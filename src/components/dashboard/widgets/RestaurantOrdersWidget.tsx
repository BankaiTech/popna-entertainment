import { useTranslation } from 'react-i18next';
import { ShoppingCart } from 'lucide-react';
import KpiCard from '../KpiCard';
import { getRestaurantMockData } from '@/api/dashboardMockData';

const mockData = getRestaurantMockData();

export default function RestaurantOrdersWidget() {
  const { t } = useTranslation();
  return (
    <KpiCard
      title={t('dashboard.restaurant.ordersToday', 'Orders Today')}
      value={mockData.ordersToday}
      icon={ShoppingCart}
      color="text-blue-600 dark:text-blue-400"
      bgColor="bg-blue-50 dark:bg-blue-900/30"
    />
  );
}
