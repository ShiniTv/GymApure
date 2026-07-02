import { Users, Calendar, ChevronRight, Dumbbell } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Button, Spinner, EmptyState, Avatar, PageState, Card, Badge } from '../../components/ui';
import { formatDifficulty } from '../../lib/utils';
import type { RoutineAssignmentMember, RoutinesView } from './types';

export interface RoutinesAssignmentsViewProps {
  loadingAssignments: boolean;
  assignments: RoutineAssignmentMember[];
  onChangeView: (view: RoutinesView) => void;
  onNavigateToMemberRoutines: (memberId: number) => void;
}

function formatAssignmentDate(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return format(parseISO(value), 'dd/MM/yy');
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
  onNavigateToMemberRoutines,
}: RoutinesAssignmentsViewProps) {
  const activeMembers = assignments.filter((m) => m.routines && m.routines.length > 0);
  const totalRoutines = activeMembers.reduce((sum, m) => sum + (m.routines?.length ?? 0), 0);

  if (loadingAssignments) {
    return (
      <PageState>
        <Spinner />
        <p className="mt-3 text-zinc-500 dark:text-zinc-400 text-xs">Cargando asignaciones…</p>
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
          <Button variant="secondary" size="sm" onClick={() => onChangeView('calendar')}>
            Ir al calendario
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 px-0.5">
        {activeMembers.length} miembro{activeMembers.length !== 1 ? 's' : ''} · {totalRoutines} rutina
        {totalRoutines !== 1 ? 's' : ''} activa{totalRoutines !== 1 ? 's' : ''}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-3">
        {activeMembers.map((member) => (
          <Card key={member.id} padding="sm" rounded="xl" className="hover:border-brand/30 transition-colors">
            <div className="flex items-center gap-2.5 mb-2.5">
              <Avatar src={member.profile_image} name={member.full_name} size="sm" className="rounded-lg shrink-0" />
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm text-zinc-900 dark:text-white truncate leading-tight">
                  {member.full_name}
                </h3>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  {member.routines?.length ?? 0} rutina{(member.routines?.length ?? 0) !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateToMemberRoutines(member.id)}
                className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-lg text-brand hover:bg-brand/10 transition-colors"
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
                  className="w-full text-left rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-800/30 px-2.5 py-2 hover:border-brand/30 hover:bg-white dark:hover:bg-zinc-800 transition-colors"
                  onClick={() => onNavigateToMemberRoutines(member.id)}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-semibold text-xs sm:text-sm text-zinc-900 dark:text-white leading-snug line-clamp-2">
                      {routine.routine_name}
                    </h4>
                    <Badge variant={difficultyVariant(routine.difficulty)} className="shrink-0 text-[9px] px-1.5 py-0">
                      {formatDifficulty(routine.difficulty)}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                    <span className="inline-flex items-center gap-1">
                      <Dumbbell className="h-3 w-3 text-brand" />
                      {routine.exercise_count} ej.
                    </span>
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Calendar className="h-3 w-3 text-blue-500" />
                      {formatAssignmentDate(routine.start_date)} – {formatAssignmentDate(routine.end_date)}
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
