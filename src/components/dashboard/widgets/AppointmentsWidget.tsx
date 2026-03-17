import { useTranslation } from 'react-i18next';
import { Calendar } from 'lucide-react';
import KpiCard from '../KpiCard';
import { useDashboardData } from '@/hooks/useDashboardData';

export default function AppointmentsWidget() {
  const { t } = useTranslation();
  const { todayAppointmentsCount } = useDashboardData();
  return (
    <KpiCard
      title={t('dashboard.todayAppointments', "Today's Appointments")}
      value={todayAppointmentsCount}
      icon={Calendar}
      color="text-pink-600 dark:text-pink-400"
      bgColor="bg-pink-50 dark:bg-pink-900/30"
      isCurrency={false}
    />
  );
}
