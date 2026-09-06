import {
  ArrowLeftRight,
  Calendar,
  ChevronDown,
  ChevronRight,
  Copy,
  Dumbbell,
  Edit,
  History,
  MoreHorizontal,
  Plus,
  Trash2,
  UserMinus,
} from 'lucide-react';
import { dateLocale as es } from '../../lib/dateLocale';
import { formatDateOnly } from '../../lib/dates';
import { buildExerciseSummary } from '../../lib/routineDisplay';
import { formatSetPrescriptionSummary } from '../../lib/setPrescription';
import { cn, formatDifficulty } from '../../lib/utils';
import { RoutineExerciseOrderControls } from '../../components/routines/RoutineExerciseOrderControls';
import { AnchoredMenu, Badge, Button, IconButton } from '../../components/ui';
import { OperateEmpty, OperateIcon } from '../../components/operate/OperateChrome';
import type { Exercise, MemberUser, Routine } from './types';

interface MemberRoutinesListProps {
  member: MemberUser;
  routines: Routine[];
  expandedRoutineId: number | null;
  routineMenuId: number | null;
  routineMenuAnchorRef: React.RefObject<HTMLButtonElement | null>;
  onToggleExpand: (routineId: number) => void;
  onRoutineMenuChange: (routineId: number | null, anchor?: HTMLButtonElement) => void;
  onCreateRoutine: () => void;
  onAssignRoutine: () => void;
  onAddExercise: () => void;
  onInlineUpdate: (
    routineId: number,
    exercise: Exercise,
    field: 'sets' | 'reps',
    value: number
  ) => void;
  onEditExercise: (routineId: number, exercise: Exercise) => void;
  onSubstituteExercise: (routineId: number, exercise: Exercise) => void;
  onDeleteExercise: (routineId: number, exercise: Exercise) => void;
  onReorderExercise: (routineId: number, fromIndex: number, direction: -1 | 1) => void;
  onEditRoutine: (routine: Routine) => void;
  onCloneRoutine: (routine: Routine) => void;
  onUnassignRoutine: (routine: Routine) => void;
  onNavigateHistory: (routineId: number) => void;
}

function formatRoutineDate(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return formatDateOnly(value, 'dd/MM/yy', { locale: es });
  } catch {
    return '—';
  }
}

