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
import { Button, Card, EmptyState, Badge, ListRowSkeleton, Skeleton } from '../../components/ui';
import { formatDifficulty, cn } from '../../lib/utils';
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

function StaffRoutineExercises({
  routine,
  onAddExercise,
  onInlineUpdate,
  onEditExercise,
  onDeleteExercise,
  dense = false,
}: {
  routine: Routine;
  onAddExercise: (routineId: number) => void;
  onInlineUpdate: RoutinesLibraryViewProps['onInlineUpdate'];
  onEditExercise: (exercise: RoutineExercise) => void;
  onDeleteExercise: (routineId: number, exercise: RoutineExercise) => void;
  dense?: boolean;
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Ejercicios</h4>
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

      <div
        className={cn(
          'space-y-0 sm:grid sm:gap-3',
          dense ? 'sm:grid-cols-1 lg:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
        )}
      >
        {routine.exercises?.map((exercise) => (
          <div key={exercise.routine_exercise_id}>
            <div className="flex items-center justify-between gap-2 border-b border-zinc-100 py-2 sm:hidden dark:border-zinc-800">
              <div className="min-w-0">
                <h5 className="truncate text-sm font-medium text-zinc-900 dark:text-white">
                  {exercise.name}
                </h5>
                <p className="text-[11px] text-zinc-500 tabular-nums dark:text-zinc-400">
                  {exercise.sets}×{exercise.reps}
                  {exercise.rest_seconds > 0 ? ` · ${exercise.rest_seconds}s` : ''}
                </p>
              </div>
              <div className="flex shrink-0 gap-0.5">
                <button
                  type="button"
                  onClick={() => onEditExercise(exercise)}
                  className="hover:text-brand inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400"
                  aria-label={`Editar ${exercise.name}`}
                >
                  <Edit className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteExercise(routine.id, exercise)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:text-red-500"
                  aria-label={`Eliminar ${exercise.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="hidden items-start justify-between gap-2 rounded-lg border border-zinc-100 bg-zinc-50 px-2.5 py-2 sm:flex dark:border-zinc-700 dark:bg-zinc-800/50">
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
                        onInlineUpdate(routine.id, exercise, 'sets', parseInt(e.target.value))
                      }
                      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                    />
                  </label>
                  <label className="inline-flex items-center gap-1">
                    Reps
                    <input
                      type="number"
                      className="focus:ring-brand w-9 rounded border border-zinc-200 bg-white px-1 py-0.5 text-center font-semibold text-zinc-900 focus:ring-1 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
                      defaultValue={exercise.reps}
                      onBlur={(e) =>
                        onInlineUpdate(routine.id, exercise, 'reps', parseInt(e.target.value))
                      }
                      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
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
          </div>
        ))}
        {(!routine.exercises || routine.exercises.length === 0) && (
          <div className="col-span-full rounded-lg border border-dashed border-zinc-200 py-5 text-center text-[11px] text-zinc-400 italic dark:border-zinc-700 dark:text-zinc-300">
            Sin ejercicios en esta rutina
          </div>
        )}
      </div>
    </>
  );
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
  const lightCards = isMember || userRole === 'trainer';
  const totalExercises = routines.reduce((sum, r) => sum + (r.exercise_count ?? 0), 0);

  if (loadingRoutines) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Cargando rutinas">
        <Skeleton className="h-8 w-40" />
        <ListRowSkeleton rows={4} />
      </div>
    );
  }

  if (routines.length === 0) {
    return (
      <div
        className={cn(
          'mx-auto flex w-full max-w-sm flex-col justify-center',
          isMember && 'min-h-[min(52vh,28rem)]'
        )}
      >
        {isStaff ? (
          <div className="space-y-3 rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center dark:border-zinc-700">
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Sin plantillas</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Crea la primera para asignarla a tus miembros.
            </p>
            <Button size="sm" className="mx-auto" onClick={onCreateRoutine}>
              <Plus className="h-4 w-4" />
              Crear plantilla
            </Button>
          </div>
        ) : (
          <EmptyState
            variant="motivational"
            icon={Dumbbell}
            title="Aún sin rutina"
            description="Cuando tu entrenador te asigne una, aparecerá aquí lista para entrenar."
            className="border-0 bg-transparent shadow-none"
          />
        )}
      </div>
    );
  }

  const anyInProgress = routines.some((r) => activeRoutineSet.has(r.id));
  const allDoneToday =
    isMember && routines.length > 0 && routines.every((r) => completedTodaySet.has(r.id));
  const memberFooterHint = isMember
    ? allDoneToday
      ? 'Listo por hoy. Mañana puedes repetir o esperar una nueva asignación.'
      : anyInProgress
        ? 'Tienes un entrenamiento en curso: pulsa Continuar cuando quieras.'
        : 'Pulsa Entrenar para empezar. El chevron muestra series y reps.'
    : null;

  const selectedStaffRoutine =
    isStaff && expandedRoutineId != null
      ? (routines.find((r) => r.id === expandedRoutineId) ?? null)
      : null;
  const selectedStaffSummary = selectedStaffRoutine
    ? buildExerciseSummary({
        count: selectedStaffRoutine.exercise_count ?? 0,
        preview: selectedStaffRoutine.exercise_preview,
        loadedExercises: selectedStaffRoutine.exercises,
      })
    : null;

  return (
    <div className="w-full space-y-2.5 sm:space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 px-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
          {routines.length} rutina{routines.length !== 1 ? 's' : ''} · {totalExercises} ejercicio
          {totalExercises !== 1 ? 's' : ''}
        </p>
        {isStaff && (
          <Button
            size="sm"
            variant="ghost"
            className="h-9 w-9 shrink-0 rounded-xl p-0 sm:h-9 sm:w-auto sm:gap-1.5 sm:px-2.5"
            onClick={onCreateRoutine}
            aria-label="Nueva rutina"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden text-xs sm:inline">Nueva</span>
          </Button>
        )}
      </div>

      <div
        className={cn(
          isStaff &&
            'md:grid md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] md:items-start md:gap-4 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]'
        )}
      >
        <div
          className={cn(
            isStaff
              ? 'grid grid-cols-1 gap-2.5'
              : 'grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4'
          )}
        >
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
            const workoutLabel = completedToday
              ? 'Completada hoy'
              : inProgress
                ? 'Continuar'
                : 'Entrenar';

            return (
              <Card
                key={routine.id}
                padding={lightCards ? 'sm' : 'md'}
                rounded="xl"
                className={`content-visibility-auto touch-manipulation overflow-hidden ${
                  lightCards
                    ? 'border-zinc-200/70 bg-white/80 dark:border-zinc-800/80 dark:bg-zinc-900/50'
                    : ''
                } ${
                  isExpanded
                    ? isStaff
                      ? 'ring-brand/25 border-brand/30 ring-2'
                      : 'ring-brand/20 ring-2 sm:col-span-2 xl:col-span-4'
                    : ''
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
                  {!(lightCards && isStaff) && (
                    <div
                      className={`flex shrink-0 items-center justify-center rounded-lg ${
                        lightCards ? 'bg-brand/10 h-8 w-8' : 'bg-brand/10 h-10 w-10 rounded-xl'
                      }`}
                    >
                      {lightCards ? (
                        <Dumbbell className="text-brand h-3.5 w-3.5" />
                      ) : (
                        <Dumbbell className="text-brand dark:text-brand h-4 w-4" />
                      )}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                      <h3 className="truncate text-sm leading-snug font-semibold text-zinc-900 dark:text-white">
                        {routine.name}
                      </h3>
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
                    <p className="mt-0.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                      {exerciseSummary.label}
                    </p>
                    {/* Preview: members always; staff only when expanded (see below) */}
                    {isMember && exerciseSummary.preview ? (
                      <p className="mt-0.5 line-clamp-1 text-[11px] leading-snug text-zinc-400 dark:text-zinc-500">
                        {exerciseSummary.preview}
                      </p>
                    ) : null}
                    {!isMember && canOpen && !isExpanded && (
                      <>
                        <span className="text-brand mt-1.5 inline-flex items-center text-[11px] font-semibold md:hidden">
                          Ver ejercicios
                          <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
                        </span>
                        <span className="text-brand mt-1.5 hidden text-[11px] font-semibold md:inline-flex md:items-center">
                          Seleccionar
                          <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
                        </span>
                      </>
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
                          className="hover:text-brand hover:bg-brand/10 hidden h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors sm:inline-flex dark:text-zinc-300"
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
                          className="hidden h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-red-500/10 hover:text-red-500 sm:inline-flex dark:text-zinc-300"
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
                          className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors sm:h-8 sm:w-8 ${
                            isExpanded
                              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                              : 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200'
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
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 ${
                          isExpanded
                            ? 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'
                            : ''
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

                {isMember && (
                  <div className="mt-2.5">
                    <Button
                      type="button"
                      size="sm"
                      className="min-h-9 w-full shadow-none sm:w-auto"
                      disabled={completedToday}
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartWorkout?.(routine.id);
                      }}
                    >
                      <Play className="h-3.5 w-3.5" />
                      {workoutLabel}
                    </Button>
                  </div>
                )}

                {isExpanded && (
                  <div
                    className={cn(
                      'animate-in slide-in-from-top-2 mt-3 space-y-2.5 border-t border-zinc-100/80 pt-3 duration-200 dark:border-zinc-800/80',
                      isStaff && 'md:hidden'
                    )}
                  >
                    {isStaff && exerciseSummary.preview ? (
                      <p className="text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
                        {exerciseSummary.preview}
                      </p>
                    ) : null}
                    {isStaff && (
                      <div className="flex gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-9 flex-1 text-xs"
                          onClick={() => onEditRoutine(routine)}
                        >
                          <Settings2 className="h-3.5 w-3.5" />
                          Configurar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-9 flex-1 text-xs text-red-600 dark:text-red-400"
                          onClick={() => onDeleteRoutine(routine)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Eliminar
                        </Button>
                      </div>
                    )}
                    {isMember ? (
                      <>
                        <div className="space-y-2">
                          {routine.exercises?.map((exercise) => (
                            <div
                              key={exercise.routine_exercise_id}
                              className="rounded-lg px-2.5 py-2 dark:bg-zinc-950/40"
                            >
                              <div className="flex items-baseline justify-between gap-2">
                                <h5 className="truncate text-sm font-medium text-zinc-900 dark:text-white">
                                  {exercise.name}
                                </h5>
                                <p className="shrink-0 text-[11px] text-zinc-500 tabular-nums dark:text-zinc-400">
                                  {exercise.sets}×{exercise.reps}
                                </p>
                              </div>
                              <p className="mt-0.5 text-[11px] text-zinc-400 capitalize dark:text-zinc-500">
                                {exercise.muscle_group}
                                {exercise.rest_seconds > 0 ? ` · ${exercise.rest_seconds}s` : ''}
                              </p>
                            </div>
                          ))}
                          {(!routine.exercises || routine.exercises.length === 0) && (
                            <div className="rounded-lg border border-dashed border-zinc-200 py-5 text-center text-xs text-zinc-400 italic dark:border-zinc-700 dark:text-zinc-300">
                              Sin ejercicios en esta rutina
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <StaffRoutineExercises
                        routine={routine}
                        onAddExercise={onAddExercise}
                        onInlineUpdate={onInlineUpdate}
                        onEditExercise={onEditExercise}
                        onDeleteExercise={onDeleteExercise}
                      />
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {isStaff ? (
          <Card
            padding="sm"
            rounded="xl"
            className="sticky top-3 hidden max-h-[calc(100vh-7rem)] overflow-y-auto border-zinc-200/70 bg-white/80 md:block dark:border-zinc-800/80 dark:bg-zinc-900/50"
          >
            {selectedStaffRoutine && selectedStaffSummary ? (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <h3 className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                        {selectedStaffRoutine.name}
                      </h3>
                      <Badge
                        variant={difficultyVariant(selectedStaffRoutine.difficulty)}
                        className="shrink-0 px-1.5 py-0 text-[9px]"
                      >
                        {formatDifficulty(selectedStaffRoutine.difficulty)}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                      {selectedStaffSummary.label}
                      {selectedStaffSummary.preview ? ` · ${selectedStaffSummary.preview}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-0.5">
                    <button
                      type="button"
                      onClick={() => onEditRoutine(selectedStaffRoutine)}
                      className="hover:text-brand hover:bg-brand/10 inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400"
                      aria-label={`Configurar ${selectedStaffRoutine.name}`}
                      title="Configurar"
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteRoutine(selectedStaffRoutine)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-red-500/10 hover:text-red-500"
                      aria-label={`Eliminar ${selectedStaffRoutine.name}`}
                      title="Eliminar"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <StaffRoutineExercises
                  routine={selectedStaffRoutine}
                  onAddExercise={onAddExercise}
                  onInlineUpdate={onInlineUpdate}
                  onEditExercise={onEditExercise}
                  onDeleteExercise={onDeleteExercise}
                  dense
                />
              </div>
            ) : (
              <div className="flex min-h-[12rem] flex-col items-center justify-center px-4 py-8 text-center">
                <Dumbbell className="text-brand/40 mb-2 h-8 w-8" aria-hidden />
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  Selecciona una plantilla
                </p>
                <p className="mt-1 text-[12px] text-zinc-500 dark:text-zinc-400">
                  Elige una rutina a la izquierda para editar ejercicios aquí.
                </p>
              </div>
            )}
          </Card>
        ) : null}
      </div>

      {isStaff && routines.length <= 1 && (
        <button
          type="button"
          onClick={onCreateRoutine}
          className="text-brand hover:bg-brand/5 dark:hover:bg-brand/10 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-200 py-2.5 text-xs font-semibold transition-colors dark:border-zinc-700"
        >
          <Plus className="h-3.5 w-3.5" />
          {routines.length === 0 ? 'Crear plantilla' : 'Crear otra plantilla'}
        </button>
      )}

      {memberFooterHint ? (
        <p className="px-1 pt-1 text-center text-[11px] leading-snug text-zinc-400 dark:text-zinc-500">
          {memberFooterHint}
        </p>
      ) : null}
    </div>
  );
}
