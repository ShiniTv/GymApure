import { format } from 'date-fns';
import { dateLocale as es } from '../../lib/dateLocale';
import { formatLocalDate } from '../../lib/nutrition';
import { cn } from '../../lib/utils';

interface CalorieSemiGaugeProps {
  consumed: number;
  target: number;
  date: string;
  className?: string;
}

/** Large semi-circular calorie gauge inspired by nutrition app reference. */
export function CalorieSemiGauge({ consumed, target, date, className }: CalorieSemiGaugeProps) {
  const width = 300;
  const height = 168;
  const strokeWidth = 18;
  const cx = width / 2;
  const cy = height - 6;
  const radius = 128;
  const arcLength = Math.PI * radius;
  const pct = target > 0 ? Math.min(1, consumed / target) : 0;
  const progressLength = pct * arcLength;
  const remaining = Math.max(0, Math.round(target - consumed));
  const over = consumed > target;
  const today = formatLocalDate(new Date());
  const isToday = date === today;
  const dateLabel = format(new Date(date + 'T12:00:00'), 'd MMM', { locale: es });

  return (
    <div
      className={cn('relative mx-auto flex w-full max-w-[300px] flex-col items-center', className)}
      role="img"
      aria-label={`Calorías: ${Math.round(consumed)} de ${target}`}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        aria-hidden
      >
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="text-zinc-200 dark:text-zinc-800"
        />
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${progressLength} ${arcLength}`}
          className={cn(
            'transition-[stroke-dasharray] duration-700 ease-out',
            over ? 'text-red-500' : 'text-amber-400 dark:text-amber-300'
          )}
        />
      </svg>

      <div className="pointer-events-none absolute inset-x-0 top-[28%] flex flex-col items-center px-4 text-center">
        <p className="text-[11px] font-medium tracking-wide text-zinc-500 capitalize dark:text-zinc-400">
          {isToday ? `Hoy ${dateLabel}` : dateLabel}
        </p>
        <p className="mt-1 text-[2.15rem] leading-none font-bold tracking-tight text-zinc-900 tabular-nums sm:text-4xl dark:text-white">
          {Math.round(consumed).toLocaleString('es')}
          <span className="ml-1.5 text-base font-semibold text-zinc-400 sm:text-lg">kcal</span>
        </p>
        <span
          className={cn(
            'mt-3 inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold tabular-nums',
            over
              ? 'bg-red-500/15 text-red-600 dark:text-red-400'
              : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-300'
          )}
        >
          {over
            ? `+${Math.round(consumed - target).toLocaleString('es')} kcal`
            : `Quedan ${remaining.toLocaleString('es')} kcal`}
        </span>
      </div>
    </div>
  );
}
