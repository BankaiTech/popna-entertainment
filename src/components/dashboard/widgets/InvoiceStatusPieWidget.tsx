import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useDashboardData } from '@/hooks/useDashboardData';
import { formatCurrencyINR } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  paid: '#22c55e',
  sent: '#3b82f6',
  draft: '#9ca3af',
  overdue: '#ef4444',
};

export default function InvoiceStatusPieWidget() {
  const { t } = useTranslation();
  const { invoiceStatusData } = useDashboardData();

  const data = invoiceStatusData.map((item) => ({
    name: t(`dashboard.invoiceStatus.${item.name}`, item.name),
    value: item.value,
    status: item.name,
  }));

  return (
    <Card className="overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
      <CardHeader className="py-3">
        <CardTitle className="text-sm sm:text-base">
          {t('dashboard.invoiceStatus', 'Invoice Status')}
        </CardTitle>
      </CardHeader>
      <CardContent className="py-2">
        <div className="w-full h-[180px] sm:h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="45%"
                innerRadius="40%"
                outerRadius="70%"
                paddingAngle={3}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={STATUS_COLORS[entry.status] ?? '#6b7280'}
                  />
                ))}
              </Pie>
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
              <Legend
                verticalAlign="bottom"
                wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
