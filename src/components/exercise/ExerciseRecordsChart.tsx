import { format, parseISO } from 'date-fns';
import {
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

export interface ExerciseTimelinePoint {
  date: string;
  max_weight_kg: number;
  estimated_1rm_kg?: number | null;
}

interface ExerciseRecordsChartProps {
  timeline: ExerciseTimelinePoint[];
}

export default function ExerciseRecordsChart({ timeline }: ExerciseRecordsChartProps) {
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={timeline}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            className="text-zinc-100 dark:text-zinc-800"
          />
          <XAxis
            dataKey="date"
            tickFormatter={(value) => format(parseISO(value), 'dd MMM', { locale: es })}
            tick={{ fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis tick={{ fontSize: 10 }} width={36} axisLine={false} tickLine={false} />
          <Tooltip
            formatter={(value, name) => [
              `${Number(value).toLocaleString('es-VE')} kg`,
              name === 'max_weight_kg' ? 'Peso máx.' : '1RM est.',
            ]}
            labelFormatter={(value) =>
              format(parseISO(String(value)), 'dd MMM yyyy', { locale: es })
            }
          />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Line
            type="monotone"
            dataKey="max_weight_kg"
            name="Peso máx."
            stroke="var(--color-brand)"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="estimated_1rm_kg"
            name="1RM est."
            stroke="var(--chart-accent)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
