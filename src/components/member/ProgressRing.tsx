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
  size = 76,
  strokeWidth = 5,
  label,
  sublabel,
  className,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className={cn('inline-flex flex-col items-center', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-border"
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
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm font-bold text-text tabular-nums">
            {value}
            <span className="font-semibold text-text-muted"> / {max}</span>
          </p>
        </div>
      </div>
      <p className="mt-1.5 text-[11px] font-semibold text-text-secondary">{label}</p>
      {sublabel && (
        <p className="text-[10px] leading-none text-text-secondary">{sublabel}</p>
      )}
    </div>
  );
}
