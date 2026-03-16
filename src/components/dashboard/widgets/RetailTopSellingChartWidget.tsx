import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getRetailMockData } from '@/api/dashboardMockData';
import { formatCurrencyINR } from '@/lib/utils';

const mockData = getRetailMockData();

export default function RetailTopSellingChartWidget() {
  const { t } = useTranslation();
  return (
    <Card className="overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-green-500 to-green-400" />
      <CardHeader className="py-3">
        <CardTitle className="text-sm sm:text-base">
          {t('dashboard.retail.topSellingProducts', 'Top Selling Products')}
        </CardTitle>
      </CardHeader>
      <CardContent className="py-2">
        <div className="w-full h-[180px] sm:h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mockData.topSelling} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => formatCurrencyINR(v)} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
              <Tooltip
                formatter={(v) => formatCurrencyINR(Number(v ?? 0))}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  fontSize: '12px',
                  background: 'var(--color-card)',
                  color: 'var(--color-foreground)',
                }}
              />
              <Bar dataKey="revenue" fill="#22c55e" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
