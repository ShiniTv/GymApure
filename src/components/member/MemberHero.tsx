import { Flame, Dumbbell } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useEffect } from 'react';
import { Button, Card } from '../ui';
import { ProgressRing } from './ProgressRing';
import { MemberTodayRoutinePicker } from './MemberTodayRoutinePicker';
import { cn } from '../../lib/utils';
import { typography } from '../../lib/typography';
import { apiFetch } from '../../lib/api';
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
    <Card padding="md" rounded="xl" className={cn('relative overflow-hidden', className)}>
      <div className="relative flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className={cn(typography.heroName, 'truncate')}>
            {getGreeting()}, {firstName}
          </h2>
          <p className={cn(typography.pageSubtitle, 'truncate')}>
            {routineName
              ? `Hoy toca: ${routineName}`
              : 'Elige cómo entrenar hoy o empieza con una plantilla'}
          </p>

          {assignedRoutines.length > 1 ? (
            <MemberTodayRoutinePicker
              className="mt-3"
              compact
              routines={assignedRoutines}
              selectedId={todayRoutineId ?? routineId}
            />
          ) : null}

          {statusLine || workoutStreak > 0 ? (
            <p
              className={cn(
                typography.small,
                'text-text-secondary mt-2 flex flex-wrap items-center gap-x-2 gap-y-1'
              )}
            >
              {statusLine ? <span>{statusLine}</span> : null}
              {statusLine && workoutStreak > 0 ? (
                <span className="text-text-muted" aria-hidden>
                  ·
                </span>
              ) : null}
              {workoutStreak > 0 ? (
                <span className="inline-flex items-center gap-1">
                  <Flame className="text-success h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>
                    Racha {workoutStreak} día{workoutStreak !== 1 ? 's' : ''}
                  </span>
                </span>
              ) : null}
            </p>
          ) : null}
        </div>

        <ProgressRing
          value={workoutsThisWeek}
          max={weeklyTrainingGoal}
          size={48}
          strokeWidth={3.5}
          label="Esta semana"
          sublabel="meta"
          className="shrink-0"
        />
      </div>

      <Button
        size="md"
        className="relative mt-3 w-full sm:w-auto"
        disabled={!!routineId && routineCompletedToday}
        onClick={() => navigate(canTrain ? `/workout/${routineId}` : '/routines?view=templates')}
        onMouseEnter={() => {
          if (canTrain && routineId) {
            void apiFetch(`/api/routines/${routineId}`).catch(() => undefined);
          }
        }}
      >
        <Dumbbell className="h-4 w-4" />
        {trainLabel}
      </Button>
    </Card>
  );
}
