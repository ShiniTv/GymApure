import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface DailyVolumePoint {
  date: string;
  count: number;
}

export function DailyVolumeChart({ data }: { data: DailyVolumePoint[] }) {
  if (data.length === 0) {
    return (
      <div className="text-text-muted flex h-full items-center justify-center text-sm">
        Sin datos
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="currentColor"
          className="text-border"
        />
        <XAxis
          dataKey="date"
          stroke="currentColor"
          className="text-text-muted"
          fontSize={10}
          fontWeight="900"
          tickLine={false}
          axisLine={false}
          tickFormatter={(str: string) => {
            const date = new Date(`${String(str)}T00:00:00`);
            return date.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase();
          }}
        />
        <YAxis
          stroke="currentColor"
          className="text-text-muted"
          fontSize={10}
          fontWeight="900"
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={{ fill: 'currentColor', opacity: 0.05 }}
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              return (
                <div className="border-border bg-surface rounded-2xl border p-4 shadow-2xl">
                  <p className="text-text-muted mb-1 text-xs font-medium">
                    {payload[0].payload.date}
                  </p>
                  <p className="text-brand text-lg font-semibold">{payload[0].value} ingresos</p>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((_, index) => (
            <Cell
              key={`cell-${index}`}
              className="fill-brand opacity-80 transition-opacity hover:opacity-100"
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

interface HourlyVolumePoint {
  hour: number;
  count: number;
}

export function HourlyVolumeChart({ data }: { data: HourlyVolumePoint[] }) {
  if (data.length === 0) {
    return (
      <div className="text-text-muted flex h-full items-center justify-center text-sm">
        Sin datos
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="currentColor"
          className="text-border"
        />
        <XAxis
          dataKey="hour"
          stroke="currentColor"
          className="text-text-muted"
          fontSize={10}
          fontWeight="900"
          tickLine={false}
          axisLine={false}
          tickFormatter={(val) => `${val}h`}
        />
        <YAxis
          stroke="currentColor"
          className="text-text-muted"
          fontSize={10}
          fontWeight="900"
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={{ fill: 'currentColor', opacity: 0.05 }}
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              return (
                <div className="border-border bg-surface rounded-2xl border p-4 shadow-2xl">
                  <p className="text-text-muted mb-1 text-xs font-medium">
                    {payload[0].payload.hour}:00
                  </p>
                  <p className="text-brand text-lg font-semibold">{payload[0].value} ingresos</p>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((_, index) => (
            <Cell
              key={`cell-h-${index}`}
              className="fill-brand opacity-80 transition-opacity hover:opacity-100"
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
