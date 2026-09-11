import { useState } from 'react';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { Button } from '../../components/ui';
import { formatWorkoutTime } from './utils';
import { hapticLight } from '../../lib/haptics';

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
  const [isExpanded, setIsExpanded] = useState(false);

  const size = isExpanded ? 120 : 44;
  const strokeWidth = isExpanded ? 8 : 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = restDuration > 0 ? (restTimer / restDuration) * 100 : 0;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <aside
      aria-label="Temporizador de descanso activo"
      className="border-border bg-surface/95 animate-in slide-in-from-bottom-4 fixed right-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 z-50 rounded-[var(--radius-modal)] border p-3 shadow-2xl backdrop-blur-md transition-all duration-200 [transition-timing-function:var(--ease-out)] md:right-8 md:bottom-6 md:left-auto md:w-84"
    >
      {isExpanded ? (
        /* Modo Expandido: Gauge grande y foco en descanso */
        <div className="flex flex-col items-center">
          <div className="mb-2 flex w-full items-center justify-between">
            <span className="text-text-muted text-xs font-semibold tracking-wide uppercase">
              Descanso activo
            </span>
            <button
              type="button"
              onClick={() => {
                hapticLight();
                setIsExpanded(false);
              }}
              className="text-text-muted hover:text-text flex h-8 w-8 items-center justify-center rounded-lg active:scale-95"
              aria-label="Minimizar temporizador"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          <div className="relative my-3">
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

          <div className="flex w-full gap-2">
            <button
              type="button"
              onClick={() => {
                hapticLight();
                onAddTime(30);
              }}
              className="bg-surface-raised text-text hover:bg-surface-overlay tap-feedback min-h-[var(--touch-min)] flex-1 touch-manipulation rounded-[var(--radius-button)] py-2 text-xs font-semibold transition-all active:scale-95"
            >
              +30s
            </button>
            <Button
              onClick={() => {
                hapticLight();
                onSkip();
              }}
              className="flex-[1.5]"
              size="md"
            >
              Saltar descanso
            </Button>
          </div>
        </div>
      ) : (
        /* Modo Compacto (Live Activity): Solo 54-60px de alto, permite ver y leer los ejercicios */
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              hapticLight();
              setIsExpanded(true);
            }}
            className="group tap-feedback flex min-w-0 flex-1 items-center gap-2.5 text-left active:scale-98"
            aria-label="Expandir temporizador de descanso"
          >
            <div className="relative shrink-0">
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
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-text font-mono text-base leading-none font-bold tabular-nums">
                  {formatWorkoutTime(restTimer)}
                </span>
                <ChevronUp className="text-text-muted h-3.5 w-3.5 transition-transform group-hover:translate-y-[-1px]" />
              </div>
              <p className="text-text-muted text-small mt-0.5 truncate font-medium">
                Descanso · Toca para ampliar
              </p>
            </div>
          </button>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => {
                hapticLight();
                onAddTime(30);
              }}
              className="bg-surface-raised border-border text-text hover:bg-surface-overlay tap-feedback flex h-10 items-center gap-1 rounded-[var(--radius-button)] border px-3 text-xs font-semibold transition-all active:scale-95"
              aria-label="Añadir 30 segundos"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>30s</span>
            </button>
            <Button
              onClick={() => {
                hapticLight();
                onSkip();
              }}
              size="md"
              variant="secondary"
              className="min-h-10 px-3.5"
            >
              Saltar
            </Button>
          </div>
        </div>
      )}
    </aside>
  );
}
