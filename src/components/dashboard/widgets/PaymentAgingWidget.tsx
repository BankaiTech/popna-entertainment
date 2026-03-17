import { useTranslation } from 'react-i18next';
import { CalendarClock, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { useDashboardData } from '@/hooks/useDashboardData';
import { formatCurrencyINR } from '@/lib/utils';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';

const agingCards = [
  {
    key: 'dueThisWeek' as const,
    icon: CalendarClock,
    gradient: 'from-green-500 to-emerald-500',
    iconColor: 'text-green-600 dark:text-green-400',
    iconBg: 'bg-green-50 dark:bg-green-900/30',
  },
  {
    key: 'dueThisMonth' as const,
    icon: Clock,
    gradient: 'from-amber-500 to-yellow-500',
    iconColor: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-50 dark:bg-amber-900/30',
  },
  {
    key: 'overdue' as const,
    icon: AlertTriangle,
    gradient: 'from-red-500 to-rose-500',
    iconColor: 'text-red-600 dark:text-red-400',
    iconBg: 'bg-red-50 dark:bg-red-900/30',
  },
] as const;

const labelKeys: Record<string, { tKey: string; fallback: string }> = {
  dueThisWeek: { tKey: 'dashboard.dueThisWeek', fallback: 'Due This Week' },
  dueThisMonth: { tKey: 'dashboard.dueThisMonth', fallback: 'Due This Month' },
  overdue: { tKey: 'dashboard.overdue', fallback: 'Overdue' },
};

export default function PaymentAgingWidget() {
  const { t } = useTranslation();
  const { paymentAging } = useDashboardData();

  return (
    <div className="w-full">
      <h3 className="text-sm font-semibold text-muted-foreground mb-3">
        {t('dashboard.paymentAging', 'Payment Aging')}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {agingCards.map(({ key, icon: Icon, gradient, iconColor, iconBg }) => {
          const agingData = paymentAging?.[key];
          const count = agingData?.count ?? 0;
          const total = agingData?.total ?? 0;
          const { tKey, fallback } = labelKeys[key];

          return (
            <Card key={key} className="overflow-hidden">
              <div className={`h-1 bg-gradient-to-r ${gradient}`} />
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${iconBg}`}>
                    <Icon className={`h-5 w-5 ${iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground truncate">
                      {t(tKey, fallback)}
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold">
                        <AnimatedCounter value={count} />
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {t('dashboard.invoicesWord', 'invoices')}
                      </span>
                    </div>
                    <p className="text-sm font-semibold mt-0.5">
                      {formatCurrencyINR(total)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
