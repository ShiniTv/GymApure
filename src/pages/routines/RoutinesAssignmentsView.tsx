import { Users, Calendar, ChevronRight, Dumbbell, UserPlus } from 'lucide-react';
import { formatDateOnly } from '../../lib/dates';
import { Button, Spinner, EmptyState, Avatar, PageState, Card, Badge } from '../../components/ui';
import { formatDifficulty } from '../../lib/utils';
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
      <EmptyState
        icon={Users}
        title="Sin asignaciones activas"
        description="Asigna rutinas desde el calendario o desde el perfil del miembro."
        action={
          onAssign ? (
            <Button variant="secondary" size="sm" onClick={onAssign}>
              <UserPlus className="h-4 w-4" />
              Asignar rutina
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => onChangeView('calendar')}>
              Ir al calendario
            </Button>
          )
        }
      />
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          {activeMembers.length} miembro{activeMembers.length !== 1 ? 's' : ''} · {totalRoutines}{' '}
          rutina
          {totalRoutines !== 1 ? 's' : ''} activa{totalRoutines !== 1 ? 's' : ''}
        </p>
        {onAssign && (
          <Button size="sm" className="h-9 shrink-0 gap-1.5" onClick={onAssign}>
            <UserPlus className="h-4 w-4" />
            <span className="text-xs font-semibold">Asignar rutina</span>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
        {activeMembers.map((member) => (
          <Card
            key={member.id}
            padding="sm"
            rounded="xl"
            className="hover:border-brand/30 transition-colors"
          >
            <div className="mb-2.5 flex items-center gap-2.5">
              <Avatar
                src={member.profile_image}
                name={member.full_name}
                size="sm"
                className="shrink-0 rounded-lg"
              />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm leading-tight font-semibold text-zinc-900 dark:text-white">
                  {member.full_name}
                </h3>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  {member.routines?.length ?? 0} rutina
                  {(member.routines?.length ?? 0) !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateToMemberRoutines(member.id)}
                className="text-brand hover:bg-brand/10 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors"
                aria-label={`Ver rutinas de ${member.full_name}`}
                title="Ver perfil"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              {member.routines?.map((routine) => (
                <button
                  key={routine.routine_id}
                  type="button"
                  className="hover:border-brand/30 w-full rounded-lg border border-zinc-100 bg-zinc-50/80 px-2.5 py-2 text-left transition-colors hover:bg-white dark:border-zinc-800 dark:bg-zinc-800/30 dark:hover:bg-zinc-800"
                  onClick={() => onNavigateToMemberRoutines(member.id)}
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <h4 className="line-clamp-2 text-xs leading-snug font-semibold text-zinc-900 sm:text-sm dark:text-white">
                      {routine.routine_name}
                    </h4>
                    <Badge
                      variant={difficultyVariant(routine.difficulty)}
                      className="shrink-0 px-1.5 py-0 text-[9px]"
                    >
                      {formatDifficulty(routine.difficulty)}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                    <span className="inline-flex items-center gap-1">
                      <Dumbbell className="text-brand h-3 w-3" />
                      {routine.exercise_count} ej.
                    </span>
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Calendar className="h-3 w-3 text-blue-500" />
                      {formatAssignmentDate(routine.start_date)} –{' '}
                      {formatAssignmentDate(routine.end_date)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
