import { useTranslation } from 'react-i18next';
import { TrendingDown } from 'lucide-react';
import KpiCard from '../KpiCard';
import { getIspMockData } from '@/api/dashboardMockData';

const mockData = getIspMockData();

export default function IspChurnRateWidget() {
  const { t } = useTranslation();
  return (
    <KpiCard
      title={t('dashboard.isp.churnRate', 'Churn Rate')}
      value={mockData.churnRate}
      icon={TrendingDown}
      color="text-red-600 dark:text-red-400"
      bgColor="bg-red-50 dark:bg-red-900/30"
      suffix="%"
      trend={mockData.churnTrend}
    />
  );
}
