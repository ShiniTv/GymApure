import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface MacroRingProps {
  label: string;
  consumed: number;
  target: number;
  colorClass: string;
  trackClass?: string;
  unit?: string;
  className?: string;
  icon?: LucideIcon;
  size?: number;
}

/** Full ring showing percent in center; target grams below (reference-style). */
export function MacroRing({
  label,
  consumed,
  target,
  colorClass,
  trackClass = 'text-zinc-200 dark:text-zinc-800',
  unit = 'g',
  className,
  icon: Icon,
  size = 92,
}: MacroRingProps) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = target > 0 ? Math.min(100, Math.round((consumed / target) * 100)) : 0;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
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
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={cn('transition-[stroke-dashoffset] duration-700 ease-out', colorClass)}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-zinc-900 tabular-nums dark:text-white">
            {pct}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-center gap-0.5 text-center">
        {Icon && (
          <Icon className={cn('mb-0.5 h-4 w-4', colorClass)} aria-hidden strokeWidth={2.25} />
        )}
        <p className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-200">{label}</p>
        <p className="text-[11px] font-medium text-zinc-400 tabular-nums">
          {target}
          {unit}
        </p>
      </div>
    </div>
  );
}
