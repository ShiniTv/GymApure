import { useMemo, useState } from 'react';
import {
  Plus,
  ChevronRight,
  ChevronDown,
  Trash2,
  Edit,
  Settings2,
  Dumbbell,
  Play,
  Copy,
} from 'lucide-react';
import {
  Button,
  Card,
  EmptyState,
  ListRowSkeleton,
  Skeleton,
  SearchInput,
  Select,
  Label,
} from '../../components/ui';
import { formatDifficulty, cn } from '../../lib/utils';
import { buildExerciseSummary } from '../../lib/routineDisplay';
import { RoutineExerciseOrderControls } from '../../components/routines/RoutineExerciseOrderControls';
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
  onCloneRoutine?: (routine: Routine) => void;
  onCreateFromTemplate?: () => void;
  cloningRoutineId?: number | null;
  onAddExercise: (routineId: number) => void;
  onInlineUpdate: (
    routineId: number,
    exercise: RoutineExercise,
    field: 'sets' | 'reps',
    value: number
  ) => void;
  onEditExercise: (exercise: RoutineExercise) => void;
  onDeleteExercise: (routineId: number, exercise: RoutineExercise) => void;
  onReorderExercise?: (routineId: number, fromIndex: number, direction: -1 | 1) => void;
  onStartWorkout?: (routineId: number) => void;
  onSubstituteExercise?: (routineId: number, exercise: RoutineExercise) => void;
  /** Member empty-state CTA to open plantillas tab */
  onShowTemplates?: () => void;
  /** Logged-in member id — used to detect self-owned routines */
  currentUserId?: number;
  completedRoutineIdsToday?: number[];
  activeRoutineIds?: number[];
}

