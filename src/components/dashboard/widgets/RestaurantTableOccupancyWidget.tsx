import { useTranslation } from 'react-i18next';
import { LayoutGrid } from 'lucide-react';
import KpiCard from '../KpiCard';
import { getRestaurantMockData } from '@/api/dashboardMockData';

const mockData = getRestaurantMockData();

export default function RestaurantTableOccupancyWidget() {
  const { t } = useTranslation();
  return (
    <KpiCard
      title={t('dashboard.restaurant.tableOccupancy', 'Table Occupancy')}
      value={mockData.tableOccupancy}
      icon={LayoutGrid}
      color="text-amber-600 dark:text-amber-400"
      bgColor="bg-amber-50 dark:bg-amber-900/30"
      suffix="%"
    />
  );
}
