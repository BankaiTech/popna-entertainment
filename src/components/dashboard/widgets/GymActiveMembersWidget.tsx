import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react';
import KpiCard from '../KpiCard';
import { getGymMockData } from '@/api/dashboardMockData';

const mockData = getGymMockData();

export default function GymActiveMembersWidget() {
  const { t } = useTranslation();
  return (
    <KpiCard
      title={t('dashboard.gym.activeMembers', 'Active Members')}
      value={mockData.activeMembers}
      icon={Users}
      color="text-lime-600 dark:text-lime-400"
      bgColor="bg-lime-50 dark:bg-lime-900/30"
      trend={mockData.activeMembersTrend}
    />
  );
}
