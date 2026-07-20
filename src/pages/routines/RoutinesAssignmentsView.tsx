import { Calendar, Dumbbell, UserPlus, Plus } from 'lucide-react';
import { formatDateOnly } from '../../lib/dates';
import { Button, Spinner, Avatar, PageState, Badge } from '../../components/ui';
import { formatDifficulty, cn } from '../../lib/utils';
import type { RoutineAssignmentMember, RoutinesView } from './types';

export interface RoutinesAssignmentsViewProps {
  loadingAssignments: boolean;
  assignments: RoutineAssignmentMember[];
  onChangeView: (view: RoutinesView) => void;
  onAssign?: () => void;
  onNavigateToMemberRoutines: (memberId: number) => void;
}

function formatAssignmentDate(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return formatDateOnly(value, 'dd/MM/yy');
  } catch {
    return '—';
  }
}

function difficultyVariant(difficulty: string): 'danger' | 'warning' | 'success' {
  if (difficulty === 'Advanced') return 'danger';
  if (difficulty === 'Intermediate') return 'warning';
  return 'success';
}

export function RoutinesAssignmentsView({
  loadingAssignments,
  assignments,
  onChangeView,
  onAssign,
  onNavigateToMemberRoutines,
}: RoutinesAssignmentsViewProps) {
  const activeMembers = assignments.filter((m) => m.routines && m.routines.length > 0);
  const totalRoutines = activeMembers.reduce((sum, m) => sum + (m.routines?.length ?? 0), 0);

  if (loadingAssignments) {
    return (
      <PageState>
        <Spinner />
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">Cargando asignaciones…</p>
      </PageState>
    );
  }

  if (activeMembers.length === 0) {
    return (
      <div className="space-y-3 rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center dark:border-zinc-700">
        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          Sin asignaciones activas
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Asigna una plantilla a un miembro para verla aquí.
        </p>
        {onAssign ? (
          <Button size="sm" className="mx-auto" onClick={onAssign}>
            <UserPlus className="h-4 w-4" />
            Asignar rutina
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="mx-auto"
            onClick={() => onChangeView('calendar')}
          >
            Ir al calendario
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <p className="min-w-0 text-[11px] text-zinc-500 dark:text-zinc-400">
          {activeMembers.length} miembro{activeMembers.length !== 1 ? 's' : ''} · {totalRoutines}{' '}
          rutina
          {totalRoutines !== 1 ? 's' : ''} activa{totalRoutines !== 1 ? 's' : ''}
        </p>
        {onAssign && (
          <Button
            size="sm"
            variant="ghost"
            className="h-9 shrink-0 gap-1.5 px-2.5"
            onClick={onAssign}
            aria-label="Asignar rutina"
          >
            <UserPlus className="h-4 w-4" />
            <span className="hidden text-xs font-semibold sm:inline">Asignar</span>
          </Button>
        )}
      </div>

      <div className="space-y-2 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0 xl:grid-cols-3">
        {activeMembers.map((member) => {
          const routineCount = member.routines?.length ?? 0;
          return (
            <div
              key={member.id}
              className="overflow-hidden rounded-xl border border-zinc-200/70 dark:border-zinc-800/80"
            >
              <button
                type="button"
                onClick={() => onNavigateToMemberRoutines(member.id)}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40"
                aria-label={`Ver rutinas de ${member.full_name}`}
              >
                <Avatar
                  src={member.profile_image}
                  name={member.full_name}
                  size="sm"
                  className="shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                    {member.full_name}
                  </h3>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    {routineCount} rutina{routineCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </button>

              <ul className="divide-y divide-zinc-100 border-t border-zinc-100 dark:divide-zinc-800 dark:border-zinc-800">
                {member.routines?.map((routine) => (
                  <li key={routine.routine_id}>
                    <button
                      type="button"
                      className="flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-zinc-50/60 dark:hover:bg-zinc-900/30"
                      onClick={() => onNavigateToMemberRoutines(member.id)}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                          <h4 className="truncate text-xs font-semibold text-zinc-900 sm:text-sm dark:text-white">
                            {routine.routine_name}
                          </h4>
                          <Badge
                            variant={difficultyVariant(routine.difficulty)}
                            className="shrink-0 px-1.5 py-0 text-[9px]"
                          >
                            {formatDifficulty(routine.difficulty)}
                          </Badge>
                        </div>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                          <span className="inline-flex items-center gap-1">
                            <Dumbbell className="text-brand h-3 w-3" />
                            {routine.exercise_count} ej.
                          </span>
                          <span className="text-zinc-300 dark:text-zinc-600">·</span>
                          <span className="inline-flex items-center gap-1 tabular-nums">
                            <Calendar className="h-3 w-3 shrink-0 opacity-70" />
                            {formatAssignmentDate(routine.start_date)} –{' '}
                            {formatAssignmentDate(routine.end_date)}
                          </span>
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {onAssign && activeMembers.length <= 2 && (
        <button
          type="button"
          onClick={onAssign}
          className={cn(
            'text-brand hover:bg-brand/5 dark:hover:bg-brand/10 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-200 py-2.5 text-xs font-semibold transition-colors dark:border-zinc-700'
          )}
        >
          <Plus className="h-3.5 w-3.5" />
          Asignar otra rutina
        </button>
      )}
    </div>
  );
}
