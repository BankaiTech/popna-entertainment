import { Suspense } from 'react';
import type { DashboardWidgetKey } from '@/config/industryTemplates';
import { WIDGET_REGISTRY } from '@/config/dashboardRegistry';

function WidgetSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl animate-pulse">
      <div className="p-4 space-y-3">
        <div className="h-3 bg-muted rounded w-2/3" />
        <div className="h-6 bg-muted rounded w-1/3" />
      </div>
    </div>
  );
}

export default function WidgetRenderer({ widgetKey }: { widgetKey: DashboardWidgetKey }) {
  const entry = WIDGET_REGISTRY[widgetKey];
  if (!entry) return null;
  const Component = entry.component;
  return (
    <Suspense fallback={<WidgetSkeleton />}>
      <Component />
    </Suspense>
  );
}
