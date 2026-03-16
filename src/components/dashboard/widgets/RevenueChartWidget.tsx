import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Select from '@/components/ui/Select';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useDashboardData } from '@/hooks/useDashboardData';
import { formatCurrencyINR } from '@/lib/utils';

type TimeFilter = 'this_month' | 'last_month' | 'last_6_months' | 'this_year';

export default function RevenueChartWidget() {
  const { t } = useTranslation();
  const { invoices } = useDashboardData();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('last_6_months');

  const chartData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const monthLabel = (m: number, y: number) =>
      new Date(y, m, 1).toLocaleString('en-IN', { month: 'short', year: '2-digit' });

    let months: { month: number; year: number }[] = [];

    switch (timeFilter) {
      case 'this_month':
        months = [{ month: currentMonth, year: currentYear }];
        break;
      case 'last_month': {
        const lm = currentMonth === 0 ? 11 : currentMonth - 1;
        const ly = currentMonth === 0 ? currentYear - 1 : currentYear;
        months = [{ month: lm, year: ly }];
        break;
      }
      case 'last_6_months':
        for (let i = 5; i >= 0; i--) {
          const d = new Date(currentYear, currentMonth - i, 1);
          months.push({ month: d.getMonth(), year: d.getFullYear() });
        }
        break;
      case 'this_year':
        for (let m = 0; m <= currentMonth; m++) {
          months.push({ month: m, year: currentYear });
        }
        break;
    }

    return months.map(({ month, year }) => {
      const monthInvoices = invoices.filter((inv) => {
        const d = new Date(inv.issueDate);
        return d.getMonth() === month && d.getFullYear() === year;
      });
      const collected = monthInvoices
        .filter((inv) => inv.status === 'paid')
        .reduce((sum, inv) => sum + inv.totalAmount, 0);
      const pending = monthInvoices
        .filter((inv) => inv.status !== 'paid')
        .reduce((sum, inv) => sum + inv.totalAmount, 0);
      return { name: monthLabel(month, year), collected, pending };
    });
  }, [invoices, timeFilter]);

  return (
    <Card className="overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-green-500 to-emerald-500" />
      <CardHeader className="py-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm sm:text-base">
          {t('dashboard.revenueTrend', 'Revenue Trend')}
        </CardTitle>
        <Select
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
          className="h-8 text-xs w-auto"
        >
          <option value="this_month">{t('dashboard.thisMonth', 'This Month')}</option>
          <option value="last_month">{t('dashboard.lastMonth', 'Last Month')}</option>
          <option value="last_6_months">{t('dashboard.last6Months', 'Last 6 Months')}</option>
          <option value="this_year">{t('dashboard.thisYear', 'This Year')}</option>
        </Select>
      </CardHeader>
      <CardContent className="py-2">
        <div className="w-full h-[180px] sm:h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="gradCollected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradPending" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="name"
                fontSize={11}
                tickLine={false}
                className="fill-muted-foreground"
              />
              <YAxis
                fontSize={11}
                tickLine={false}
                tickFormatter={(v) => formatCurrencyINR(v)}
                className="fill-muted-foreground"
              />
              <Tooltip
                formatter={(v) => formatCurrencyINR(Number(v ?? 0))}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  fontSize: '13px',
                  background: 'var(--color-card)',
                  color: 'var(--color-foreground)',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Area
                type="monotone"
                dataKey="collected"
                name={t('dashboard.collected', 'Collected')}
                stroke="#22c55e"
                strokeWidth={2}
                fill="url(#gradCollected)"
              />
              <Area
                type="monotone"
                dataKey="pending"
                name={t('dashboard.pending', 'Pending')}
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#gradPending)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
