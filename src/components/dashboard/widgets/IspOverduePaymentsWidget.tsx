import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import KpiCard from '../KpiCard';
import { getIspMockData } from '@/api/dashboardMockData';

const mockData = getIspMockData();

export default function IspOverduePaymentsWidget() {
  const { t } = useTranslation();
  return (
    <KpiCard
      title={t('dashboard.isp.overduePayments', 'Overdue Payments')}
      value={mockData.overduePayments}
      icon={AlertTriangle}
      color="text-red-600 dark:text-red-400"
      bgColor="bg-red-50 dark:bg-red-900/30"
      isCurrency={true}
    />
  );
}
