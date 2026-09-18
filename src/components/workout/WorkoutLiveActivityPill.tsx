import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Timer, Dumbbell, ChevronRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';
import { cn } from '../../lib/utils';
import { hapticLight, hapticSuccess } from '../../lib/haptics';
import { formatWorkoutTime } from '../../pages/activeWorkout/utils';

interface ActiveWorkoutState {
  sessionId: number;
  routineName: string;
  routineId: number;
  timer: number;
  isPaused: boolean;
  completedCount: number;
  totalExercises: number;
  isResting?: boolean;
  restTimer?: number;
}

export function WorkoutLiveActivityPill() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeSession, setActiveSession] = useState<ActiveWorkoutState | null>(null);

  useEffect(() => {
    const checkSession = () => {
      try {
        const raw = sessionStorage.getItem('gymapure_active_session_live');
        if (raw) {
          const parsed = JSON.parse(raw) as ActiveWorkoutState;
          setActiveSession(parsed);
        } else {
          setActiveSession(null);
        }
      } catch {
        setActiveSession(null);
      }
    };

    checkSession();
    const interval = window.setInterval(checkSession, 1000);
    window.addEventListener('workout_session_update', checkSession);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('workout_session_update', checkSession);
    };
  }, []);

  const isCurrentlyOnWorkoutPage = location.pathname.startsWith('/active-workout');
  if (!activeSession || isCurrentlyOnWorkoutPage) return null;

  return createPortal(
    <aside
      aria-label="Entrenamiento activo en segundo plano"
      className={cn(
        'glass-panel light-catch shadow-apple-glass fixed top-3 left-1/2 z-50 -translate-x-1/2 transition-all duration-300 [transition-timing-function:var(--ease-spring)]',
        'border-border/80 bg-bg-elevated/90 w-[calc(100%-1.5rem)] max-w-md rounded-full border px-4 py-2 backdrop-blur-2xl'
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            hapticLight();
            void navigate(`/active-workout/${activeSession.routineId}`);
          }}
          className="tap-feedback group flex min-w-0 flex-1 items-center gap-2.5 text-left"
        >
          <div className="bg-brand/15 text-brand relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
            {activeSession.isResting ? (
              <Timer className="h-4 w-4 animate-pulse" />
            ) : (
              <Dumbbell className="h-4 w-4" />
            )}
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-text group-hover:text-brand truncate text-xs leading-tight font-semibold transition-colors">
              {activeSession.routineName}
            </p>
            <div className="text-small text-text-muted mt-0.5 flex items-center gap-2 font-medium tabular-nums">
              <span className="text-brand font-mono font-bold">
                {formatWorkoutTime(
                  activeSession.isResting && activeSession.restTimer !== undefined
                    ? activeSession.restTimer
                    : activeSession.timer
                )}
              </span>
              <span>·</span>
              <span>
                {activeSession.completedCount}/{activeSession.totalExercises} ej.
              </span>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            hapticSuccess();
            void navigate(`/active-workout/${activeSession.routineId}`);
          }}
          className="bg-brand text-brand-contrast tap-feedback flex h-7 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-semibold shadow-xs transition-transform active:scale-95"
        >
          <span>Volver</span>
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </aside>,
    document.body
  );
}
