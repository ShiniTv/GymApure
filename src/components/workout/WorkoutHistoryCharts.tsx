import { format, parseISO } from 'date-fns';
import {
  Bar,
  BarChart,
  CartesianGrid,
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

function hasProgressData(weeks: ProgressWeekPoint[]): boolean {
  return weeks.some((week) => Number(week.volume_kg) > 0 || Number(week.max_weight_kg) > 0);
}

function progressSummary(weeks: ProgressWeekPoint[]) {
  let totalVolume = 0;
  let peakWeight = 0;
  let activeWeeks = 0;

  for (const week of weeks) {
    const volume = Number(week.volume_kg) || 0;
    const maxWeight = Number(week.max_weight_kg) || 0;
    totalVolume += volume;
    if (maxWeight > peakWeight) peakWeight = maxWeight;
    if (volume > 0 || maxWeight > 0) activeWeeks += 1;
  }

  return { totalVolume, peakWeight, activeWeeks };
}

export default function WorkoutHistoryCharts({ weeks }: WorkoutHistoryChartsProps) {
  if (!hasProgressData(weeks)) {
    return (
      <div className="flex min-h-[9rem] items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50/60 px-4 py-6 text-center text-[11px] leading-snug text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/30 dark:text-zinc-400">
        Completa entrenamientos con series registradas para ver volumen y pesos máximos.
      </div>
    );
  }

  const { totalVolume, peakWeight, activeWeeks } = progressSummary(weeks);
  const weekLabel = activeWeeks === 1 ? '1 semana activa' : `${activeWeeks} semanas activas`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500 dark:text-zinc-400">
        <span>
          <span className="font-semibold text-zinc-700 dark:text-zinc-200">
            {totalVolume.toLocaleString('es-VE')} kg
          </span>{' '}
          volumen total
        </span>
        <span className="text-zinc-300 dark:text-zinc-600">·</span>
        <span>
          Pico{' '}
          <span className="font-semibold text-zinc-700 dark:text-zinc-200">
            {peakWeight.toLocaleString('es-VE')} kg
          </span>
        </span>
        <span className="text-zinc-300 dark:text-zinc-600">·</span>
        <span className="text-brand font-medium">{weekLabel}</span>
      </div>

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        <div className="h-36 sm:h-40">
          <p className="mb-1.5 text-[10px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            Volumen (kg)
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
        <div className="h-36 sm:h-40">
          <p className="mb-1.5 text-[10px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            Peso máximo (kg)
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
    </div>
  );
}
