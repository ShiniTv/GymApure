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
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 z-50 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-8">
      <div className="max-w-md mx-auto flex flex-col items-center">
        <span className="text-xs font-medium text-zinc-400 dark:text-zinc-300 mb-3">Descanso</span>

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
            <span className="text-3xl font-bold text-zinc-900 dark:text-white font-mono tabular-nums">
              {formatWorkoutTime(restTimer)}
            </span>
          </div>
        </div>

        <div className="flex gap-3 w-full">
          <button
            type="button"
            onClick={() => onAddTime(30)}
            className="flex-1 py-3 min-h-[var(--touch-min)] bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white rounded-2xl text-xs font-semibold transition-all touch-manipulation"
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
