import { useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface MacroRingProps {
  label: string;
  consumed: number;
  target: number;
  colorClass: string;
  trackClass?: string;
  className?: string;
  icon?: LucideIcon;
  size?: number;
}

function useAnimatedPct(targetPct: number, durationMs = 900) {
  const [pct, setPct] = useState(0);
  const pctRef = useRef(0);
  const frameRef = useRef(0);
  const mountedRef = useRef(false);

  useEffect(() => {
    const from = mountedRef.current ? pctRef.current : 0;
    mountedRef.current = true;
    const to = targetPct;
    if (Math.abs(from - to) < 0.1) {
      pctRef.current = to;
      setPct(to);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      const next = from + (to - from) * eased;
      pctRef.current = next;
      setPct(next);
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
    };

    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [targetPct, durationMs]);

  return pct;
}

/** Macro ring that animates when meals update — stroke uses token color classes. */
export function MacroRing({
  label,
  consumed,
  target,
  colorClass,
  trackClass = 'text-border',
  className,
  icon: Icon,
  size = 72,
}: MacroRingProps) {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const targetPct = target > 0 ? Math.min(100, (consumed / target) * 100) : 0;
  const pct = useAnimatedPct(targetPct);
  const offset = circumference - (pct / 100) * circumference;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div className={cn('flex flex-col items-center gap-1.5', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="pointer-events-none absolute inset-0 -rotate-90"
          aria-hidden
        >
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className={trackClass}
          />
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={colorClass}
            opacity={pct > 0.4 ? 1 : Math.max(0, pct / 0.4)}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-text text-sm font-semibold tabular-nums">{Math.round(pct)}</span>
        </div>
      </div>
      <div className="flex flex-col items-center gap-0.5 text-center">
        <div className="flex items-center gap-1">
          {Icon && <Icon className={cn('h-3 w-3', colorClass)} aria-hidden strokeWidth={2} />}
          <p className="text-small text-text-muted font-medium">{label}</p>
        </div>
        <p className="text-small text-text-muted tabular-nums">{Math.round(target)}g</p>
      </div>
    </div>
  );
}
