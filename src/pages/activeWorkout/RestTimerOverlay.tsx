import { Button } from '../../components/ui';
import { formatWorkoutTime } from './utils';

interface RestTimerOverlayProps {
  restTimer: number;
  restDuration: number;
  onAddTime: (seconds: number) => void;
  onSkip: () => void;
  notificationsEnabled?: boolean;
  canRequestNotifications?: boolean;
  onRequestNotifications?: () => void;
}

export function RestTimerOverlay({
  restTimer,
  restDuration,
  onAddTime,
  onSkip,
  notificationsEnabled = false,
  canRequestNotifications = false,
  onRequestNotifications,
}: RestTimerOverlayProps) {
  const size = 120;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = restDuration > 0 ? (restTimer / restDuration) * 100 : 0;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="border-border bg-surface animate-in slide-in-from-bottom-4 fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 z-50 rounded-[var(--radius-card)] border p-4 shadow-2xl md:right-8 md:bottom-4 md:left-auto md:w-80">
      <div className="mx-auto flex max-w-md flex-col items-center">
        <span className="text-text-muted mb-3 text-xs font-medium">Descanso</span>

        <div className="relative mb-4">
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
              className="text-brand transition-[stroke-dashoffset] duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-text font-mono text-2xl font-semibold tabular-nums">
              {formatWorkoutTime(restTimer)}
            </span>
          </div>
        </div>

        {notificationsEnabled ? (
          <p className="text-text-muted text-small mb-3 text-center">También en notificaciones</p>
        ) : canRequestNotifications && onRequestNotifications ? (
          <button
            type="button"
            onClick={onRequestNotifications}
            className="text-brand text-small mb-3 text-center font-medium underline-offset-2 hover:underline"
          >
            Avisarme al terminar
          </button>
        ) : null}

        <div className="flex w-full gap-3">
          <button
            type="button"
            onClick={() => onAddTime(30)}
            className="bg-surface-raised text-text can-hover:hover:bg-surface-overlay min-h-[var(--touch-min)] flex-1 touch-manipulation rounded-[var(--radius-button)] py-3 text-xs font-semibold transition-[background-color,transform,opacity] duration-150 [transition-timing-function:var(--ease-out)]"
          >
            +30s
          </button>
          <Button onClick={onSkip} className="flex-[2]" size="md">
            Saltar
          </Button>
        </div>
      </div>
    </div>
  );
}
