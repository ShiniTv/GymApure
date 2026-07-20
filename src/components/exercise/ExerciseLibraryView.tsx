import { useState } from 'react';
import { BookOpen, Dumbbell, Video, ChevronRight, Edit, Trash2 } from 'lucide-react';
import type { Exercise } from '../../hooks/queries/useExercisesQuery';
import { Card, Badge, EmptyState, Button } from '../ui';
import { filterExercises, formatMuscleGroupLabel } from '../../lib/exerciseMuscleGroups';
import { ExerciseVideoPlayer } from './ExerciseVideoPlayer';
import { ExerciseExecutionSteps } from './ExerciseExecutionSteps';
import { cn } from '../../lib/utils';

interface ExerciseLibraryViewProps {
  exercises: Exercise[];
  readOnly?: boolean;
  search: string;
  /** Active muscle chip label (for empty copy). */
  muscleFilter?: string;
  videoOnly?: boolean;
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
  const canManage = Boolean(onEdit && onDelete);
  const hasVideo = Boolean(exercise.video_url);

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
        className="flex w-full touch-manipulation items-center gap-2 py-0.5 text-left sm:gap-2.5"
        aria-expanded={expanded}
        aria-label={expanded ? `Cerrar ${exercise.name}` : `Ver ${exercise.name}`}
      >
        <div className="bg-brand/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9">
          <Dumbbell className="text-brand h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[13px] leading-snug font-semibold text-zinc-900 dark:text-white">
            {exercise.name}
          </h3>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">{muscleLabel}</span>
            {hasVideo ? (
              <span
                className="text-brand inline-flex items-center gap-0.5 text-[10px] font-semibold"
                title="Tiene video"
              >
                <Video className="h-3 w-3" aria-hidden />
                Video
              </span>
            ) : null}
            {!readOnly && exercise.is_system && !exercise.owner_trainer_id ? (
              <Badge variant="accent" className="text-[9px]">
                Sistema
              </Badge>
            ) : null}
            {!readOnly && exercise.forked_from_id ? (
              <Badge variant="warning" className="text-[9px]">
                Personalizado
              </Badge>
            ) : null}
          </div>
        </div>
        <ChevronRight
          className={cn(
            'h-4 w-4 shrink-0 text-zinc-400 transition-transform dark:text-zinc-500',
            expanded && 'rotate-90'
          )}
          aria-hidden
        />
      </button>

      {expanded ? (
        <div className="animate-in slide-in-from-top-2 mt-2 space-y-3 border-t border-zinc-100/80 pt-2.5 duration-200 dark:border-zinc-800/80">
          {exercise.description ? (
            <p className="text-xs leading-snug text-zinc-500 dark:text-zinc-400">
              {exercise.description}
            </p>
          ) : null}

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
            {hasVideo ? (
              <div className="space-y-2">
                <h4 className="label-caps flex items-center gap-2">
                  <Video className="h-3 w-3" /> Video
                </h4>
                <ExerciseVideoPlayer
                  url={exercise.video_url!}
                  posterUrl={exercise.video_poster_url}
                  title={`${exercise.name} — video tutorial`}
                />
              </div>
            ) : null}
            {exercise.execution ? (
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
            ) : null}
            {!hasVideo && !exercise.execution ? (
              <p className="text-xs text-zinc-400 italic dark:text-zinc-500">
                Sin video ni guía aún.
              </p>
            ) : null}
          </div>

          {!readOnly && canManage ? (
            <div className="flex items-center justify-end gap-1 pt-0.5">
              <button
                type="button"
                onClick={() => onEdit!(exercise)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                aria-label={`Editar ${exercise.name}`}
                title="Editar"
              >
                <Edit className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => onDelete!(exercise)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-400"
                aria-label={`Eliminar ${exercise.name}`}
                title="Eliminar"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

export function ExerciseLibraryView({
  exercises,
  readOnly = false,
  search,
  muscleFilter = '',
  videoOnly = false,
  skipClientFilter = false,
  onEdit,
  onDelete,
  onCreate,
  onClearFilters,
}: ExerciseLibraryViewProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const filteredExercises = skipClientFilter
    ? exercises
    : filterExercises(exercises, { search, muscleGroup: muscleFilter }).filter((e) =>
        videoOnly ? Boolean(e.video_url) : true
      );
  const hasActiveFilters = Boolean(search.trim() || muscleFilter || videoOnly);

  if (filteredExercises.length === 0) {
    const emptyTitle = hasActiveFilters ? 'Sin resultados' : 'Sin ejercicios';
    const emptyDescription =
      videoOnly && !search.trim() && !muscleFilter
        ? 'Ningún ejercicio tiene video todavía.'
        : search.trim() && muscleFilter
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
          'mx-auto w-full max-w-md',
          readOnly && 'flex min-h-[min(40vh,22rem)] flex-col justify-center'
        )}
      >
        <EmptyState
          compact
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
              <Button size="sm" onClick={onCreate}>
                Nuevo ejercicio
              </Button>
            ) : undefined
          }
          className={readOnly ? 'border-0 bg-transparent shadow-none' : undefined}
        />
      </div>
    );
  }

  return (
    <div className={cn(readOnly ? 'mx-auto w-full max-w-lg space-y-1.5' : 'space-y-1.5')}>
      <div
        className={cn(
          'grid grid-cols-1 gap-1.5',
          !readOnly && 'md:grid-cols-2 md:gap-2 xl:grid-cols-3 xl:gap-2.5'
        )}
      >
        {filteredExercises.map((exercise) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            expanded={expandedId === exercise.id}
            readOnly={readOnly}
            onToggle={() => setExpandedId(expandedId === exercise.id ? null : exercise.id)}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
      {readOnly ? (
        <p className="px-1 pt-1 text-center text-[11px] leading-snug text-zinc-400 dark:text-zinc-500">
          Toca un ejercicio para ver video o guía de ejecución.
        </p>
      ) : (
        <p className="px-0.5 pt-1 text-[11px] text-zinc-400 md:hidden dark:text-zinc-500">
          Toca una fila para ver detalles
        </p>
      )}
    </div>
  );
}
