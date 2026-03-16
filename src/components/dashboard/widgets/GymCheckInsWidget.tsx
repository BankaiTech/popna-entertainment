import { useTranslation } from 'react-i18next';
import { UserCheck } from 'lucide-react';
import KpiCard from '../KpiCard';
import { getGymMockData } from '@/api/dashboardMockData';

const mockData = getGymMockData();

export default function GymCheckInsWidget() {
  const { t } = useTranslation();
  return (
    <KpiCard
      title={t('dashboard.gym.checkInsToday', 'Check-ins Today')}
      value={mockData.checkInsToday}
      icon={UserCheck}
      color="text-blue-600 dark:text-blue-400"
      bgColor="bg-blue-50 dark:bg-blue-900/30"
    />
  );
}
