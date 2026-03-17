import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import KpiCard from '../KpiCard';
import { useDashboardData } from '@/hooks/useDashboardData';

export default function LowStockWidget() {
  const { t } = useTranslation();
  const { lowStockTotal } = useDashboardData();
  const isAlert = lowStockTotal > 0;
  return (
    <KpiCard
      title={t('dashboard.lowStock', 'Low Stock')}
      value={lowStockTotal}
      icon={AlertTriangle}
      color={isAlert ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}
      bgColor={isAlert ? 'bg-red-50 dark:bg-red-900/30' : 'bg-green-50 dark:bg-green-900/30'}
      isCurrency={false}
    />
  );
}
