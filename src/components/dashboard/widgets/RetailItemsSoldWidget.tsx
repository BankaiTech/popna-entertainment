import { useTranslation } from 'react-i18next';
import { Package } from 'lucide-react';
import KpiCard from '../KpiCard';
import { getRetailMockData } from '@/api/dashboardMockData';

const mockData = getRetailMockData();

export default function RetailItemsSoldWidget() {
  const { t } = useTranslation();
  return (
    <KpiCard
      title={t('dashboard.retail.itemsSoldToday', 'Items Sold Today')}
      value={mockData.itemsSoldToday}
      icon={Package}
      color="text-blue-600 dark:text-blue-400"
      bgColor="bg-blue-50 dark:bg-blue-900/30"
    />
  );
}
