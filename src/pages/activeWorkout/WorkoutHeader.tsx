import { useRef, useState } from 'react';
import { ArrowLeft, Clock, MoreVertical, Pause, Play, RotateCcw } from 'lucide-react';
import { AnchoredMenu, Button } from '../../components/ui';
import { cn } from '../../lib/utils';
import { formatWorkoutTime } from './utils';
import { workoutIconBtn } from './styles';

export function WorkoutHeader({
  routineName,
  timer,
  isPaused,
  pausePulse,
  completedCount,
  totalExercises,
  progressPct,
  sessionId,
  isResetting,
  onBack,
  onTogglePause,
  onReset,
  onFinish,
}: {
  routineName: string;
  timer: number;
  isPaused: boolean;
  pausePulse: boolean;
  completedCount: number;
  totalExercises: number;
  progressPct: number;
  sessionId: number | null;
  isResetting: boolean;
  onBack: () => void;
  onTogglePause: () => void;
  onReset: () => void;
  onFinish: () => void;
}) {
  const [resetMenuOpen, setResetMenuOpen] = useState(false);
  const resetMenuAnchorRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="border-border/70 bg-surface-raised/50 rounded-[var(--radius-card)] border px-3 py-2.5 sm:px-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className={cn(workoutIconBtn, 'shrink-0')}
            aria-label="Volver a rutinas"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-text truncate text-sm font-bold tracking-[-0.02em] sm:text-base md:text-lg">
              {routineName}
            </h1>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              <span
                className={cn(
                  'bg-brand/10 text-brand inline-flex items-center gap-1 rounded-[var(--radius-chip)] px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums transition-all',
                  pausePulse ? 'animate-pulse' : ''
                )}
              >
                <Clock className="h-3 w-3 shrink-0" />
                {formatWorkoutTime(timer)}
              </span>
              {isPaused ? (
                <span
                  className={cn(
                    'bg-surface-overlay text-text-secondary rounded-[var(--radius-chip)] px-2 py-0.5 text-[10px] font-medium transition-all',
                    pausePulse ? 'animate-pulse' : ''
                  )}
                >
                  Pausado
                </span>
              ) : null}
              <span className="text-text-secondary hidden text-[10px] font-medium sm:inline">
                {completedCount}/{totalExercises} ejercicios
              </span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onTogglePause}
            disabled={!sessionId}
            className={cn(workoutIconBtn, 'hover:text-text')}
            aria-label={isPaused ? 'Reanudar cronómetro' : 'Pausar cronómetro'}
            title={isPaused ? 'Reanudar' : 'Pausar'}
          >
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </button>
          <button
            ref={resetMenuAnchorRef}
            type="button"
            onClick={() => setResetMenuOpen((open) => !open)}
            disabled={!sessionId || isResetting}
            className={cn(workoutIconBtn, 'sm:hidden')}
            aria-label="Más acciones"
            aria-haspopup="menu"
            aria-expanded={resetMenuOpen}
            title="Acciones"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          <AnchoredMenu
            open={resetMenuOpen}
            onClose={() => setResetMenuOpen(false)}
            anchorRef={resetMenuAnchorRef}
            align="end"
            className="min-w-[14rem]"
          >
            <button
              type="button"
              role="menuitem"
              disabled={!sessionId || isResetting}
              className="text-danger hover:bg-danger/10 flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm disabled:opacity-60"
              onClick={() => {
                setResetMenuOpen(false);
                onReset();
              }}
            >
              <RotateCcw className="h-4 w-4" />
              Reiniciar sesión
            </button>
          </AnchoredMenu>
          <button
            type="button"
            onClick={onReset}
            disabled={!sessionId || isResetting}
            className={cn(
              workoutIconBtn,
              'text-text-muted hover:text-text-secondary hidden sm:inline-flex'
            )}
            aria-label="Reiniciar sesión"
            title="Reiniciar"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <Button
            onClick={onFinish}
            disabled={!sessionId}
            size="sm"
            className="h-9 px-3 text-xs sm:px-4 sm:text-sm"
          >
            Finalizar
          </Button>
        </div>
      </div>
      <div className="mt-2.5">
        <div className="text-text-secondary mb-1 flex items-center justify-between text-[10px] font-medium sm:hidden">
          <span>Progreso</span>
          <span className="text-brand">{progressPct}%</span>
        </div>
        <div
          className="bg-surface-overlay h-1.5 overflow-hidden rounded-full"
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progreso de sesión ${progressPct}%`}
        >
          <div
            className="bg-brand h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
