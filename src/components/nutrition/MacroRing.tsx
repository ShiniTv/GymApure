import { cn } from '../../lib/utils';

interface MacroRingProps {
  label: string;
  consumed: number;
  target: number;
  colorClass: string;
  unit?: string;
  className?: string;
}

export function MacroRing({
  label,
  consumed,
  target,
  colorClass,
  unit = '',
  className,
}: MacroRingProps) {
  const size = 72;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = target > 0 ? Math.min(100, Math.round((consumed / target) * 100)) : 0;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className={cn('flex flex-col items-center gap-1.5', className)}>
      <div className="relative">
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-zinc-200 dark:text-zinc-800"
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
            className={cn('transition-[stroke-dashoffset] duration-500', colorClass)}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-bold text-zinc-900 tabular-nums dark:text-white">
            {pct}%
          </span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-300">{label}</p>
        <p className="text-[9px] text-zinc-500 tabular-nums">
          {Math.round(consumed)}
          {unit} / {target}
          {unit}
        </p>
      </div>
    </div>
  );
}
