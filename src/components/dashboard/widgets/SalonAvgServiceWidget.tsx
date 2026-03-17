import { useTranslation } from 'react-i18next';
import { DollarSign } from 'lucide-react';
import KpiCard from '../KpiCard';
import { getSalonMockData } from '@/api/dashboardMockData';

const mockData = getSalonMockData();

export default function SalonAvgServiceWidget() {
  const { t } = useTranslation();
  return (
    <KpiCard
      title={t('dashboard.salon.avgServiceValue', 'Avg Service Value')}
      value={mockData.avgServiceValue}
      icon={DollarSign}
      color="text-pink-600 dark:text-pink-400"
      bgColor="bg-pink-50 dark:bg-pink-900/30"
      isCurrency={true}
      trend={mockData.avgServiceTrend}
    />
  );
}
