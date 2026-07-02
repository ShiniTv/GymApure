import { Plus, ChevronRight, ChevronDown, Trash2, Edit, Settings2, Dumbbell, Play } from 'lucide-react';
import { Button, Card, Spinner, EmptyState, Badge, PageState } from '../../components/ui';import { formatDifficulty } from '../../lib/utils';
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
  onAddExercise: () => void;
  onInlineUpdate: (
    routineId: number,
    exercise: RoutineExercise,
    field: 'sets' | 'reps',
    value: number
  ) => void;
  onEditExercise: (exercise: RoutineExercise) => void;
  onDeleteExercise: (routineId: number, exercise: RoutineExercise) => void;
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
}: RoutinesLibraryViewProps) {
  const isStaff = userRole === 'trainer' || userRole === 'admin';
  const isMember = userRole === 'member';
  const totalExercises = routines.reduce((sum, r) => sum + (r.exercise_count ?? 0), 0);

  if (loadingRoutines) {
    return (
      <PageState>
        <Spinner />
        <p className="mt-3 text-zinc-500 dark:text-zinc-400 text-xs">Cargando plantillas…</p>
      </PageState>
    );
  }

  if (routines.length === 0) {
    return (
      <EmptyState
        variant={isMember ? 'motivational' : 'default'}
        icon={Dumbbell}
        title={isMember ? 'Sin rutinas asignadas' : 'Sin plantillas de rutina'}
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
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 px-0.5 min-w-0">
          {routines.length} plantilla{routines.length !== 1 ? 's' : ''} · {totalExercises} ejercicio
          {totalExercises !== 1 ? 's' : ''}
        </p>
        {isStaff && (
            <Button
              size="sm"
              className="h-11 min-h-11 w-11 shrink-0 rounded-xl p-0 sm:w-auto sm:px-4 whitespace-nowrap"
              onClick={onCreateRoutine}
              aria-label="Nueva rutina"
            >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nueva rutina</span>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-3">
        {routines.map((routine) => {
          const isExpanded = expandedRoutineId === routine.id;
          const canOpen = isMember || isStaff;

          return (
            <Card
              key={routine.id}
              padding="sm"
              rounded="xl"
              className={`content-visibility-auto overflow-hidden touch-manipulation ${
                isMember ? 'bg-gradient-to-br from-brand/8 via-transparent to-transparent' : ''
              } ${
                isExpanded ? 'sm:col-span-2 xl:col-span-3 ring-2 ring-brand/20' : ''
              }`}
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
                <div className={`h-9 w-9 shrink-0 rounded-lg flex items-center justify-center ${isMember ? 'bg-brand/15' : 'bg-brand/10'}`}>
                  {isMember ? (
                    <Play className="h-4 w-4 text-brand fill-brand/20" />
                  ) : (
                    <Dumbbell className="h-4 w-4 text-brand dark:text-brand" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm text-zinc-900 dark:text-white leading-tight truncate flex-1">
                      {routine.name}
                    </h3>
                    <Badge variant={difficultyVariant(routine.difficulty)} className="shrink-0 text-[9px] px-1.5 py-0">
                      {formatDifficulty(routine.difficulty)}
                    </Badge>
                  </div>
                  <p className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {routine.exercise_count} ejercicio{routine.exercise_count !== 1 ? 's' : ''}
                  </p>
                  {isMember && (
                    <span className="mt-1 inline-flex items-center text-xs font-semibold text-brand dark:text-brand">
                      Desliza o toca para empezar <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-0.5 shrink-0">
                  {isStaff && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditRoutine(routine);
                        }}
                        className="h-8 w-8 inline-flex items-center justify-center text-zinc-400 dark:text-zinc-300 hover:text-brand hover:bg-brand/10 rounded-lg transition-colors"
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
                        className="h-8 w-8 inline-flex items-center justify-center text-zinc-400 dark:text-zinc-300 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
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
                        className={`h-8 w-8 inline-flex items-center justify-center rounded-lg border transition-colors ${
                          isExpanded
                            ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900'
                            : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-brand hover:text-brand'
                        }`}
                        aria-label={isExpanded ? 'Cerrar ejercicios' : 'Gestionar ejercicios'}
                        aria-expanded={isExpanded}
                        title={isExpanded ? 'Cerrar' : 'Ejercicios'}
                      >
                        <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    </>
                  )}
                  {isMember && <ChevronRight className="h-4 w-4 text-brand shrink-0" />}
                </div>
              </div>

              {isExpanded && (
                <div className="mt-2.5 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 space-y-2 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Ejercicios</h4>
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 px-2.5 text-xs"
                      onClick={onAddExercise}
                      aria-label="Añadir ejercicio"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Añadir</span>
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {routine.exercises?.map((exercise) => (
                      <div
                        key={exercise.routine_exercise_id}
                        className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700 px-2.5 py-2 rounded-lg flex justify-between items-start gap-2"
                      >
                        <div className="min-w-0">
                          <h5 className="font-semibold text-zinc-900 dark:text-white text-xs truncate">
                            {exercise.name}
                          </h5>
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{exercise.muscle_group}</p>
                          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                            <label className="inline-flex items-center gap-1">
                              Sets
                              <input
                                type="number"
                                className="w-9 bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded px-1 py-0.5 text-center font-semibold text-zinc-900 dark:text-white focus:ring-1 focus:ring-brand"
                                defaultValue={exercise.sets}
                                onBlur={(e) => onInlineUpdate(routine.id, exercise, 'sets', parseInt(e.target.value))}
                                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                              />
                            </label>
                            <label className="inline-flex items-center gap-1">
                              Reps
                              <input
                                type="number"
                                className="w-9 bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded px-1 py-0.5 text-center font-semibold text-zinc-900 dark:text-white focus:ring-1 focus:ring-brand"
                                defaultValue={exercise.reps}
                                onBlur={(e) => onInlineUpdate(routine.id, exercise, 'reps', parseInt(e.target.value))}
                                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                              />
                            </label>
                            <span>
                              Rst <span className="font-semibold text-zinc-800 dark:text-zinc-200">{exercise.rest_seconds}s</span>
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => onEditExercise(exercise)}
                            className="h-8 w-8 inline-flex items-center justify-center text-zinc-400 dark:text-zinc-300 hover:text-brand hover:bg-brand/10 rounded-lg transition-colors"
                            aria-label={`Editar ${exercise.name}`}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteExercise(routine.id, exercise)}
                            className="h-8 w-8 inline-flex items-center justify-center text-zinc-400 dark:text-zinc-300 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                            aria-label={`Eliminar ${exercise.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {(!routine.exercises || routine.exercises.length === 0) && (
                      <div className="col-span-full py-5 text-center text-zinc-400 dark:text-zinc-300 text-[11px] italic border border-dashed border-zinc-200 dark:border-zinc-700 rounded-lg">
                        Sin ejercicios en esta plantilla
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
