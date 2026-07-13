import { lazy, Suspense } from 'react';
import { Spinner } from '../ui';

const LazyChart = lazy(() =>
  import('recharts').then((mod) => ({
    default: function WeeklyVolumeMiniChart({ data }: { data: { day: string; count: number }[] }) {
      const { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } = mod;
      return (
        <ResponsiveContainer width="100%" height={120}>
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

  return (
    <Suspense
      fallback={
        <div className="flex h-[120px] items-center justify-center">
          <Spinner size="sm" />
        </div>
      }
    >
      <LazyChart data={data} />
    </Suspense>
  );
}
