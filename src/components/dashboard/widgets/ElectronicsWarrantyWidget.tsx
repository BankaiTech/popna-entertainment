import { useTranslation } from 'react-i18next';
import { Shield } from 'lucide-react';
import KpiCard from '../KpiCard';
import { getElectronicsMockData } from '@/api/dashboardMockData';

const mockData = getElectronicsMockData();

export default function ElectronicsWarrantyWidget() {
  const { t } = useTranslation();
  return (
    <KpiCard
      title={t('dashboard.electronics.warrantyClaims', 'Warranty Claims')}
      value={mockData.warrantyClaims}
      icon={Shield}
      color="text-red-600 dark:text-red-400"
      bgColor="bg-red-50 dark:bg-red-900/30"
    />
  );
}
