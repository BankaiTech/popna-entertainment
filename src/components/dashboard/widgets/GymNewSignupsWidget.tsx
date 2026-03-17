import { useTranslation } from 'react-i18next';
import { UserPlus } from 'lucide-react';
import KpiCard from '../KpiCard';
import { getGymMockData } from '@/api/dashboardMockData';

const mockData = getGymMockData();

export default function GymNewSignupsWidget() {
  const { t } = useTranslation();
  return (
    <KpiCard
      title={t('dashboard.gym.newSignups', 'New Signups This Month')}
      value={mockData.newSignups}
      icon={UserPlus}
      color="text-green-600 dark:text-green-400"
      bgColor="bg-green-50 dark:bg-green-900/30"
      trend={mockData.newSignupsTrend}
    />
  );
}
