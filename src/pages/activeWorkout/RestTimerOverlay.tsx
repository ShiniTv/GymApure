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
  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 z-50 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-8">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium text-zinc-400">Descanso</span>
          <span className="text-3xl font-bold text-zinc-900 dark:text-white font-mono tabular-nums">
            {formatWorkoutTime(restTimer)}
          </span>
        </div>

        <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-3 mb-6 overflow-hidden">
          <div
            className="bg-orange-500 h-full rounded-full transition-all duration-1000 ease-linear shadow-[0_0_12px_rgba(249,115,22,0.5)]"
            style={{ width: `${restDuration > 0 ? (restTimer / restDuration) * 100 : 0}%` }}
          />
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => onAddTime(30)}
            className="flex-1 py-3 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white rounded-2xl text-xs font-semibold transition-all"
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
