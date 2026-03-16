import { useTranslation } from 'react-i18next';
import { Wrench } from 'lucide-react';
import KpiCard from '../KpiCard';
import { getElectronicsMockData } from '@/api/dashboardMockData';

const mockData = getElectronicsMockData();

export default function ElectronicsRepairJobsWidget() {
  const { t } = useTranslation();
  return (
    <KpiCard
      title={t('dashboard.electronics.repairJobsPending', 'Repair Jobs Pending')}
      value={mockData.repairJobs}
      icon={Wrench}
      color="text-amber-600 dark:text-amber-400"
      bgColor="bg-amber-50 dark:bg-amber-900/30"
    />
  );
}
