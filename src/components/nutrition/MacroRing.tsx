import { useEffect, useId, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface MacroRingProps {
  label: string;
  consumed: number;
  target: number;
  colorClass: string;
  glowColor?: string;
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

/** Macro ring with glow fill that animates when meals update. */
export function MacroRing({
  label,
  consumed,
  target,
  colorClass,
  glowColor = '#fbbf24',
  trackClass = 'text-zinc-200 dark:text-zinc-800/50',
  className,
  icon: Icon,
  size = 72,
}: MacroRingProps) {
  const glowId = useId().replace(/:/g, '');
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const targetPct = target > 0 ? Math.min(100, (consumed / target) * 100) : 0;
  const pct = useAnimatedPct(targetPct);
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className={cn('flex flex-col items-center gap-1.5', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <defs>
            <filter id={`macro-glow-${glowId}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className={trackClass}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={glowColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            filter={pct > 1 ? `url(#macro-glow-${glowId})` : undefined}
            opacity={pct > 0.4 ? 1 : Math.max(0, pct / 0.4)}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-semibold text-zinc-900 tabular-nums dark:text-white">
            {Math.round(pct)}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-center gap-0.5 text-center">
        <div className="flex items-center gap-1">
          {Icon && <Icon className={cn('h-3 w-3', colorClass)} aria-hidden strokeWidth={2} />}
          <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
        </div>
        <p className="text-[10px] text-zinc-400 tabular-nums dark:text-zinc-500">
          {Math.round(target)}g
        </p>
      </div>
    </div>
  );
}
