import {
  ArrowLeftRight,
  Calendar,
  ChevronDown,
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
import { formatDifficulty } from '../../lib/utils';
import { AnchoredMenu, Badge, Button, Card, EmptyState, IconButton } from '../../components/ui';
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
  onEditRoutine: (routine: Routine) => void;
  onCloneRoutine: (routine: Routine) => void;
  onUnassignRoutine: (routine: Routine) => void;
  onNavigateHistory: (routineId: number) => void;
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
  onEditRoutine,
  onCloneRoutine,
  onUnassignRoutine,
  onNavigateHistory,
}: MemberRoutinesListProps) {
  const menuRoutine =
    routineMenuId != null ? routines.find((routine) => routine.id === routineMenuId) : null;

  return (
    <div className="space-y-2.5">
      {routines.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="Sin rutinas asignadas"
          description={`${member.full_name} aún no tiene planes de entrenamiento.`}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button size="sm" onClick={onCreateRoutine}>
                Crear rutina
              </Button>
              <Button size="sm" variant="secondary" onClick={onAssignRoutine}>
                Asignar existente
              </Button>
            </div>
          }
        />
      ) : (
        routines.map((routine) => {
          const isExpanded = expandedRoutineId === routine.id;
          const exerciseCount = routine.exercise_count ?? routine.exercises?.length ?? 0;
          const exerciseSummary = buildExerciseSummary({
            count: exerciseCount,
            preview: routine.exercise_preview,
            loadedExercises: routine.exercises,
          });
          const formatDate = (value: string | null | undefined) => {
            if (!value) return '—';
            try {
              return formatDateOnly(value, 'dd/MM/yy', { locale: es });
            } catch {
              return '—';
            }
          };

          return (
            <Card
              key={routine.id}
              padding="sm"
              rounded="xl"
              className={`touch-manipulation ${isExpanded ? 'ring-brand/20 ring-2' : ''}`}
            >
              <div className="flex items-center gap-2">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onToggleExpand(routine.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onToggleExpand(routine.id);
                    }
                  }}
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left"
                  aria-expanded={isExpanded}
                >
                  <div className="bg-brand/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                    <Dumbbell className="text-brand h-3.5 w-3.5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-text truncate text-sm leading-tight font-semibold">
                        {routine.name}
                      </h3>
                      <Badge variant="default" className="text-small shrink-0 px-1.5 py-0">
                        {formatDifficulty(routine.difficulty)}
                      </Badge>
                    </div>
                    <p className="text-text-muted text-small mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 tabular-nums">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3 shrink-0" />
                        {formatDate(routine.start_date)} – {formatDate(routine.end_date)}
                      </span>
                      <span className="text-text-muted">·</span>
                      <span className="text-text-secondary font-medium">
                        {exerciseSummary.label}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-0.5">
                  <IconButton
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleExpand(routine.id);
                    }}
                    aria-label={isExpanded ? 'Cerrar ejercicios' : 'Ver ejercicios'}
                    aria-expanded={isExpanded}
                    title={isExpanded ? 'Cerrar' : 'Ejercicios'}
                  >
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </IconButton>
                  <IconButton
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
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

              {isExpanded && (
                <div className="border-border mt-2.5 space-y-2 border-t pt-2.5">
                  {exerciseSummary.preview && (
                    <p className="text-text-muted text-small leading-snug">
                      {exerciseSummary.preview}
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-text-secondary text-xs font-semibold">Ejercicios</h4>
                    <Button
                      type="button"
                      size="sm"
                      className="h-10 px-3 text-xs sm:h-8 sm:px-2.5"
                      onClick={onAddExercise}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Añadir</span>
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {routine.exercises?.map((exercise) => (
                      <div
                        key={exercise.routine_exercise_id}
                        className="border-border/70 bg-surface-raised flex items-start justify-between gap-2 rounded-lg border px-2.5 py-2"
                      >
                        <div className="min-w-0">
                          <h5 className="text-text truncate text-xs font-semibold">
                            {exercise.name}
                          </h5>
                          <p className="text-text-muted text-small capitalize">
                            {exercise.muscle_group}
                          </p>
                          {formatSetPrescriptionSummary(exercise.set_prescription) && (
                            <p className="text-text-secondary text-small mt-0.5 font-medium">
                              {formatSetPrescriptionSummary(exercise.set_prescription)}
                            </p>
                          )}
                          <div className="text-text-muted text-small mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                            <label className="inline-flex items-center gap-1">
                              Sets
                              <input
                                type="number"
                                className="border-border bg-surface text-text focus:ring-brand w-9 rounded border px-1 py-0.5 text-center font-semibold focus:ring-1"
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
                                className="border-border bg-surface text-text focus:ring-brand w-9 rounded border px-1 py-0.5 text-center font-semibold focus:ring-1"
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
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onSubstituteExercise(routine.id, exercise)}
                            className="text-text-muted hover:text-brand hover:bg-brand/10 inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
                            aria-label={`Sustituir ${exercise.name}`}
                            title="Sustituir"
                          >
                            <ArrowLeftRight className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteExercise(routine.id, exercise)}
                            className="text-text-muted hover:bg-danger/10 hover:text-danger inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
                            aria-label={`Eliminar ${exercise.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {(!routine.exercises || routine.exercises.length === 0) && (
                      <p className="text-text-muted text-small col-span-full py-3 text-center">
                        Sin ejercicios en esta rutina.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </Card>
          );
        })
      )}
      {routines.length > 0 && routines.length <= 2 && (
        <button
          type="button"
          onClick={onAssignRoutine}
          className="text-brand hover:bg-brand/5 border-border flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed py-2.5 text-xs font-semibold transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Asignar otra rutina
        </button>
      )}
      <AnchoredMenu
        open={menuRoutine != null}
        onClose={() => onRoutineMenuChange(null)}
        anchorRef={routineMenuAnchorRef}
        className="min-w-[10rem]"
      >
        {menuRoutine && (
          <>
            <button
              type="button"
              role="menuitem"
              className="text-text hover:bg-surface-raised flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm"
              onClick={() => {
                onRoutineMenuChange(null);
                onEditRoutine(menuRoutine);
              }}
            >
              <Edit className="h-4 w-4" />
              Editar
            </button>
            <button
              type="button"
              role="menuitem"
              className="text-text hover:bg-surface-raised flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm"
              onClick={() => {
                onRoutineMenuChange(null);
                onCloneRoutine(menuRoutine);
              }}
            >
              <Copy className="h-4 w-4" />
              Duplicar
            </button>
            <button
              type="button"
              role="menuitem"
              className="text-danger hover:bg-danger/10 flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm"
              onClick={() => {
                onRoutineMenuChange(null);
                onUnassignRoutine(menuRoutine);
              }}
            >
              <UserMinus className="h-4 w-4" />
              Quitar
            </button>
            <button
              type="button"
              role="menuitem"
              className="text-text hover:bg-surface-raised flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm"
              onClick={() => {
                onRoutineMenuChange(null);
                onNavigateHistory(menuRoutine.id);
              }}
            >
              <History className="h-4 w-4" />
              Historial
            </button>
          </>
        )}
      </AnchoredMenu>
    </div>
  );
}
