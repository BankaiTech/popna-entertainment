import { useTranslation } from 'react-i18next';
import { Clock } from 'lucide-react';
import KpiCard from '../KpiCard';
import { getGymMockData } from '@/api/dashboardMockData';

const mockData = getGymMockData();

export default function GymMembershipExpiringWidget() {
  const { t } = useTranslation();
  return (
    <KpiCard
      title={t('dashboard.gym.expiringMemberships', 'Expiring Memberships')}
      value={mockData.expiringMemberships}
      icon={Clock}
      color="text-amber-600 dark:text-amber-400"
      bgColor="bg-amber-50 dark:bg-amber-900/30"
    />
  );
}
