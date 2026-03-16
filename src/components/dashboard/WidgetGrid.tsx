import type { DashboardWidgetKey } from '@/config/industryTemplates';
import { WIDGET_REGISTRY } from '@/config/dashboardRegistry';
import WidgetRenderer from './WidgetRenderer';
import { cn } from '@/lib/utils';

interface WidgetGridProps {
  widgets: DashboardWidgetKey[];
  layout: 'kpi' | 'chart' | 'full';
  className?: string;
}

export default function WidgetGrid({ widgets, layout, className }: WidgetGridProps) {
  if (widgets.length === 0) return null;

  const gridClass =
    layout === 'kpi'
      ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
      : layout === 'chart'
        ? 'grid-cols-1 lg:grid-cols-2'
        : 'grid-cols-1';

  return (
    <div className={cn('grid gap-2 sm:gap-3', gridClass, className)}>
      {widgets.map((key) => (
        <WidgetRenderer key={key} widgetKey={key} />
      ))}
    </div>
  );
}

/** Categorize widget keys by their layout type */
export function categorizeWidgets(widgets: DashboardWidgetKey[]) {
  const kpi: DashboardWidgetKey[] = [];
  const chart: DashboardWidgetKey[] = [];
  const full: DashboardWidgetKey[] = [];

  for (const w of widgets) {
    const entry = WIDGET_REGISTRY[w];
    if (!entry) continue;
    switch (entry.layout) {
      case 'kpi':
        kpi.push(w);
        break;
      case 'chart':
        chart.push(w);
        break;
      case 'table':
      case 'section':
        full.push(w);
        break;
    }
  }
  return { kpi, chart, full };
}
