import { useEffect, useId, useRef, useState } from 'react';
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

function useAnimatedValue(target: number, durationMs = 900) {
  const [value, setValue] = useState(0);
  const valueRef = useRef(0);
  const frameRef = useRef(0);
  const mountedRef = useRef(false);

  useEffect(() => {
    const from = mountedRef.current ? valueRef.current : 0;
    mountedRef.current = true;
    const to = target;
    if (Math.abs(from - to) < 0.01) {
      valueRef.current = to;
      setValue(to);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      const next = from + (to - from) * eased;
      valueRef.current = next;
      setValue(next);
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
    };

    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, durationMs]);

  return value;
}

/** Semi-gauge with glowing fill that animates as meals are logged. */
export function CalorieSemiGauge({ consumed, target, date, className }: CalorieSemiGaugeProps) {
  const glowId = useId().replace(/:/g, '');
  const width = 280;
  const height = 148;
  const strokeWidth = 10;
  const cx = width / 2;
  const cy = height - strokeWidth / 2 - 2;
  const radius = 118;
  const arcLength = Math.PI * radius;

  const animatedConsumed = useAnimatedValue(consumed);
  const pct = target > 0 ? Math.min(1, animatedConsumed / target) : 0;
  const progressLength = Math.max(pct > 0 ? 0.5 : 0, pct * arcLength);
  const remaining = Math.max(0, Math.round(target - animatedConsumed));
  const over = animatedConsumed > target + 0.5;
  const today = formatLocalDate(new Date());
  const isToday = date === today;
  const dateObj = new Date(date + 'T12:00:00');
  const dateLabel = isToday
    ? `Hoy ${format(dateObj, 'MMM d', { locale: es })}`
    : format(dateObj, 'MMM d', { locale: es });

  const arcPath = `M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`;

  return (
    <div
      className={cn('relative mx-auto w-full max-w-[280px]', className)}
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
        <defs>
          <filter id={`cal-glow-${glowId}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id={`cal-grad-${glowId}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={over ? '#f87171' : '#fde68a'} />
            <stop offset="55%" stopColor={over ? '#ef4444' : '#fbbf24'} />
            <stop offset="100%" stopColor={over ? '#dc2626' : '#f59e0b'} />
          </linearGradient>
        </defs>

        <path
          d={arcPath}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="text-zinc-200 dark:text-zinc-800/55"
        />
        <path
          d={arcPath}
          fill="none"
          stroke={`url(#cal-grad-${glowId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${progressLength} ${arcLength}`}
          filter={pct > 0.015 ? `url(#cal-glow-${glowId})` : undefined}
          opacity={pct > 0.01 ? 1 : 0}
        />
      </svg>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center px-4 pb-1 text-center">
        <p className="text-[12px] font-medium text-zinc-500 capitalize dark:text-zinc-400">
          {dateLabel}
        </p>
        <p className="mt-1.5 text-[2rem] leading-none font-bold tracking-tight text-zinc-900 tabular-nums dark:text-white">
          {Math.round(animatedConsumed).toLocaleString('es')}
          <span className="ml-1.5 text-sm font-medium text-zinc-400">kcal</span>
        </p>
        <div className="mt-2 flex items-center gap-1.5 text-[12px]">
          <span className={cn(over ? 'text-red-500' : 'text-zinc-500 dark:text-zinc-400')}>
            {over ? 'Extra' : 'Quedan'}
          </span>
          <span
            className={cn(
              'inline-flex min-w-[3.25rem] items-center justify-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold tabular-nums',
              over
                ? 'bg-red-500/15 text-red-500'
                : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800/90 dark:text-zinc-200'
            )}
          >
            {over
              ? `+${Math.round(animatedConsumed - target).toLocaleString('es')}`
              : remaining.toLocaleString('es')}
          </span>
        </div>
      </div>
    </div>
  );
}
