import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react';
import KpiCard from '../KpiCard';
import { useDashboardData } from '@/hooks/useDashboardData';

export default function ContactsWidget() {
  const { t } = useTranslation();
  const { totalCustomers } = useDashboardData();
  return (
    <KpiCard
      title={t('dashboard.totalContacts', 'Total Contacts')}
      value={totalCustomers}
      icon={Users}
      color="text-blue-600 dark:text-blue-400"
      bgColor="bg-blue-50 dark:bg-blue-900/30"
      isCurrency={false}
    />
  );
}
