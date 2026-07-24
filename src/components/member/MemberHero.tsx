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

const statusPill =
  'mt-3.5 inline-flex max-w-full items-center rounded-pill px-2.5 py-1 text-[11px] font-semibold';

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

  return (
    <Card
      padding="md"
      rounded="2xl"
      className={cn(
        'from-brand/[0.04] relative overflow-hidden bg-gradient-to-br via-transparent to-transparent dark:from-brand/[0.07]',
        className
      )}
    >
      <div
        className="bg-brand/8 pointer-events-none absolute -top-16 -right-16 h-36 w-36 rounded-full blur-3xl"
        aria-hidden
      />

      <div className="relative flex items-start gap-5">
        <div className="min-w-0 flex-1">
          <p className="text-brand text-[11px] font-medium tracking-[0.16em] uppercase">
            {getGreeting()}
          </p>
          <h2 className="type-h1 mt-2 truncate text-[1.65rem] sm:text-3xl">{firstName}</h2>
          <p className="mt-2 truncate text-sm leading-relaxed text-text-secondary">
            {routineName ? `Hoy toca: ${routineName}` : 'Tu entrenador te asignará rutinas pronto'}
          </p>

          {routineInProgress && !routineCompletedToday && (
            <span className={cn(statusPill, 'bg-warning/10 text-warning')}>
              Entrenamiento en curso
            </span>
          )}

          {routineCompletedToday && (
            <span className={cn(statusPill, 'bg-success/10 text-success')}>Completada hoy</span>
          )}

          {workoutStreak > 0 && (
            <div className={cn(statusPill, 'streak-badge gap-1.5 bg-success/10')}>
              <Flame className="h-3.5 w-3.5 text-success" aria-hidden />
              <span className="text-success">
                Racha {workoutStreak} día{workoutStreak !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        <ProgressRing
          value={workoutsThisWeek}
          max={weeklyTrainingGoal}
          size={76}
          strokeWidth={5}
          label="Esta semana"
          sublabel="meta"
          className="shrink-0"
        />
      </div>

      <Button
        size="sm"
        className="relative mt-5 w-full shadow-sm sm:mt-6 sm:w-auto"
        disabled={!!routineId && routineCompletedToday}
        onClick={() => navigate(canTrain ? `/workout/${routineId}` : '/routines')}
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
