import { useTranslation } from 'react-i18next';
import { IndianRupee } from 'lucide-react';
import KpiCard from '../KpiCard';
import { getIspMockData } from '@/api/dashboardMockData';

const mockData = getIspMockData();

export default function IspMrrWidget() {
  const { t } = useTranslation();
  return (
    <KpiCard
      title={t('dashboard.isp.mrr', 'Monthly Recurring Revenue')}
      value={mockData.mrr}
      icon={IndianRupee}
      color="text-blue-600 dark:text-blue-400"
      bgColor="bg-blue-50 dark:bg-blue-900/30"
      isCurrency={true}
      trend={mockData.mrrTrend}
    />
  );
}
