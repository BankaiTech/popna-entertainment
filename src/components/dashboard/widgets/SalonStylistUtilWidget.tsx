import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react';
import KpiCard from '../KpiCard';
import { getSalonMockData } from '@/api/dashboardMockData';

const mockData = getSalonMockData();

export default function SalonStylistUtilWidget() {
  const { t } = useTranslation();
  return (
    <KpiCard
      title={t('dashboard.salon.stylistUtilization', 'Stylist Utilization')}
      value={mockData.stylistUtilization}
      icon={Users}
      color="text-purple-600 dark:text-purple-400"
      bgColor="bg-purple-50 dark:bg-purple-900/30"
      suffix="%"
    />
  );
}
