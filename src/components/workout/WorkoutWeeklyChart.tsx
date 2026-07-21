import { lazy, Suspense } from 'react';
import { Spinner } from '../ui';

const LazyChart = lazy(() =>
  import('recharts').then((mod) => ({
    default: function WeeklyVolumeMiniChart({ data }: { data: { day: string; count: number }[] }) {
      const { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } = mod;
      return (
        <ResponsiveContainer width="100%" height={104}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="#a1a1aa" />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
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
        <p className="mb-2 text-[10px] font-semibold tracking-wide text-zinc-400 uppercase">
          Últimos 7 días
        </p>
        <div className="flex h-[6.5rem] items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50/60 px-3 text-center text-[11px] leading-snug text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/30 dark:text-zinc-400">
          {insight}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-[10px] font-semibold tracking-wide text-zinc-400 uppercase">
          Últimos 7 días
        </p>
        <p className="text-brand text-[11px] font-medium">{insight}</p>
      </div>
      <Suspense
        fallback={
          <div className="flex h-[6.5rem] items-center justify-center">
            <Spinner size="sm" />
          </div>
        }
      >
        <LazyChart data={data} />
      </Suspense>
    </div>
  );
}
