import { useTranslation } from 'react-i18next';
import { FileText } from 'lucide-react';
import KpiCard from '../KpiCard';
import { getHealthcareMockData } from '@/api/dashboardMockData';

const mockData = getHealthcareMockData();

export default function HealthcarePrescriptionsWidget() {
  const { t } = useTranslation();
  return (
    <KpiCard
      title={t('dashboard.healthcare.prescriptionsFilled', 'Prescriptions Filled')}
      value={mockData.prescriptionsFilled}
      icon={FileText}
      color="text-green-600 dark:text-green-400"
      bgColor="bg-green-50 dark:bg-green-900/30"
    />
  );
}
