import { useTranslation } from 'react-i18next';
import {
  DollarSign,
  CheckCircle,
  Clock,
  TrendingUp,
  BarChart3,
  Receipt,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useDashboardData } from '@/hooks/useDashboardData';
import { formatCurrencyINR } from '@/lib/utils';

interface MiniKpi {
  tKey: string;
  fallback: string;
  field: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  isCurrency: boolean;
  suffix?: string;
}

const kpiConfig: MiniKpi[] = [
  {
    tKey: 'dashboard.totalInvoiced',
    fallback: 'Total Invoiced',
    field: 'totalInvoiced',
    icon: DollarSign,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/30',
    isCurrency: true,
  },
  {
    tKey: 'dashboard.totalCollected',
    fallback: 'Collected',
    field: 'totalCollected',
    icon: CheckCircle,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/30',
    isCurrency: true,
  },
  {
    tKey: 'dashboard.totalPendingAmount',
    fallback: 'Pending',
    field: 'totalPending',
    icon: Clock,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/30',
    isCurrency: true,
  },
  {
    tKey: 'dashboard.collectionRate',
    fallback: 'Collection Rate',
    field: 'collectionRate',
    icon: TrendingUp,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/30',
    isCurrency: false,
    suffix: '%',
  },
  {
    tKey: 'dashboard.avgOrderValue',
    fallback: 'Avg Order Value',
    field: 'avgOrderValue',
    icon: BarChart3,
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-50 dark:bg-violet-900/30',
    isCurrency: true,
  },
  {
    tKey: 'dashboard.gstCollected',
    fallback: 'GST Collected',
    field: 'gstCollected',
    icon: Receipt,
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/30',
    isCurrency: true,
  },
];

export default function FinancialOverviewWidget() {
  const { t } = useTranslation();
  const { financeKpis } = useDashboardData();

  return (
    <Card className="overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
      <CardHeader className="py-3">
        <CardTitle className="text-sm sm:text-base">
          {t('dashboard.financialOverview', 'Financial Overview')}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {kpiConfig.map(({ tKey, fallback, field, icon: Icon, color, bgColor, isCurrency, suffix }) => {
            const rawValue = (financeKpis as Record<string, number>)?.[field] ?? 0;
            const displayValue = isCurrency
              ? formatCurrencyINR(rawValue)
              : `${Number(rawValue).toLocaleString('en-IN')}${suffix ?? ''}`;

            return (
              <div
                key={field}
                className="flex items-center gap-2.5 p-2.5 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className={`p-1.5 rounded-md ${bgColor}`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground truncate">
                    {t(tKey, fallback)}
                  </p>
                  <p className="text-sm font-bold truncate">{displayValue}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
