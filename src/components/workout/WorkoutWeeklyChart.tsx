import { lazy, Suspense } from 'react';
import { Spinner } from '../ui';
import {
  chartAxisTick,
  chartEmptyClass,
  chartHeights,
  chartLabelClass,
} from '../../lib/chartTheme';
import { typography } from '../../lib/typography';
import { cn } from '../../lib/utils';

const LazyChart = lazy(() =>
  import('recharts').then((mod) => ({
    default: function WeeklyVolumeMiniChart({ data }: { data: { day: string; count: number }[] }) {
      const { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } = mod;
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="day"
              tick={chartAxisTick}
              stroke="currentColor"
              className="text-text-muted"
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
              }}
            />
            <Bar dataKey="count" name="Entrenos" fill="var(--color-brand)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    },
  }))
);

interface WorkoutWeeklyChartProps {
  history: { start_time: string }[];
}

function weeklyInsight(total: number): string {
  if (total === 0) return 'Sin entrenamientos en los últimos 7 días';
  if (total === 1) return '1 entreno en los últimos 7 días';
  return `${total} entrenos en los últimos 7 días`;
}

export function WorkoutWeeklyChart({ history }: WorkoutWeeklyChartProps) {
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const now = new Date();
  const data = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (6 - i));
    const key = d.toDateString();
    const count = history.filter((s) => new Date(s.start_time).toDateString() === key).length;
    return { day: days[d.getDay()] ?? '', count };
  });

  const total = data.reduce((sum, row) => sum + row.count, 0);
  const insight = weeklyInsight(total);

  if (total === 0) {
    return (
      <div>
        <p className={cn(chartLabelClass, 'mb-2')}>Últimos 7 días</p>
        <div className={cn(chartEmptyClass, chartHeights.mini, 'text-small min-h-0')}>
          {insight}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className={chartLabelClass}>Últimos 7 días</p>
        <p className={cn(typography.small, 'text-brand font-medium')}>{insight}</p>
      </div>
      <Suspense
        fallback={
          <div className={cn(chartHeights.mini, 'flex items-center justify-center')}>
            <Spinner size="sm" />
          </div>
        }
      >
        <div className={chartHeights.mini}>
          <LazyChart data={data} />
        </div>
      </Suspense>
    </div>
  );
}
