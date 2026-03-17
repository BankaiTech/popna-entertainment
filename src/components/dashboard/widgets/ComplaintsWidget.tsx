import { useTranslation } from 'react-i18next';
import { MessageSquare } from 'lucide-react';
import KpiCard from '../KpiCard';
import { useDashboardData } from '@/hooks/useDashboardData';

export default function ComplaintsWidget() {
  const { t } = useTranslation();
  const { activeComplaints } = useDashboardData();
  return (
    <KpiCard
      title={t('dashboard.activeComplaints', 'Active Complaints')}
      value={activeComplaints}
      icon={MessageSquare}
      color="text-purple-600 dark:text-purple-400"
      bgColor="bg-purple-50 dark:bg-purple-900/30"
      isCurrency={false}
    />
  );
}
