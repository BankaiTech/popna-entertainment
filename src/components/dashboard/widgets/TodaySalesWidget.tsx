import { useTranslation } from 'react-i18next';
import { TrendingUp } from 'lucide-react';
import KpiCard from '../KpiCard';
import { useDashboardData } from '@/hooks/useDashboardData';

export default function TodaySalesWidget() {
  const { t } = useTranslation();
  const { todaySalesAmount } = useDashboardData();
  return (
    <KpiCard
      title={t('dashboard.todaySales', "Today's Sales")}
      value={todaySalesAmount}
      icon={TrendingUp}
      color="text-emerald-600 dark:text-emerald-400"
      bgColor="bg-emerald-50 dark:bg-emerald-900/30"
      isCurrency={true}
    />
  );
}
