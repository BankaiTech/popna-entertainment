import { useTranslation } from 'react-i18next';
import { Heart } from 'lucide-react';
import KpiCard from '../KpiCard';
import { getSalonMockData } from '@/api/dashboardMockData';

const mockData = getSalonMockData();

export default function SalonClientRetentionWidget() {
  const { t } = useTranslation();
  return (
    <KpiCard
      title={t('dashboard.salon.clientRetention', 'Client Retention')}
      value={mockData.clientRetention}
      icon={Heart}
      color="text-green-600 dark:text-green-400"
      bgColor="bg-green-50 dark:bg-green-900/30"
      suffix="%"
    />
  );
}
