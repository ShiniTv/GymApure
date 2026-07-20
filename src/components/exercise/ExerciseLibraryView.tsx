import { useState } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { BookOpen, Dumbbell, Video, ChevronRight, Edit, Trash2 } from 'lucide-react';
import type { Exercise } from '../../hooks/queries/useExercisesQuery';
import { Card, Badge, EmptyState, Button } from '../ui';
import { filterExercises, formatMuscleGroupLabel } from '../../lib/exerciseMuscleGroups';
import { ExerciseVideoPlayer } from './ExerciseVideoPlayer';
import { ExerciseExecutionSteps } from './ExerciseExecutionSteps';
import { cn } from '../../lib/utils';

const VIRTUOSO_THRESHOLD = 24;

interface ExerciseLibraryViewProps {
  exercises: Exercise[];
  readOnly?: boolean;
  search: string;
  /** Active muscle chip label (for empty copy). */
  muscleFilter?: string;
  /** When true, exercises are already filtered server-side. */
  skipClientFilter?: boolean;
  onEdit?: (exercise: Exercise) => void;
  onDelete?: (exercise: Exercise) => void;
  onCreate?: () => void;
  onClearFilters?: () => void;
}

function ExerciseCard({
  exercise,
  expanded,
  readOnly,
  onToggle,
  onEdit,
  onDelete,
}: {
  exercise: Exercise;
  expanded: boolean;
  readOnly: boolean;
  onToggle: () => void;
  onEdit?: (exercise: Exercise) => void;
  onDelete?: (exercise: Exercise) => void;
}) {
  const muscleLabel = formatMuscleGroupLabel(exercise.muscle_group);

  if (readOnly) {
    return (
      <Card
        padding="sm"
        rounded="xl"
        className={cn(
          'border-zinc-200/70 bg-white/80 transition-colors dark:border-zinc-800/80 dark:bg-zinc-900/50',
          expanded && 'ring-brand/20 ring-2'
        )}
      >
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full touch-manipulation items-center gap-2.5 text-left"
          aria-expanded={expanded}
          aria-label={expanded ? `Cerrar ${exercise.name}` : `Ver ${exercise.name}`}
        >
          <Dumbbell className="text-brand h-4 w-4 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[13px] leading-snug font-semibold text-zinc-900 dark:text-white">
              {exercise.name}
            </h3>
            <p className="mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-500">{muscleLabel}</p>
          </div>
          <ChevronRight
            className={cn(
              'h-4 w-4 shrink-0 text-zinc-400 transition-transform dark:text-zinc-500',
              expanded && 'rotate-90'
            )}
            aria-hidden
          />
        </button>

        {expanded && (
          <div className="animate-in slide-in-from-top-2 mt-2.5 space-y-3 border-t border-zinc-100/80 pt-2.5 duration-200 dark:border-zinc-800/80">
            {exercise.description ? (
              <p className="text-xs leading-snug text-zinc-500 dark:text-zinc-400">
                {exercise.description}
              </p>
            ) : null}
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {exercise.video_url && (
                <div className="space-y-2">
                  <h4 className="label-caps flex items-center gap-2">
                    <Video className="h-3 w-3" /> Video
                  </h4>
                  <ExerciseVideoPlayer
                    url={exercise.video_url}
                    posterUrl={exercise.video_poster_url}
                    title={`${exercise.name} — video tutorial`}
                  />
                </div>
              )}
              {exercise.execution && (
                <div className="space-y-2">
                  <h4 className="label-caps flex items-center gap-2">
                    <BookOpen className="h-3 w-3" /> Ejecución
                  </h4>
                  <ExerciseExecutionSteps
                    execution={exercise.execution}
                    title="Guía de ejecución"
                    showTitle={false}
                  />
                </div>
              )}
              {!exercise.video_url && !exercise.execution && (
                <p className="text-xs text-zinc-400 italic dark:text-zinc-500">
                  Sin video ni guía aún.
                </p>
              )}
            </div>
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card
      padding="sm"
      rounded="xl"
      className={cn(
        'group border-zinc-200/70 bg-white/80 transition-colors dark:border-zinc-800/80 dark:bg-zinc-900/50',
        expanded && 'ring-brand/20 ring-2'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          <div className="bg-brand/10 shrink-0 rounded-lg p-2">
            <Dumbbell className="text-brand dark:text-brand h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm leading-tight font-bold text-zinc-900 sm:text-base dark:text-white">
              {exercise.name}
            </h3>
            <div className="mt-1 flex flex-wrap gap-1">
              <Badge variant="default" className="text-[10px]">
                {muscleLabel}
              </Badge>
              {exercise.is_system && !exercise.owner_trainer_id && (
                <Badge variant="accent" className="text-[10px]">
                  Sistema
                </Badge>
              )}
              {exercise.forked_from_id && (
                <Badge variant="warning" className="text-[10px]">
                  Personalizado
                </Badge>
              )}
            </div>
          </div>
        </div>
        {onEdit && onDelete && (
          <div className="flex shrink-0 gap-0.5">
            <button
              type="button"
              onClick={() => onEdit(exercise)}
              className="hover:text-brand hover:bg-brand/10 inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 transition-all dark:text-zinc-300"
              aria-label={`Editar ${exercise.name}`}
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(exercise)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 transition-all hover:bg-red-500/10 hover:text-red-500 dark:text-zinc-300"
              aria-label={`Eliminar ${exercise.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {exercise.description && (
        <p
          className={`mt-2 text-xs leading-snug text-zinc-500 dark:text-zinc-400 ${expanded ? '' : 'line-clamp-2'}`}
        >
          {exercise.description}
        </p>
      )}

      {expanded && (
        <div className="animate-in slide-in-from-top-2 mt-3 space-y-3 border-t border-zinc-100 pt-3 duration-200 dark:border-zinc-800">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {exercise.video_url && (
              <div className="space-y-3">
                <h4 className="label-caps flex items-center gap-2">
                  <Video className="h-3 w-3" /> Video demostrativo
                </h4>
                <ExerciseVideoPlayer
                  url={exercise.video_url}
                  posterUrl={exercise.video_poster_url}
                  title={`${exercise.name} — video tutorial`}
                />
              </div>
            )}

            {exercise.execution && (
              <div className="space-y-3">
                <h4 className="label-caps flex items-center gap-2">
                  <BookOpen className="h-3 w-3" /> Guía de ejecución
                </h4>
                <ExerciseExecutionSteps
                  execution={exercise.execution}
                  title="Guía de ejecución"
                  showTitle={false}
                />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={onToggle}
          className={`inline-flex items-center justify-center gap-1 rounded-lg text-xs font-semibold transition-all ${
            expanded
              ? 'h-9 bg-zinc-900 px-3 text-white dark:bg-white dark:text-zinc-900'
              : 'h-9 w-9 bg-zinc-100 text-zinc-500 hover:text-zinc-900 sm:w-auto sm:px-3 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:text-white'
          }`}
          aria-label={expanded ? 'Cerrar detalles' : 'Ver detalles'}
          title={expanded ? 'Cerrar' : 'Ver detalles'}
        >
          <ChevronRight className={`h-4 w-4 sm:hidden ${expanded ? 'rotate-90' : ''}`} />
          <span className="hidden sm:inline">{expanded ? 'Cerrar' : 'Ver detalles'}</span>
        </button>
      </div>
    </Card>
  );
}

export function ExerciseLibraryView({
  exercises,
  readOnly = false,
  search,
  muscleFilter = '',
  skipClientFilter = false,
  onEdit,
  onDelete,
  onCreate,
  onClearFilters,
}: ExerciseLibraryViewProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const filteredExercises = skipClientFilter
    ? exercises
    : filterExercises(exercises, { search, muscleGroup: muscleFilter });
  const hasActiveFilters = Boolean(search.trim() || muscleFilter);

  if (filteredExercises.length === 0) {
    const emptyTitle = hasActiveFilters ? 'Sin resultados' : 'Sin ejercicios';
    const emptyDescription =
      search.trim() && muscleFilter
        ? `Nada en ${muscleFilter} para «${search.trim()}». Prueba otro filtro.`
        : search.trim()
          ? `No hay ejercicios que coincidan con «${search.trim()}».`
          : muscleFilter
            ? `No hay ejercicios de ${muscleFilter} todavía.`
            : readOnly
              ? 'Tu entrenador aún no ha publicado ejercicios en la biblioteca.'
              : 'Agrega movimientos al catálogo para usarlos en tus rutinas.';

    return (
      <div
        className={cn(
          readOnly && 'mx-auto flex min-h-[min(40vh,22rem)] w-full max-w-sm flex-col justify-center'
        )}
      >
        <EmptyState
          variant={readOnly ? 'motivational' : 'default'}
          icon={Dumbbell}
          title={emptyTitle}
          description={emptyDescription}
          action={
            hasActiveFilters && onClearFilters ? (
              <Button size="sm" variant="secondary" onClick={onClearFilters}>
                Ver todos
              </Button>
            ) : !readOnly && !hasActiveFilters && onCreate ? (
              <Button onClick={onCreate}>Nuevo ejercicio</Button>
            ) : undefined
          }
          className={readOnly ? 'border-0 bg-transparent shadow-none' : undefined}
        />
      </div>
    );
  }

  const renderCard = (exercise: Exercise) => (
    <ExerciseCard
      exercise={exercise}
      expanded={expandedId === exercise.id}
      readOnly={readOnly}
      onToggle={() => setExpandedId(expandedId === exercise.id ? null : exercise.id)}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );

  const list =
    filteredExercises.length >= VIRTUOSO_THRESHOLD ? (
      <Virtuoso
        style={{ height: 'min(70vh, 720px)' }}
        data={filteredExercises}
        itemContent={(_index, exercise) => (
          <div className={readOnly ? 'pb-2' : 'pb-2.5'}>{renderCard(exercise)}</div>
        )}
      />
    ) : (
      <div
        className={cn(
          'grid grid-cols-1',
          readOnly ? 'gap-2' : 'gap-2.5 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3'
        )}
      >
        {filteredExercises.map((exercise) => (
          <div key={exercise.id}>{renderCard(exercise)}</div>
        ))}
      </div>
    );

  return (
    <div className={cn(readOnly && 'mx-auto w-full max-w-lg space-y-2')}>
      {list}
      {readOnly ? (
        <p className="px-1 pt-1 text-center text-[11px] leading-snug text-zinc-400 dark:text-zinc-500">
          Toca un ejercicio para ver video o guía de ejecución.
        </p>
      ) : null}
    </div>
  );
}
