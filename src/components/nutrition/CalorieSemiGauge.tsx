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

/** Semi-gauge that animates as meals are logged — brand/danger tokens, no glow blur. */
export function CalorieSemiGauge({ consumed, target, date, className }: CalorieSemiGaugeProps) {
  const gradId = useId().replace(/:/g, '');
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
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" aria-hidden>
        <defs>
          <linearGradient id={`cal-grad-${gradId}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop
              offset="0%"
              stopColor={over ? 'var(--color-danger)' : 'var(--color-warning)'}
              stopOpacity={over ? 1 : 0.65}
            />
            <stop offset="55%" stopColor={over ? 'var(--color-danger)' : 'var(--color-warning)'} />
            <stop offset="100%" stopColor={over ? 'var(--color-danger)' : 'var(--color-brand)'} />
          </linearGradient>
        </defs>

        <path
          d={arcPath}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="text-border"
        />
        <path
          d={arcPath}
          fill="none"
          stroke={`url(#cal-grad-${gradId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${progressLength} ${arcLength}`}
          opacity={pct > 0.01 ? 1 : 0}
        />
      </svg>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center px-4 pb-1 text-center">
        <p className="text-small text-text-muted font-medium capitalize">{dateLabel}</p>
        <p className="text-text mt-1.5 text-xl leading-none font-semibold tracking-tight tabular-nums">
          {Math.round(animatedConsumed).toLocaleString('es')}
          <span className="text-text-muted ml-1.5 text-sm font-medium">kcal</span>
        </p>
        <div className="text-small mt-2 flex items-center gap-1.5">
          <span className={cn(over ? 'text-danger' : 'text-text-muted')}>
            {over ? 'Extra' : 'Quedan'}
          </span>
          <span
            className={cn(
              'inline-flex min-w-[3.25rem] items-center justify-center rounded-full px-2.5 py-0.5 font-semibold tabular-nums',
              over ? 'bg-danger/15 text-danger' : 'bg-surface-raised text-text-secondary'
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
