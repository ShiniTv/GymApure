import { Flame, Dumbbell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../ui';
import { ProgressRing } from './ProgressRing';
import { cn } from '../../lib/utils';

const WEEKLY_GOAL = 4;

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

interface MemberHeroProps {
  name: string;
  workoutsThisWeek: number;
  workoutStreak: number;
  routineId?: number;
  routineName?: string;
  className?: string;
}

export function MemberHero({
  name,
  workoutsThisWeek,
  workoutStreak,
  routineId,
  routineName,
  className,
}: MemberHeroProps) {
  const navigate = useNavigate();
  const firstName = name.split(' ')[0] ?? name;

  return (
    <Card
      padding="lg"
      rounded="2xl"
      className={cn(
        'relative overflow-hidden border-brand/20 bg-gradient-to-br from-brand/5 via-transparent to-transparent',
        className
      )}
    >
      <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-brand/10 blur-2xl pointer-events-none" aria-hidden />

      <div className="flex flex-col sm:flex-row sm:items-center gap-5">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">{getGreeting()}</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white tracking-tight mt-1 truncate">
            {firstName}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {routineName ? `Hoy toca: ${routineName}` : 'Tu entrenador te asignará rutinas pronto'}
          </p>

          {workoutStreak > 0 && (
            <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 streak-badge">
              <Flame className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                Racha de {workoutStreak} día{workoutStreak !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          <div className="hidden sm:flex mt-5">
            <Button
              size="lg"
              className="min-h-[var(--touch-comfort)]"
              onClick={() => navigate(routineId ? `/workout/${routineId}` : '/routines')}
            >
              <Dumbbell className="h-5 w-5 mr-2" />
              {routineId ? 'Entrenar ahora' : 'Ver rutinas'}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-center sm:justify-end gap-6 shrink-0">
          <ProgressRing
            value={workoutsThisWeek}
            max={WEEKLY_GOAL}
            label="Esta semana"
            sublabel="meta semanal"
          />
        </div>
      </div>
    </Card>
  );
}
