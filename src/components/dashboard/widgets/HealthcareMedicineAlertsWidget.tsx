import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import KpiCard from '../KpiCard';
import { getHealthcareMockData } from '@/api/dashboardMockData';

const mockData = getHealthcareMockData();

export default function HealthcareMedicineAlertsWidget() {
  const { t } = useTranslation();
  return (
    <KpiCard
      title={t('dashboard.healthcare.medicineAlerts', 'Medicine Alerts')}
      value={mockData.medicineAlerts}
      icon={AlertTriangle}
      color="text-amber-600 dark:text-amber-400"
      bgColor="bg-amber-50 dark:bg-amber-900/30"
    />
  );
}
