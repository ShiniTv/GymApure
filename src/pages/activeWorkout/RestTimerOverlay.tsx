import { Button } from '../../components/ui';
import { formatWorkoutTime } from './utils';

interface RestTimerOverlayProps {
  restTimer: number;
  restDuration: number;
  onAddTime: (seconds: number) => void;
  onSkip: () => void;
}

export function RestTimerOverlay({
  restTimer,
  restDuration,
  onAddTime,
  onSkip,
}: RestTimerOverlayProps) {
  const size = 120;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = restDuration > 0 ? (restTimer / restDuration) * 100 : 0;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="animate-in slide-in-from-bottom-8 fixed right-4 bottom-4 left-4 z-50 rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl md:right-8 md:left-auto md:w-80 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto flex max-w-md flex-col items-center">
        <span className="mb-3 text-xs font-medium text-zinc-400 dark:text-zinc-300">Descanso</span>

        <div className="relative mb-4">
          <svg width={size} height={size} className="-rotate-90" aria-hidden>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-zinc-100 dark:text-zinc-800"
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
              className="text-brand transition-[stroke-dashoffset] duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-3xl font-bold text-zinc-900 tabular-nums dark:text-white">
              {formatWorkoutTime(restTimer)}
            </span>
          </div>
        </div>

        <div className="flex w-full gap-3">
          <button
            type="button"
            onClick={() => onAddTime(30)}
            className="min-h-[var(--touch-min)] flex-1 touch-manipulation rounded-2xl bg-zinc-50 py-3 text-xs font-semibold text-zinc-900 transition-all hover:bg-zinc-100 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700"
          >
            +30s
          </button>
          <Button onClick={onSkip} className="flex-[2]" size="sm">
            Saltar
          </Button>
        </div>
      </div>
    </div>
  );
}
