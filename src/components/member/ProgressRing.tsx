import { cn } from '../../lib/utils';

interface ProgressRingProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  label: string;
  sublabel?: string;
  className?: string;
}

export function ProgressRing({
  value,
  max,
  size = 88,
  strokeWidth = 7,
  label,
  sublabel,
  className,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className={cn('relative inline-flex flex-col items-center', className)}>
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
          className="text-brand transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg leading-none font-bold text-zinc-900 tabular-nums dark:text-white">
          {value}
        </span>
        <span className="mt-0.5 text-[9px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
          / {max}
        </span>
      </div>
      <p className="mt-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">{label}</p>
      {sublabel && <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{sublabel}</p>}
    </div>
  );
}
