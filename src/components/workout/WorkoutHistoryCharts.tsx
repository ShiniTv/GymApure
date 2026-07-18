import { format, parseISO } from 'date-fns';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { dateLocale as es } from '../../lib/dateLocale';

export interface ProgressWeekPoint {
  week_start: string;
  volume_kg: number | string;
  max_weight_kg: number | string;
}

interface WorkoutHistoryChartsProps {
  weeks: ProgressWeekPoint[];
}

export default function WorkoutHistoryCharts({ weeks }: WorkoutHistoryChartsProps) {
  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <div className="h-44">
        <p className="mb-1 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
          Volumen levantado (kg)
        </p>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weeks}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              className="text-zinc-100 dark:text-zinc-800"
            />
            <XAxis
              dataKey="week_start"
              tickFormatter={(value) => format(parseISO(value), 'dd MMM', { locale: es })}
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis tick={{ fontSize: 10 }} width={42} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(value) => [`${Number(value).toLocaleString('es-VE')} kg`, 'Volumen']}
              labelFormatter={(value) =>
                `Semana del ${format(parseISO(value), 'dd MMM', { locale: es })}`
              }
            />
            <Bar dataKey="volume_kg" fill="var(--chart-accent)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="h-44">
        <p className="mb-1 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
          Mayor peso por semana (kg)
        </p>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={weeks}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              className="text-zinc-100 dark:text-zinc-800"
            />
            <XAxis
              dataKey="week_start"
              tickFormatter={(value) => format(parseISO(value), 'dd MMM', { locale: es })}
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis tick={{ fontSize: 10 }} width={32} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(value) => [`${Number(value).toLocaleString('es-VE')} kg`, 'Mayor peso']}
              labelFormatter={(value) =>
                `Semana del ${format(parseISO(value), 'dd MMM', { locale: es })}`
              }
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Line
              type="monotone"
              dataKey="max_weight_kg"
              name="Peso"
              stroke="var(--color-brand)"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
