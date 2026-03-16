import { useTranslation } from 'react-i18next';
import { DollarSign } from 'lucide-react';
import KpiCard from '../KpiCard';
import { useDashboardData } from '@/hooks/useDashboardData';

export default function RevenueWidget() {
  const { t } = useTranslation();
  const { totalRevenue } = useDashboardData();
  return (
    <KpiCard
      title={t('dashboard.totalRevenue', 'Total Revenue')}
      value={totalRevenue}
      icon={DollarSign}
      color="text-green-600 dark:text-green-400"
      bgColor="bg-green-50 dark:bg-green-900/30"
      isCurrency
    />
  );
}
