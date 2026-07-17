import {
  Plus,
  ChevronRight,
  ChevronDown,
  Trash2,
  Edit,
  Settings2,
  Dumbbell,
  Play,
} from 'lucide-react';
import { Button, Card, Spinner, EmptyState, Badge, PageState } from '../../components/ui';
import { formatDifficulty } from '../../lib/utils';
import { buildExerciseSummary } from '../../lib/routineDisplay';
import type { Routine, RoutineExercise } from './types';

export interface RoutinesLibraryViewProps {
  loadingRoutines: boolean;
  routines: Routine[];
  userRole?: string;
  expandedRoutineId: number | null;
  onRoutineCardClick: (routineId: number) => void;
  onToggleExpandRoutine: (routineId: number) => void;
  onEditRoutine: (routine: Routine) => void;
  onDeleteRoutine: (routine: Routine) => void;
  onCreateRoutine: () => void;
  onAddExercise: (routineId: number) => void;
  onInlineUpdate: (
    routineId: number,
    exercise: RoutineExercise,
    field: 'sets' | 'reps',
    value: number
  ) => void;
  onEditExercise: (exercise: RoutineExercise) => void;
  onDeleteExercise: (routineId: number, exercise: RoutineExercise) => void;
  onStartWorkout?: (routineId: number) => void;
  completedRoutineIdsToday?: number[];
  activeRoutineIds?: number[];
}

function difficultyVariant(difficulty: string): 'danger' | 'warning' | 'success' {
  if (difficulty === 'Advanced') return 'danger';
  if (difficulty === 'Intermediate') return 'warning';
  return 'success';
}