export function MemberRoutinesList({
  member,
  routines,
  expandedRoutineId,
  routineMenuId,
  routineMenuAnchorRef,
  onToggleExpand,
  onRoutineMenuChange,
  onCreateRoutine,
  onAssignRoutine,
  onAddExercise,
  onInlineUpdate,
  onEditExercise,
  onSubstituteExercise,
  onDeleteExercise,
  onReorderExercise,
  onEditRoutine,
  onCloneRoutine,
  onUnassignRoutine,
  onNavigateHistory,
}: MemberRoutinesListProps) {
  const menuRoutine =
    routineMenuId != null ? routines.find((routine) => routine.id === routineMenuId) : null;

  if (routines.length === 0) {
    return (
      <OperateEmpty
        icon={Dumbbell}
        title="Sin rutinas asignadas"
        description={`${member.full_name} aún no tiene planes de entrenamiento.`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={onCreateRoutine}>
              Crear rutina
            </Button>
            <Button size="sm" variant="secondary" onClick={onAssignRoutine}>
              Asignar existente
            </Button>
          </div>
        }
      />
    );
  }

  return (
    <div className="space-y-0">
      <div className="border-border/80 bg-surface overflow-hidden rounded-[var(--radius-card)] border">
        {routines.map((routine, routineIndex) => {
          const isExpanded = expandedRoutineId === routine.id;
          const exerciseCount = routine.exercise_count ?? routine.exercises?.length ?? 0;
          const exerciseSummary = buildExerciseSummary({
            count: exerciseCount,
            preview: routine.exercise_preview,
            loadedExercises: routine.exercises,
          });

          return (
            <div
              key={routine.id}
              className={cn(
                routineIndex > 0 && 'border-border/70 border-t',
                isExpanded && 'bg-surface-raised/40'
              )}
            >
              <div className="flex min-h-12 touch-manipulation items-center gap-2.5 px-3 py-2.5 sm:min-h-[3.25rem]">
                <button
                  type="button"
                  onClick={() => onToggleExpand(routine.id)}
                  className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                  aria-expanded={isExpanded}
                >
                  <OperateIcon icon={Dumbbell} tone="brand" well size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <h3 className="text-text truncate text-[0.8125rem] font-semibold tracking-[-0.014em] sm:text-sm">
                        {routine.name}
                      </h3>
                      <Badge
                        variant="default"
                        className="text-small shrink-0 px-1.5 py-0 font-medium"
                      >
                        {formatDifficulty(routine.difficulty)}
                      </Badge>
                    </div>
                    <p className="text-text-muted sm:text-small mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0 text-[0.6875rem] leading-snug tabular-nums">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
                        {formatRoutineDate(routine.start_date)} –{' '}
                        {formatRoutineDate(routine.end_date)}
                      </span>
                      <span className="text-text-muted/40">·</span>
                      <span>{exerciseSummary.label}</span>
                    </p>
                  </div>
                </button>

                <div className="flex shrink-0 items-center">
                  <IconButton
                    size="sm"
                    variant="ghost"
                    onClick={() => onToggleExpand(routine.id)}
                    aria-label={isExpanded ? 'Cerrar ejercicios' : 'Ver ejercicios'}
                    aria-expanded={isExpanded}
                    title={isExpanded ? 'Cerrar' : 'Ejercicios'}
                  >
                    <ChevronDown
                      className={cn(
                        'operate-icon h-3.5 w-3.5 transition-transform duration-150',
                        isExpanded && 'rotate-180'
                      )}
                    />
                  </IconButton>
                  <IconButton
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      if (routineMenuId === routine.id) {
                        onRoutineMenuChange(null);
                        return;
                      }
                      onRoutineMenuChange(routine.id, e.currentTarget);
                    }}
                    aria-label="Más acciones"
                    aria-expanded={routineMenuId === routine.id}
                    aria-haspopup="menu"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </IconButton>
                </div>
              </div>

              {isExpanded ? (
                <div className="border-border/70 space-y-2 border-t px-3 pt-2.5 pb-3">
                  {exerciseSummary.preview ? (
                    <p className="text-text-muted text-small leading-snug">
                      {exerciseSummary.preview}
                    </p>
                  ) : null}
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-text text-xs font-semibold tracking-[-0.01em]">
                      Orden de ejecución
                    </h4>
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 min-h-8 px-2.5 text-xs"
                      onClick={onAddExercise}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Añadir</span>
                    </Button>
                  </div>

                  {routine.exercises && routine.exercises.length > 0 ? (
                    <ul className="border-border/70 bg-bg/40 overflow-hidden rounded-[var(--radius-button)] border">
                      {routine.exercises.map((exercise, index) => (
                        <li
                          key={exercise.routine_exercise_id}
                          className="border-border/60 flex items-start gap-2 border-b px-2 py-2 last:border-b-0"
                        >
                          <RoutineExerciseOrderControls
                            index={index}
                            total={routine.exercises?.length ?? 0}
                            name={exercise.name}
                            onMove={(direction) => onReorderExercise(routine.id, index, direction)}
                          />
                          <div className="min-w-0 flex-1">
                            <h5 className="text-text truncate text-xs font-semibold tracking-[-0.011em]">
                              {exercise.name}
                            </h5>
                            <p className="text-text-muted text-[0.6875rem] capitalize">
                              {exercise.muscle_group}
                            </p>
                            {formatSetPrescriptionSummary(exercise.set_prescription) ? (
                              <p className="text-text-secondary text-small mt-0.5 font-medium">
                                {formatSetPrescriptionSummary(exercise.set_prescription)}
                              </p>
                            ) : null}
                            <div className="text-text-muted text-small mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                              <label className="inline-flex items-center gap-1">
                                Sets
                                <input
                                  type="number"
                                  className="border-border bg-surface text-text focus:ring-brand h-7 w-9 rounded border px-1 text-center text-xs font-semibold focus:ring-1"
                                  defaultValue={exercise.sets}
                                  onBlur={(e) =>
                                    onInlineUpdate(
                                      routine.id,
                                      exercise,
                                      'sets',
                                      parseInt(e.target.value)
                                    )
                                  }
                                  onKeyDown={(e) =>
                                    e.key === 'Enter' && (e.target as HTMLInputElement).blur()
                                  }
                                />
                              </label>
                              <label className="inline-flex items-center gap-1">
                                Reps
                                <input
                                  type="number"
                                  className="border-border bg-surface text-text focus:ring-brand h-7 w-9 rounded border px-1 text-center text-xs font-semibold focus:ring-1"
                                  defaultValue={exercise.reps}
                                  onBlur={(e) =>
                                    onInlineUpdate(
                                      routine.id,
                                      exercise,
                                      'reps',
                                      parseInt(e.target.value)
                                    )
                                  }
                                  onKeyDown={(e) =>
                                    e.key === 'Enter' && (e.target as HTMLInputElement).blur()
                                  }
                                />
                              </label>
                              <span>
                                Rst{' '}
                                <span className="text-text font-semibold">
                                  {exercise.rest_seconds}s
                                </span>
                              </span>
                            </div>
                          </div>
                          <div className="flex shrink-0 gap-0.5">
                            <button
                              type="button"
                              onClick={() => onEditExercise(routine.id, exercise)}
                              className="text-text-muted hover:text-brand hover:bg-brand/10 inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                              aria-label={`Editar ${exercise.name}`}
                            >
                              <Edit className="operate-icon h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onSubstituteExercise(routine.id, exercise)}
                              className="text-text-muted hover:text-brand hover:bg-brand/10 inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                              aria-label={`Sustituir ${exercise.name}`}
                              title="Sustituir"
                            >
                              <ArrowLeftRight className="operate-icon h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteExercise(routine.id, exercise)}
                              className="text-text-muted hover:bg-danger/10 hover:text-danger inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                              aria-label={`Eliminar ${exercise.name}`}
                            >
                              <Trash2 className="operate-icon h-3.5 w-3.5" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-text-muted text-small py-2 text-center">
                      Sin ejercicios en esta rutina.
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}

        {/* Assign folded into the same list — no orphan empty block */}
        {routines.length <= 2 ? (
          <button
            type="button"
            onClick={onAssignRoutine}
            className="tap-feedback border-border/70 hover:bg-surface-raised/70 text-text flex min-h-11 w-full items-center gap-2.5 border-t px-3 py-2.5 text-left transition-colors"
          >
            <OperateIcon icon={Plus} tone="brand" well size="sm" />
            <span className="min-w-0 flex-1">
              <span className="text-text block text-[0.8125rem] font-medium tracking-[-0.011em]">
                Asignar otra rutina
              </span>
              <span className="text-text-muted text-small">Plantilla o plan adicional</span>
            </span>
            <ChevronRight
              className="operate-icon text-text-muted h-4 w-4 shrink-0 opacity-50"
              aria-hidden
            />
          </button>
        ) : null}
      </div>

      <AnchoredMenu
        open={menuRoutine != null}
        onClose={() => onRoutineMenuChange(null)}
        anchorRef={routineMenuAnchorRef}
        className="min-w-[10rem]"
      >
        {menuRoutine ? (
          <>
            <button
              type="button"
              role="menuitem"
              className="text-text hover:bg-surface-raised flex min-h-10 w-full items-center gap-2 px-3 py-2 text-left text-sm"
              onClick={() => {
                onRoutineMenuChange(null);
                onEditRoutine(menuRoutine);
              }}
            >
              <Edit className="operate-icon h-4 w-4" />
              Editar
            </button>
            <button
              type="button"
              role="menuitem"
              className="text-text hover:bg-surface-raised flex min-h-10 w-full items-center gap-2 px-3 py-2 text-left text-sm"
              onClick={() => {
                onRoutineMenuChange(null);
                onCloneRoutine(menuRoutine);
              }}
            >
              <Copy className="operate-icon h-4 w-4" />
              Duplicar
            </button>
            <button
              type="button"
              role="menuitem"
              className="text-danger hover:bg-danger/10 flex min-h-10 w-full items-center gap-2 px-3 py-2 text-left text-sm"
              onClick={() => {
                onRoutineMenuChange(null);
                onUnassignRoutine(menuRoutine);
              }}
            >
              <UserMinus className="operate-icon h-4 w-4" />
              Quitar
            </button>
            <button
              type="button"
              role="menuitem"
              className="text-text hover:bg-surface-raised flex min-h-10 w-full items-center gap-2 px-3 py-2 text-left text-sm"
              onClick={() => {
                onRoutineMenuChange(null);
                onNavigateHistory(menuRoutine.id);
              }}
            >
              <History className="operate-icon h-4 w-4" />
              Historial
            </button>
          </>
        ) : null}
      </AnchoredMenu>
    </div>
  );
}
