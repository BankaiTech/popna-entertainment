import { useTranslation } from 'react-i18next';
import { UserPlus } from 'lucide-react';
import KpiCard from '../KpiCard';
import { getIspMockData } from '@/api/dashboardMockData';

const mockData = getIspMockData();

export default function IspConnectionRequestsWidget() {
  const { t } = useTranslation();
  return (
    <KpiCard
      title={t('dashboard.isp.connectionRequests', 'Connection Requests')}
      value={mockData.connectionRequests.pending}
      icon={UserPlus}
      color="text-indigo-600 dark:text-indigo-400"
      bgColor="bg-indigo-50 dark:bg-indigo-900/30"
    />
  );
}
