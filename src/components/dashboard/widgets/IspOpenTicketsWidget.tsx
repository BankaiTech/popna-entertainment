import { useTranslation } from 'react-i18next';
import { MessageSquare } from 'lucide-react';
import KpiCard from '../KpiCard';
import { getIspMockData } from '@/api/dashboardMockData';

const mockData = getIspMockData();

export default function IspOpenTicketsWidget() {
  const { t } = useTranslation();
  return (
    <KpiCard
      title={t('dashboard.isp.openTickets', 'Open Tickets')}
      value={mockData.openTickets}
      icon={MessageSquare}
      color="text-orange-600 dark:text-orange-400"
      bgColor="bg-orange-50 dark:bg-orange-900/30"
    />
  );
}
