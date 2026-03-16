import { useTranslation } from 'react-i18next';
import { Zap } from 'lucide-react';
import KpiCard from '../KpiCard';
import { getGroceryMockData } from '@/api/dashboardMockData';

const mockData = getGroceryMockData();

export default function GroceryFastMovingWidget() {
  const { t } = useTranslation();
  return (
    <KpiCard
      title={t('dashboard.grocery.fastMovingItems', 'Fast Moving Items')}
      value={mockData.fastMovingItems}
      icon={Zap}
      color="text-emerald-600 dark:text-emerald-400"
      bgColor="bg-emerald-50 dark:bg-emerald-900/30"
    />
  );
}
