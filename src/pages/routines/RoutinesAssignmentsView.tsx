import { Calendar, ChevronRight, Dumbbell, UserPlus, Plus } from 'lucide-react';
import { formatDateOnly } from '../../lib/dates';
import { Button, Avatar, AssignmentsListSkeleton, EmptyState } from '../../components/ui';
import { OperateIcon } from '../../components/operate/OperateIcon';
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
    return <AssignmentsListSkeleton rows={5} />;
  }

  if (activeMembers.length === 0) {
    return (
      <EmptyState
        icon={Dumbbell}
        title="Sin asignaciones activas"
        description="Asigna una plantilla a un miembro para verla aquí."
        action={
          onAssign ? (
            <Button size="sm" onClick={onAssign}>
              <UserPlus className="h-4 w-4" />
              Asignar rutina
            </Button>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => onChangeView('calendar')}>
              Ir al calendario
            </Button>
          )
        }
      />
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <p className="text-text-muted text-small min-w-0">
          {activeMembers.length} miembro{activeMembers.length !== 1 ? 's' : ''} · {totalRoutines}{' '}
          rutina
          {totalRoutines !== 1 ? 's' : ''} activa{totalRoutines !== 1 ? 's' : ''}
        </p>
        {onAssign && (
          <Button
            size="sm"
            variant="secondary"
            className="h-9 min-h-11 shrink-0 gap-1.5 px-2.5"
            onClick={onAssign}
            aria-label="Asignar rutina"
          >
            <UserPlus className="h-4 w-4" />
            <span className="hidden text-xs font-semibold sm:inline">Asignar</span>
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {activeMembers.map((member) => {
          const routineCount = member.routines?.length ?? 0;
          return (
            <div
              key={member.id}
              className="border-border/80 bg-surface overflow-hidden rounded-[var(--radius-card)] border"
            >
              <button
                type="button"
                onClick={() => onNavigateToMemberRoutines(member.id)}
                className="tap-feedback hover:bg-surface-raised/80 flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors"
                aria-label={`Ver rutinas de ${member.full_name}`}
              >
                <Avatar
                  src={member.profile_image}
                  name={member.full_name}
                  size="sm"
                  className="shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="text-text truncate text-sm font-medium tracking-[-0.011em]">
                    {member.full_name}
                  </h3>
                  <p className="text-text-muted text-small">
                    {routineCount} rutina{routineCount !== 1 ? 's' : ''}
                  </p>
                </div>
                <ChevronRight
                  className="operate-icon text-text-muted h-4 w-4 shrink-0 opacity-50"
                  aria-hidden
                />
              </button>

              <ul className="border-border/60 border-t">
                {member.routines?.map((routine) => (
                  <li key={routine.routine_id}>
                    <button
                      type="button"
                      className="tap-feedback border-border/60 hover:bg-surface-raised/80 flex w-full items-center gap-3 border-b px-3 py-2.5 text-left transition-colors last:border-b-0"
                      onClick={() => onNavigateToMemberRoutines(member.id)}
                    >
                      <OperateIcon icon={Dumbbell} tone="brand" well size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                          <h4 className="text-text truncate text-sm font-medium tracking-[-0.011em]">
                            {routine.routine_name}
                          </h4>
                          <span className="text-small text-text-muted shrink-0">
                            {formatDifficulty(routine.difficulty)}
                          </span>
                        </div>
                        <p className="text-text-muted text-small mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="inline-flex items-center gap-1">
                            {routine.exercise_count} ej.
                          </span>
                          <span className="text-text-muted/50">·</span>
                          <span className="inline-flex items-center gap-1 tabular-nums">
                            <Calendar className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                            {formatAssignmentDate(routine.start_date)} –{' '}
                            {formatAssignmentDate(routine.end_date)}
                          </span>
                        </p>
                      </div>
                      <ChevronRight
                        className="operate-icon text-text-muted h-4 w-4 shrink-0 opacity-40"
                        aria-hidden
                      />
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
            'text-brand hover:bg-brand/5 dark:hover:bg-brand/10 border-border/80 flex w-full items-center justify-center gap-1.5 rounded-[var(--radius-card)] border border-dashed py-2.5 text-xs font-semibold transition-colors'
          )}
        >
          <Plus className="h-3.5 w-3.5" />
          Asignar otra rutina
        </button>
      )}
    </div>
  );
}
