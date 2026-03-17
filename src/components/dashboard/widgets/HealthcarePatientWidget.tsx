import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react';
import KpiCard from '../KpiCard';
import { getHealthcareMockData } from '@/api/dashboardMockData';

const mockData = getHealthcareMockData();

export default function HealthcarePatientWidget() {
  const { t } = useTranslation();
  return (
    <KpiCard
      title={t('dashboard.healthcare.patientsToday', 'Patients Today')}
      value={mockData.patientsToday}
      icon={Users}
      color="text-blue-600 dark:text-blue-400"
      bgColor="bg-blue-50 dark:bg-blue-900/30"
    />
  );
}
