import { useTranslation } from 'react-i18next';
import { Clock } from 'lucide-react';
import KpiCard from '../KpiCard';
import { useDashboardData } from '@/hooks/useDashboardData';

export default function ExpiringSoonWidget() {
  const { t } = useTranslation();
  const { expiringSoonCount } = useDashboardData();
  return (
    <KpiCard
      title={t('dashboard.expiringSoon', 'Expiring Soon')}
      value={expiringSoonCount}
      icon={Clock}
      color="text-amber-600 dark:text-amber-400"
      bgColor="bg-amber-50 dark:bg-amber-900/30"
      isCurrency={false}
    />
  );
}
