import { Flame, Dumbbell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Button, Card } from '../ui';
import { ProgressRing } from './ProgressRing';
import { cn } from '../../lib/utils';
import { apiFetch } from '../../lib/api';

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
        : 'Ver rutinas';

  const renderTrainButton = (className?: string) => (
    <Button
      size="lg"
      className={cn('min-h-[var(--touch-comfort)] w-full sm:w-auto', className)}
      disabled={!!routineId && routineCompletedToday}
      onClick={() => navigate(canTrain ? `/workout/${routineId}` : '/routines')}
      onMouseEnter={() => {
        if (canTrain && routineId) {
          void apiFetch(`/api/routines/${routineId}`).catch(() => undefined);
        }
      }}
    >
      <Dumbbell className="mr-2 h-5 w-5" />
      {trainLabel}
    </Button>
  );

  return (
    <Card
      padding="lg"
      rounded="2xl"
      className={cn(
        'border-brand/20 from-brand/5 relative overflow-hidden bg-gradient-to-br via-transparent to-transparent',
        className
      )}
    >
      <div
        className="bg-brand/10 pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full blur-2xl"
        aria-hidden
      />

      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-brand text-xs font-semibold tracking-wide uppercase">
            {getGreeting()}
          </p>
          <h2 className="mt-1 truncate text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-white">
            {firstName}
          </h2>
          <p className="mt-1 truncate text-sm text-zinc-500 dark:text-zinc-400">
            {routineName ? `Hoy toca: ${routineName}` : 'Tu entrenador te asignará rutinas pronto'}
          </p>

          {routineInProgress && !routineCompletedToday && (
            <p className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
              Tienes un entrenamiento en curso — puedes continuar donde lo dejaste
            </p>
          )}

          {routineCompletedToday && (
            <p className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Rutina completada hoy — vuelve mañana
            </p>
          )}

          {workoutStreak > 0 && (
            <div className="streak-badge mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5">
              <Flame className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                Racha de {workoutStreak} día{workoutStreak !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          <div className="mt-5 hidden w-full sm:flex sm:w-auto">{renderTrainButton()}</div>
        </div>

        <div className="flex w-full shrink-0 flex-col items-center gap-4 sm:w-auto sm:justify-end">
          <ProgressRing
            value={workoutsThisWeek}
            max={weeklyTrainingGoal}
            label="Esta semana"
            sublabel="meta semanal"
          />
          <div className="flex w-full sm:hidden">{renderTrainButton()}</div>
        </div>
      </div>
    </Card>
  );
}
