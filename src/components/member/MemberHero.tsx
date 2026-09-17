import { Flame, Dumbbell } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useEffect } from 'react';
import { Button, Card } from '../ui';
import { ProgressRing } from './ProgressRing';
import { MemberTodayRoutinePicker } from './MemberTodayRoutinePicker';
import { cn } from '../../lib/utils';
import { apiFetch } from '../../lib/api';
import { hapticSuccess } from '../../lib/haptics';
import type { TodayRoutineOption } from './MemberTodayRoutinePicker';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

interface MemberHeroProps {
  name: string;
  workoutsThisWeek: number;
  weeklyTrainingGoal?: number;
  workoutStreak: number;
  routineId?: number;
  routineName?: string;
  routineCompletedToday?: boolean;
  /** True when there is an open session for the primary routine. */
  routineInProgress?: boolean;
  assignedRoutines?: TodayRoutineOption[];
  todayRoutineId?: number | null;
  className?: string;
}

export function MemberHero({
  name,
  workoutsThisWeek,
  weeklyTrainingGoal = 5,
  workoutStreak,
  routineId,
  routineName,
  routineCompletedToday = false,
  routineInProgress = false,
  assignedRoutines = [],
  todayRoutineId,
  className,
}: MemberHeroProps) {
  const navigate = useNavigate();
  const firstName = name.split(' ')[0] ?? name;
  const canTrain = routineId && !routineCompletedToday;

  useEffect(() => {
    if (!canTrain || !routineId) return;
    const controller = new AbortController();
    const t = window.setTimeout(() => {
      void apiFetch(`/api/routines/${routineId}`, { signal: controller.signal }).catch(() => {
        /* best-effort prefetch */
      });
    }, 400);
    return () => {
      window.clearTimeout(t);
      controller.abort();
    };
  }, [canTrain, routineId]);

  const trainLabel = routineCompletedToday
    ? 'Completada hoy'
    : routineInProgress
      ? 'Continuar entrenamiento'
      : routineId
        ? 'Entrenar ahora'
        : 'Elegir plantilla';

  const statusLine = routineCompletedToday
    ? 'Completada hoy'
    : routineInProgress
      ? 'Entrenamiento en curso'
      : null;

  return (
    <Card
      padding="md"
      rounded="xl"
      className={cn('border-border/80 bg-surface relative overflow-hidden shadow-2xs', className)}
    >
      <div className="relative flex items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-text truncate text-base font-semibold tracking-[-0.015em] sm:text-lg">
            {getGreeting()}, {firstName}
          </h2>
          <p className="text-text-muted sm:text-small mt-0.5 truncate text-xs">
            {routineName
              ? `Hoy toca: ${routineName}`
              : 'Elige cómo entrenar hoy o empieza con una plantilla'}
          </p>

          {assignedRoutines.length > 1 ? (
            <MemberTodayRoutinePicker
              className="mt-2.5"
              compact
              routines={assignedRoutines}
              selectedId={todayRoutineId ?? routineId}
            />
          ) : null}

          {statusLine || workoutStreak > 0 ? (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
              {statusLine ? (
                <span className="bg-surface-raised text-text-secondary border-border/60 inline-flex items-center rounded-md border px-2 py-0.5 font-medium">
                  {statusLine}
                </span>
              ) : null}
              {workoutStreak > 0 ? (
                <span className="bg-success/10 text-success border-success/30 inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-medium">
                  <Flame className="h-3 w-3 shrink-0" aria-hidden />
                  <span>
                    Racha {workoutStreak} día{workoutStreak !== 1 ? 's' : ''}
                  </span>
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        <ProgressRing
          value={workoutsThisWeek}
          max={weeklyTrainingGoal}
          size={52}
          strokeWidth={4}
          label="Esta semana"
          sublabel="meta"
          className="shrink-0"
        />
      </div>

      <div className="mt-3.5 flex items-center gap-2">
        <Button
          size="sm"
          className="tap-feedback relative w-full gap-1.5 shadow-2xs sm:w-auto"
          disabled={!!routineId && routineCompletedToday}
          onClick={() => {
            if (canTrain) hapticSuccess();
            navigate(canTrain ? `/workout/${routineId}` : '/routines?view=templates');
          }}
          onMouseEnter={() => {
            if (canTrain && routineId) {
              void apiFetch(`/api/routines/${routineId}`).catch(() => undefined);
            }
          }}
        >
          <Dumbbell className="h-3.5 w-3.5" />
          <span>{trainLabel}</span>
        </Button>
      </div>
    </Card>
  );
}
