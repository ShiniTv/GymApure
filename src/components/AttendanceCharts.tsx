import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DailyVolumePoint {
  date: string;
  count: number;
}

export function DailyVolumeChart({ data }: { data: DailyVolumePoint[] }) {
  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-400 font-bold uppercase tracking-widest text-xs">
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
          className="text-zinc-100 dark:text-zinc-800"
        />
        <XAxis
          dataKey="date"
          stroke="currentColor"
          className="text-zinc-400"
          fontSize={10}
          fontWeight="900"
          tickLine={false}
          axisLine={false}
          tickFormatter={(str) => {
            const date = new Date(str + 'T00:00:00');
            return date.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase();
          }}
        />
        <YAxis
          stroke="currentColor"
          className="text-zinc-400"
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
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-2xl">
                  <p className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                    {payload[0].payload.date}
                  </p>
                  <p className="text-lg font-black text-orange-500 italic tracking-tighter uppercase">
                    {payload[0].value} Ingresos
                  </p>
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
              className="fill-orange-500 opacity-80 hover:opacity-100 transition-opacity"
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
      <div className="h-full flex items-center justify-center text-zinc-400 font-bold uppercase tracking-widest text-xs">
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
          className="text-zinc-100 dark:text-zinc-800"
        />
        <XAxis
          dataKey="hour"
          stroke="currentColor"
          className="text-zinc-400"
          fontSize={10}
          fontWeight="900"
          tickLine={false}
          axisLine={false}
          tickFormatter={(val) => `${val}h`}
        />
        <YAxis
          stroke="currentColor"
          className="text-zinc-400"
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
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-2xl">
                  <p className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                    {payload[0].payload.hour}:00 HS
                  </p>
                  <p className="text-lg font-black text-blue-500 italic tracking-tighter uppercase">
                    {payload[0].value} Ingresos
                  </p>
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
              className="fill-blue-500 opacity-80 hover:opacity-100 transition-opacity"
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