export function RoutinesLibraryView({
  loadingRoutines,
  routines,
  userRole,
  expandedRoutineId,
  onRoutineCardClick,
  onToggleExpandRoutine,
  onEditRoutine,
  onDeleteRoutine,
  onCreateRoutine,
  onAddExercise,
  onInlineUpdate,
  onEditExercise,
  onDeleteExercise,
  onStartWorkout,
  completedRoutineIdsToday = [],
  activeRoutineIds = [],
}: RoutinesLibraryViewProps) {
  const completedTodaySet = new Set(completedRoutineIdsToday);
  const activeRoutineSet = new Set(activeRoutineIds);
  const isStaff = userRole === 'trainer' || userRole === 'admin';
  const isMember = userRole === 'member';
  const totalExercises = routines.reduce((sum, r) => sum + (r.exercise_count ?? 0), 0);

  if (loadingRoutines) {
    return (
      <PageState>
        <Spinner />
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">Cargando rutinas…</p>
      </PageState>
    );
  }

  if (routines.length === 0) {
    return (
      <EmptyState
        variant={isMember ? 'motivational' : 'default'}
        icon={Dumbbell}
        title={isMember ? 'Sin rutinas asignadas' : 'Sin rutinas'}
        description={
          isMember
            ? 'Tu entrenador aún no te asignó rutinas. Cuando lo haga, aparecerán aquí.'
            : 'Crea tu primera rutina para asignarla a tus miembros.'
        }
        action={
          !isMember ? (
            <Button size="sm" onClick={onCreateRoutine}>
              <Plus className="h-4 w-4" />
              Crear rutina
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 px-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
          {routines.length} rutina{routines.length !== 1 ? 's' : ''} · {totalExercises} ejercicio
          {totalExercises !== 1 ? 's' : ''}
        </p>
        {isStaff && (
          <Button
            size="sm"
            className="h-11 min-h-11 w-11 shrink-0 rounded-xl p-0 whitespace-nowrap sm:w-auto sm:px-4"
            onClick={onCreateRoutine}
            aria-label="Nueva rutina"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nueva rutina</span>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
        {routines.map((routine) => {
          const isExpanded = expandedRoutineId === routine.id;
          const canOpen = isMember || isStaff;
          const completedToday = completedTodaySet.has(routine.id);
          const inProgress = activeRoutineSet.has(routine.id);
          const exerciseSummary = buildExerciseSummary({
            count: routine.exercise_count ?? 0,
            preview: routine.exercise_preview,
            loadedExercises: routine.exercises,
          });

          return (
            <Card
              key={routine.id}
              padding="sm"
              rounded="xl"
              className={`content-visibility-auto touch-manipulation overflow-hidden ${
                isMember ? 'from-brand/8 bg-gradient-to-br via-transparent to-transparent' : ''
              } ${isExpanded ? 'ring-brand/20 ring-2 sm:col-span-2 xl:col-span-3' : ''}`}
            >
              <div
                role={canOpen ? 'button' : undefined}
                tabIndex={canOpen ? 0 : undefined}
                onClick={canOpen ? () => onRoutineCardClick(routine.id) : undefined}
                onKeyDown={
                  canOpen
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onRoutineCardClick(routine.id);
                        }
                      }
                    : undefined
                }
                className={`group flex items-center gap-2.5 ${canOpen ? 'cursor-pointer' : ''}`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isMember ? 'bg-brand/15' : 'bg-brand/10'}`}
                >
                  {isMember ? (
                    <Play className="text-brand fill-brand/20 h-4 w-4" />
                  ) : (
                    <Dumbbell className="text-brand dark:text-brand h-4 w-4" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="flex-1 truncate text-sm leading-tight font-semibold text-zinc-900 dark:text-white">
                      {routine.name}
                    </h3>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge
                        variant={difficultyVariant(routine.difficulty)}
                        className="shrink-0 px-1.5 py-0 text-[9px]"
                      >
                        {formatDifficulty(routine.difficulty)}
                      </Badge>
                      {inProgress && !completedToday && (
                        <Badge variant="warning" className="shrink-0 px-1.5 py-0 text-[9px]">
                          En curso
                        </Badge>
                      )}
                      {completedToday && (
                        <Badge variant="success" className="shrink-0 px-1.5 py-0 text-[9px]">
                          Hecha hoy
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="mt-1 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    {exerciseSummary.label}
                  </p>
                  {exerciseSummary.preview && (
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
                      {exerciseSummary.preview}
                    </p>
                  )}
                  {canOpen && !isExpanded && (
                    <span className="text-brand dark:text-brand mt-1.5 inline-flex items-center text-[11px] font-semibold sm:text-xs">
                      Toca para ver ejercicios
                      <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
                    </span>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
                  {isStaff && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditRoutine(routine);
                        }}
                        className="hover:text-brand hover:bg-brand/10 inline-flex h-11 w-11 items-center justify-center rounded-xl text-zinc-400 transition-colors sm:h-8 sm:w-8 sm:rounded-lg dark:text-zinc-300"
                        aria-label={`Configurar ${routine.name}`}
                        title="Configurar"
                      >
                        <Settings2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteRoutine(routine);
                        }}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-zinc-400 transition-colors hover:bg-red-500/10 hover:text-red-500 sm:h-8 sm:w-8 sm:rounded-lg dark:text-zinc-300"
                        aria-label={`Eliminar ${routine.name}`}
                        title="Eliminar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void onToggleExpandRoutine(routine.id);
                        }}
                        className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border transition-colors sm:h-8 sm:w-8 sm:rounded-lg ${
                          isExpanded
                            ? 'border-zinc-900 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                            : 'hover:border-brand hover:text-brand border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400'
                        }`}
                        aria-label={isExpanded ? 'Cerrar ejercicios' : 'Gestionar ejercicios'}
                        aria-expanded={isExpanded}
                        title={isExpanded ? 'Cerrar ejercicios' : 'Ejercicios'}
                      >
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </button>
                    </>
                  )}
                  {isMember && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void onToggleExpandRoutine(routine.id);
                      }}
                      className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border transition-colors sm:h-8 sm:w-8 sm:rounded-lg ${
                        isExpanded
                          ? 'bg-brand border-brand text-white'
                          : 'hover:border-brand hover:text-brand border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400'
                      }`}
                      aria-label={isExpanded ? 'Cerrar detalles' : 'Ver ejercicios'}
                      aria-expanded={isExpanded}
                      title={isExpanded ? 'Cerrar ejercicios' : 'Ejercicios'}
                    >
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="animate-in slide-in-from-top-2 mt-2.5 space-y-2 border-t border-zinc-100 pt-2.5 duration-200 dark:border-zinc-800">
                  {isMember ? (
                    <>
                      <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        Ejercicios
                      </h4>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {routine.exercises?.map((exercise) => (
                          <div
                            key={exercise.routine_exercise_id}
                            className="rounded-lg border border-zinc-100 bg-zinc-50 px-2.5 py-2 dark:border-zinc-700 dark:bg-zinc-800/50"
                          >
                            <h5 className="truncate text-xs font-semibold text-zinc-900 dark:text-white">
                              {exercise.name}
                            </h5>
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                              {exercise.muscle_group}
                            </p>
                            <p className="mt-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                              {exercise.sets} series × {exercise.reps} reps ·{' '}
                              {exercise.rest_seconds}s descanso
                            </p>
                          </div>
                        ))}
                        {(!routine.exercises || routine.exercises.length === 0) && (
                          <div className="col-span-full rounded-lg border border-dashed border-zinc-200 py-5 text-center text-[11px] text-zinc-400 italic dark:border-zinc-700 dark:text-zinc-300">
                            Sin ejercicios en esta rutina
                          </div>
                        )}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        className="w-full sm:w-auto"
                        disabled={completedToday}
                        onClick={() => onStartWorkout?.(routine.id)}
                      >
                        <Play className="h-4 w-4" />
                        {completedToday
                          ? 'Completada hoy'
                          : inProgress
                            ? 'Continuar entrenamiento'
                            : 'Empezar entrenamiento'}
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                          Ejercicios
                        </h4>
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 px-2.5 text-xs"
                          onClick={() => onAddExercise(routine.id)}
                          aria-label="Añadir ejercicio"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Añadir</span>
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {routine.exercises?.map((exercise) => (
                          <div
                            key={exercise.routine_exercise_id}
                            className="flex items-start justify-between gap-2 rounded-lg border border-zinc-100 bg-zinc-50 px-2.5 py-2 dark:border-zinc-700 dark:bg-zinc-800/50"
                          >
                            <div className="min-w-0">
                              <h5 className="truncate text-xs font-semibold text-zinc-900 dark:text-white">
                                {exercise.name}
                              </h5>
                              <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                                {exercise.muscle_group}
                              </p>
                              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                                <label className="inline-flex items-center gap-1">
                                  Sets
                                  <input
                                    type="number"
                                    className="focus:ring-brand w-9 rounded border border-zinc-200 bg-white px-1 py-0.5 text-center font-semibold text-zinc-900 focus:ring-1 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
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
                                    className="focus:ring-brand w-9 rounded border border-zinc-200 bg-white px-1 py-0.5 text-center font-semibold text-zinc-900 focus:ring-1 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
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
                                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                    {exercise.rest_seconds}s
                                  </span>
                                </span>
                              </div>
                            </div>
                            <div className="flex shrink-0 gap-0.5">
                              <button
                                type="button"
                                onClick={() => onEditExercise(exercise)}
                                className="hover:text-brand hover:bg-brand/10 inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors dark:text-zinc-300"
                                aria-label={`Editar ${exercise.name}`}
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteExercise(routine.id, exercise)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-red-500/10 hover:text-red-500 dark:text-zinc-300"
                                aria-label={`Eliminar ${exercise.name}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                        {(!routine.exercises || routine.exercises.length === 0) && (
                          <div className="col-span-full rounded-lg border border-dashed border-zinc-200 py-5 text-center text-[11px] text-zinc-400 italic dark:border-zinc-700 dark:text-zinc-300">
                            Sin ejercicios en esta rutina
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