function StaffRoutineExercises({
  routine,
  onAddExercise,
  onInlineUpdate,
  onEditExercise,
  onDeleteExercise,
  onReorderExercise,
}: {
  routine: Routine;
  onAddExercise: (routineId: number) => void;
  onInlineUpdate: RoutinesLibraryViewProps['onInlineUpdate'];
  onEditExercise: (exercise: RoutineExercise) => void;
  onDeleteExercise: (routineId: number, exercise: RoutineExercise) => void;
  onReorderExercise?: RoutinesLibraryViewProps['onReorderExercise'];
}) {
  const exercises = routine.exercises ?? [];
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-small text-text-secondary font-semibold">Ejercicios</h4>
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
      {exercises.length > 1 ? (
        <p className="text-small text-text-muted -mt-1 leading-snug">
          Este orden es el de ejecución del cliente.
        </p>
      ) : null}

      <ul className="border-border divide-border divide-y overflow-hidden rounded-[var(--radius-card)] border">
        {exercises.map((exercise, index) => (
          <li
            key={exercise.routine_exercise_id}
            className="flex items-start justify-between gap-2 px-2.5 py-2"
          >
            {onReorderExercise ? (
              <RoutineExerciseOrderControls
                index={index}
                total={exercises.length}
                name={exercise.name}
                onMove={(direction) => onReorderExercise(routine.id, index, direction)}
              />
            ) : (
              <span className="text-text-muted w-5 shrink-0 pt-0.5 text-center text-xs font-semibold tabular-nums">
                {index + 1}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <h5 className="text-text truncate text-sm font-medium">{exercise.name}</h5>
              <p className="text-small text-text-muted mt-0.5">
                {exercise.muscle_group}
                <span className="text-text-muted/60 mx-1">·</span>
                <span className="tabular-nums">
                  {exercise.sets}×{exercise.reps}
                  {exercise.rest_seconds > 0 ? ` · ${exercise.rest_seconds}s` : ''}
                </span>
              </p>
              <div className="text-small text-text-muted mt-1.5 hidden flex-wrap gap-x-3 gap-y-1 sm:flex">
                <label className="inline-flex items-center gap-1">
                  Sets
                  <input
                    type="number"
                    className="border-border bg-surface text-text focus:ring-brand w-9 rounded-[var(--radius-chip)] border px-1 py-0.5 text-center font-semibold focus:ring-1"
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
                    className="border-border bg-surface text-text focus:ring-brand w-9 rounded-[var(--radius-chip)] border px-1 py-0.5 text-center font-semibold focus:ring-1"
                    defaultValue={exercise.reps}
                    onBlur={(e) =>
                      onInlineUpdate(routine.id, exercise, 'reps', parseInt(e.target.value))
                    }
                    onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                  />
                </label>
              </div>
            </div>
            <div className="flex shrink-0 gap-0.5">
              <button
                type="button"
                onClick={() => onEditExercise(exercise)}
                className="text-text-muted hover:text-brand hover:bg-brand/10 inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                aria-label={`Editar ${exercise.name}`}
              >
                <Edit className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDeleteExercise(routine.id, exercise)}
                className="text-text-muted hover:bg-danger/10 hover:text-danger inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                aria-label={`Eliminar ${exercise.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
        {(!routine.exercises || routine.exercises.length === 0) && (
          <li className="text-small text-text-muted border-border border-dashed px-3 py-5 text-center italic">
            Sin ejercicios en esta rutina
          </li>
        )}
      </ul>
    </>
  );
}

function statusMeta(inProgress: boolean, completedToday: boolean): string | null {
  if (completedToday) return 'Hecha hoy';
  if (inProgress) return 'En curso';
  return null;
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
  onCloneRoutine,
  onCreateFromTemplate,
  cloningRoutineId = null,
  onAddExercise,
  onInlineUpdate,
  onEditExercise,
  onDeleteExercise,
  onReorderExercise,
  onStartWorkout,
  onSubstituteExercise,
  onShowTemplates,
  currentUserId,
  completedRoutineIdsToday = [],
  activeRoutineIds = [],
}: RoutinesLibraryViewProps) {
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');

  const completedTodaySet = new Set(completedRoutineIdsToday);
  const activeRoutineSet = new Set(activeRoutineIds);
  const isStaff = userRole === 'trainer' || userRole === 'admin';
  const isMember = userRole === 'member';
  const lightCards = isMember || userRole === 'trainer';
  const isOwnedByMember = (routine: Routine) =>
    isMember &&
    currentUserId != null &&
    routine.owner_member_id != null &&
    Number(routine.owner_member_id) === currentUserId;

  const filteredRoutines = useMemo(() => {
    const q = search.trim().toLowerCase();
    return routines.filter((r) => {
      if (difficulty && r.difficulty !== difficulty) return false;
      if (!q) return true;
      const hay = `${r.name} ${formatDifficulty(r.difficulty)}`.toLowerCase();
      return hay.includes(q);
    });
  }, [routines, search, difficulty]);

  const totalExercises = filteredRoutines.reduce((sum, r) => sum + (r.exercise_count ?? 0), 0);
  const hasFilters = Boolean(search.trim() || difficulty);

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
      <div className="mx-auto flex w-full max-w-sm flex-col justify-center py-4">
        {isStaff ? (
          <div className="border-border space-y-3 rounded-xl border border-dashed px-4 py-5 text-center">
            <p className="text-text text-sm font-semibold">Sin plantillas</p>
            <p className="text-text-muted text-xs">
              Crea la primera para asignarla a tus miembros.
            </p>
            <Button size="sm" className="mx-auto" onClick={onCreateRoutine}>
              <Plus className="h-4 w-4" />
              Crear plantilla
            </Button>
          </div>
        ) : (
          <EmptyState
            framed={false}
            variant="motivational"
            icon={Dumbbell}
            title="Aún sin rutina"
            description="Elige una plantilla del gym o crea la tuya. Tu entrenador puede ajustarla después."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button size="sm" onClick={() => onShowTemplates?.()}>
                  Ver plantillas
                </Button>
                <Button size="sm" variant="secondary" onClick={onCreateRoutine}>
                  <Plus className="h-4 w-4" />
                  Crear mi rutina
                </Button>
              </div>
            }
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
        : 'Pulsa Empezar entrenamiento. El chevron muestra series y reps.'
    : null;

  const selectedStaffRoutine =
    isStaff && expandedRoutineId != null
      ? (filteredRoutines.find((r) => r.id === expandedRoutineId) ??
        routines.find((r) => r.id === expandedRoutineId) ??
        null)
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
      <div className="flex flex-wrap items-end justify-between gap-2">
        <p className="text-small text-text-muted min-w-0 px-0.5">
          {filteredRoutines.length}
          {hasFilters ? ` de ${routines.length}` : ''} rutina
          {filteredRoutines.length !== 1 ? 's' : ''} · {totalExercises} ejercicio
          {totalExercises !== 1 ? 's' : ''}
        </p>
        {(isStaff || isMember) && (
          <div className="flex shrink-0 items-center gap-1">
            {isStaff && onCreateFromTemplate && routines.length > 0 ? (
              <Button
                size="sm"
                variant="secondary"
                className="h-9 gap-1.5 px-2.5"
                onClick={onCreateFromTemplate}
              >
                <Copy className="h-3.5 w-3.5" />
                <span className="hidden text-xs sm:inline">Desde plantilla</span>
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="secondary"
              className="h-9 w-9 shrink-0 rounded-xl p-0 sm:h-9 sm:w-auto sm:gap-1.5 sm:px-2.5"
              onClick={onCreateRoutine}
              aria-label={isMember ? 'Crear mi rutina' : 'Nueva rutina'}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden text-xs sm:inline">{isMember ? 'Crear' : 'Nueva'}</span>
            </Button>
          </div>
        )}
      </div>

      {isStaff ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <SearchInput
              placeholder="Buscar plantilla…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Buscar plantilla"
            />
          </div>
          <div className="w-full sm:w-44">
            <Label className="sr-only">Dificultad</Label>
            <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              <option value="">Todas las dificultades</option>
              <option value="Beginner">{formatDifficulty('Beginner')}</option>
              <option value="Intermediate">{formatDifficulty('Intermediate')}</option>
              <option value="Advanced">{formatDifficulty('Advanced')}</option>
            </Select>
          </div>
        </div>
      ) : null}

      {isStaff && filteredRoutines.length === 0 ? (
        <div className="border-border rounded-xl border border-dashed px-4 py-8 text-center">
          <p className="text-text text-sm font-semibold">Ninguna plantilla coincide</p>
          <p className="text-text-muted text-small mt-1">Prueba otro nombre o quita el filtro.</p>
          <Button
            size="sm"
            variant="secondary"
            className="mt-3"
            onClick={() => {
              setSearch('');
              setDifficulty('');
            }}
          >
            Limpiar filtros
          </Button>
        </div>
      ) : (
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
            {filteredRoutines.map((routine) => {
              const isExpanded = expandedRoutineId === routine.id;
              const canOpen = isMember || isStaff;
              const completedToday = completedTodaySet.has(routine.id);
              const inProgress = activeRoutineSet.has(routine.id);
              const status = statusMeta(inProgress, completedToday);
              const exerciseSummary = buildExerciseSummary({
                count: routine.exercise_count ?? 0,
                preview: routine.exercise_preview,
                loadedExercises: routine.exercises,
              });
              const workoutLabel = completedToday
                ? 'Completada hoy'
                : inProgress
                  ? 'Continuar entrenamiento'
                  : 'Empezar entrenamiento';
              const cloning = cloningRoutineId === routine.id;

              return (
                <Card
                  key={routine.id}
                  padding={lightCards ? 'sm' : 'md'}
                  rounded="xl"
                  className={cn(
                    'content-visibility-auto touch-manipulation overflow-hidden',
                    lightCards && 'border-border/70 bg-surface/80',
                    isExpanded &&
                      (isStaff
                        ? 'ring-brand/25 border-brand/30 ring-2'
                        : 'ring-brand/20 ring-2 sm:col-span-2 xl:col-span-4')
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={canOpen ? () => onRoutineCardClick(routine.id) : undefined}
                      className={cn(
                        'group flex min-w-0 flex-1 items-center gap-2.5 text-left',
                        canOpen ? 'cursor-pointer' : 'cursor-default'
                      )}
                    >
                      {!(lightCards && isStaff) && (
                        <div
                          className={cn(
                            'bg-brand/10 flex shrink-0 items-center justify-center',
                            lightCards ? 'h-8 w-8 rounded-lg' : 'h-10 w-10 rounded-xl'
                          )}
                        >
                          <Dumbbell
                            className={cn('text-brand', lightCards ? 'h-3.5 w-3.5' : 'h-4 w-4')}
                          />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <h3 className="text-text truncate text-sm leading-snug font-semibold">
                          {routine.name}
                          {isMember ? (
                            <span className="text-text-muted text-small ml-1.5 font-semibold tracking-wide uppercase">
                              {isOwnedByMember(routine) ? 'Mía' : 'Entrenador'}
                            </span>
                          ) : null}
                        </h3>
                        <p className="text-small text-text-muted mt-0.5 font-medium">
                          {formatDifficulty(routine.difficulty)}
                          <span className="text-text-muted/50 mx-1">·</span>
                          {exerciseSummary.label}
                          {status ? (
                            <>
                              <span className="text-text-muted/50 mx-1">·</span>
                              <span className="text-text-secondary">{status}</span>
                            </>
                          ) : null}
                        </p>
                        {isMember && exerciseSummary.preview ? (
                          <p className="text-small text-text-muted mt-0.5 line-clamp-1 leading-snug">
                            {exerciseSummary.preview}
                          </p>
                        ) : null}
                        {!isMember && canOpen && !isExpanded && (
                          <>
                            <span className="text-text-secondary text-small mt-1.5 inline-flex items-center font-semibold md:hidden">
                              Ver ejercicios
                              <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
                            </span>
                            <span className="text-text-secondary text-small mt-1.5 hidden font-semibold md:inline-flex md:items-center">
                              Seleccionar
                              <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
                            </span>
                          </>
                        )}
                      </div>
                    </button>

                    <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
                      {isStaff && (
                        <>
                          {onCloneRoutine ? (
                            <button
                              type="button"
                              disabled={cloning}
                              onClick={(e) => {
                                e.stopPropagation();
                                onCloneRoutine(routine);
                              }}
                              className="text-text-muted hover:text-brand hover:bg-brand/10 hidden h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-50 sm:inline-flex"
                              aria-label={`Duplicar ${routine.name}`}
                              title="Duplicar"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditRoutine(routine);
                            }}
                            className="text-text-muted hover:text-brand hover:bg-brand/10 hidden h-8 w-8 items-center justify-center rounded-lg transition-colors sm:inline-flex"
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
                            className="text-text-muted hover:bg-danger/10 hover:text-danger hidden h-8 w-8 items-center justify-center rounded-lg transition-colors sm:inline-flex"
                            aria-label={`Eliminar ${routine.name}`}
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void onToggleExpandRoutine(routine.id);
                            }}
                            className={cn(
                              'inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors sm:h-8 sm:w-8',
                              isExpanded
                                ? 'bg-text text-bg'
                                : 'text-text-muted hover:bg-surface-overlay hover:text-text'
                            )}
                            aria-label={isExpanded ? 'Cerrar ejercicios' : 'Gestionar ejercicios'}
                            aria-expanded={isExpanded}
                            title={isExpanded ? 'Cerrar ejercicios' : 'Ejercicios'}
                          >
                            <ChevronDown
                              className={cn(
                                'h-4 w-4 transition-transform',
                                isExpanded && 'rotate-180'
                              )}
                            />
                          </button>
                        </>
                      )}
                      {isMember && (
                        <>
                          {isOwnedByMember(routine) ? (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditRoutine(routine);
                                }}
                                className="text-text-muted hover:text-brand hover:bg-brand/10 inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
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
                                className="text-text-muted hover:bg-danger/10 hover:text-danger inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
                                aria-label={`Eliminar ${routine.name}`}
                                title="Eliminar"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          ) : null}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void onToggleExpandRoutine(routine.id);
                            }}
                            className={cn(
                              'text-text-muted hover:bg-surface-overlay hover:text-text inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
                              isExpanded && 'bg-surface-overlay text-text'
                            )}
                            aria-label={isExpanded ? 'Cerrar detalles' : 'Ver ejercicios'}
                            aria-expanded={isExpanded}
                            title={isExpanded ? 'Cerrar ejercicios' : 'Ejercicios'}
                          >
                            <ChevronDown
                              className={cn(
                                'h-4 w-4 transition-transform',
                                isExpanded && 'rotate-180'
                              )}
                            />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {isMember && (
                    <div className="mt-2.5">
                      <Button
                        type="button"
                        size="sm"
                        className="min-h-10 w-full text-sm font-semibold shadow-none sm:min-h-9 sm:w-auto sm:text-sm"
                        disabled={completedToday}
                        aria-label={workoutLabel}
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
                        'border-border/80 animate-in slide-in-from-top-2 mt-3 space-y-2.5 border-t pt-3 duration-200',
                        isStaff && 'md:hidden'
                      )}
                    >
                      {isStaff && exerciseSummary.preview ? (
                        <p className="text-small text-text-muted leading-snug">
                          {exerciseSummary.preview}
                        </p>
                      ) : null}
                      {isStaff && (
                        <div className="flex gap-1.5">
                          {onCloneRoutine ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              className="h-9 flex-1 text-xs"
                              disabled={cloning}
                              onClick={() => onCloneRoutine(routine)}
                            >
                              <Copy className="h-3.5 w-3.5" />
                              Duplicar
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="h-9 flex-1 text-xs"
                            onClick={() => onEditRoutine(routine)}
                          >
                            <Settings2 className="h-3.5 w-3.5" />
                            Configurar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="text-danger h-9 flex-1 text-xs"
                            onClick={() => onDeleteRoutine(routine)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Eliminar
                          </Button>
                        </div>
                      )}
                      {isMember && !isOwnedByMember(routine) ? (
                        <div className="space-y-0">
                          {routine.exercises?.map((exercise, index) => (
                            <div
                              key={exercise.routine_exercise_id}
                              className="border-border/60 flex items-start justify-between gap-2 border-b px-0.5 py-2 last:border-0"
                            >
                              <span className="text-text-muted w-5 shrink-0 pt-0.5 text-center text-xs font-semibold tabular-nums">
                                {index + 1}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-baseline justify-between gap-2">
                                  <h5 className="text-text truncate text-sm font-medium">
                                    {exercise.name}
                                  </h5>
                                  <p className="text-small text-text-muted shrink-0 tabular-nums">
                                    {exercise.sets}×{exercise.reps}
                                  </p>
                                </div>
                                <p className="text-small text-text-muted mt-0.5 capitalize">
                                  {exercise.muscle_group}
                                  {exercise.rest_seconds > 0 ? ` · ${exercise.rest_seconds}s` : ''}
                                </p>
                              </div>
                              {onSubstituteExercise ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  className="h-8 shrink-0 px-2 text-xs"
                                  onClick={() => onSubstituteExercise(routine.id, exercise)}
                                >
                                  Sustituir
                                </Button>
                              ) : null}
                            </div>
                          ))}
                          {(!routine.exercises || routine.exercises.length === 0) && (
                            <div className="border-border text-text-muted rounded-lg border border-dashed py-5 text-center text-xs italic">
                              Sin ejercicios en esta rutina
                            </div>
                          )}
                        </div>
                      ) : (
                        <StaffRoutineExercises
                          routine={routine}
                          onAddExercise={onAddExercise}
                          onInlineUpdate={onInlineUpdate}
                          onEditExercise={onEditExercise}
                          onDeleteExercise={onDeleteExercise}
                          onReorderExercise={onReorderExercise}
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
              className="border-border/70 bg-surface/80 sticky top-3 hidden max-h-[calc(100vh-7rem)] overflow-y-auto md:block"
            >
              {selectedStaffRoutine && selectedStaffSummary ? (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-text truncate text-sm font-semibold">
                        {selectedStaffRoutine.name}
                      </h3>
                      <p className="text-small text-text-muted mt-0.5">
                        {formatDifficulty(selectedStaffRoutine.difficulty)}
                        <span className="text-text-muted/50 mx-1">·</span>
                        {selectedStaffSummary.label}
                        {selectedStaffSummary.preview ? ` · ${selectedStaffSummary.preview}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-0.5">
                      {onCloneRoutine ? (
                        <button
                          type="button"
                          disabled={cloningRoutineId === selectedStaffRoutine.id}
                          onClick={() => onCloneRoutine(selectedStaffRoutine)}
                          className="text-text-muted hover:text-brand hover:bg-brand/10 inline-flex h-8 w-8 items-center justify-center rounded-lg disabled:opacity-50"
                          aria-label={`Duplicar ${selectedStaffRoutine.name}`}
                          title="Duplicar"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => onEditRoutine(selectedStaffRoutine)}
                        className="text-text-muted hover:text-brand hover:bg-brand/10 inline-flex h-8 w-8 items-center justify-center rounded-lg"
                        aria-label={`Configurar ${selectedStaffRoutine.name}`}
                        title="Configurar"
                      >
                        <Settings2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteRoutine(selectedStaffRoutine)}
                        className="text-text-muted hover:bg-danger/10 hover:text-danger inline-flex h-8 w-8 items-center justify-center rounded-lg"
                        aria-label={`Eliminar ${selectedStaffRoutine.name}`}
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <StaffRoutineExercises
                    routine={selectedStaffRoutine}
                    onAddExercise={onAddExercise}
                    onInlineUpdate={onInlineUpdate}
                    onEditExercise={onEditExercise}
                    onDeleteExercise={onDeleteExercise}
                    onReorderExercise={onReorderExercise}
                  />
                </div>
              ) : (
                <div className="flex min-h-[12rem] flex-col items-center justify-center px-4 py-8 text-center">
                  <Dumbbell className="text-brand/40 mb-2 h-8 w-8" aria-hidden />
                  <p className="text-text text-sm font-semibold">Selecciona una plantilla</p>
                  <p className="text-small text-text-muted mt-1">
                    Elige una rutina a la izquierda para editar ejercicios aquí.
                  </p>
                </div>
              )}
            </Card>
          ) : null}
        </div>
      )}

      {isStaff && routines.length <= 1 && (
        <button
          type="button"
          onClick={onCreateRoutine}
          className="text-brand border-border hover:bg-brand/5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed py-2.5 text-xs font-semibold transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          {routines.length === 0 ? 'Crear plantilla' : 'Crear otra plantilla'}
        </button>
      )}

      {memberFooterHint ? (
        <p className="text-small text-text-muted px-1 pt-1 text-center leading-snug">
          {memberFooterHint}
        </p>
      ) : null}
    </div>
  );
}
