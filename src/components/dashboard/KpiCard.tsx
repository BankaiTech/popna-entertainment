import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { formatCurrencyINR } from '@/lib/utils';

export interface KpiCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  isCurrency?: boolean;
  suffix?: string;
  trend?: { value: number; isPositive: boolean };
}

export default function KpiCard({ title, value, icon: Icon, color, bgColor, isCurrency, suffix, trend }: KpiCardProps) {
  const { t } = useTranslation();
  return (
    <Card className="overflow-hidden group hover:-translate-y-0.5 transition-all duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 px-3">
        <CardTitle className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider line-clamp-2">
          {title}
        </CardTitle>
        <div className={`p-1.5 rounded-lg ${bgColor} group-hover:scale-110 transition-transform duration-300 shrink-0`}>
          <Icon className={`w-3.5 h-3.5 ${color}`} />
        </div>
      </CardHeader>
      <CardContent className="pb-2 px-3">
        <div className="text-sm sm:text-base font-bold text-foreground">
          {isCurrency ? (
            formatCurrencyINR(value)
          ) : (
            <>
              <AnimatedCounter value={value} duration={1500} />
              {suffix && <span className="text-xs ml-0.5">{suffix}</span>}
            </>
          )}
        </div>
        {trend && (
          <p className={`text-[10px] mt-0.5 font-medium ${trend.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}% {t('dashboard.vsLastMonth', 'vs last month')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
