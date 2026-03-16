import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getHealthcareMockData } from '@/api/dashboardMockData';

const mockData = getHealthcareMockData();

export default function HealthcareAppointmentScheduleChartWidget() {
  const { t } = useTranslation();
  return (
    <Card className="overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-red-500 to-red-400" />
      <CardHeader className="py-3">
        <CardTitle className="text-sm sm:text-base">
          {t('dashboard.healthcare.appointmentSchedule', 'Appointment Schedule')}
        </CardTitle>
      </CardHeader>
      <CardContent className="py-2">
        <div className="w-full h-[180px] sm:h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mockData.appointmentSchedule}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  fontSize: '12px',
                  background: 'var(--color-card)',
                  color: 'var(--color-foreground)',
                }}
              />
              <Bar dataKey="appointments" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
