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
  listRow = false,
}: {
  exercise: Exercise;
  expanded: boolean;
  readOnly: boolean;
  onToggle: () => void;
  onEdit?: (exercise: Exercise) => void;
  onDelete?: (exercise: Exercise) => void;
  /** Borderless row inside a divide-y list shell. */
  listRow?: boolean;
}) {
  const muscleLabel = formatMuscleGroupLabel(exercise.muscle_group);
  const canManage = Boolean(onEdit && onDelete);
  const hasVideo = Boolean(exercise.video_url);
  const hasBothMedia = hasVideo && Boolean(exercise.execution);

  const body = (
    <>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full touch-manipulation items-center gap-2.5 px-3 py-2.5 text-left"
        aria-expanded={expanded}
        aria-label={expanded ? `Cerrar ${exercise.name}` : `Ver ${exercise.name}`}
      >
        <div className="bg-brand/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
          <Dumbbell className="text-brand h-3.5 w-3.5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-text truncate text-[13px] leading-snug font-semibold">
            {exercise.name}
          </h3>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span className="text-text-muted text-[11px]">{muscleLabel}</span>
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
            'text-text-muted h-4 w-4 shrink-0 transition-transform',
            expanded && 'rotate-90'
          )}
          aria-hidden
        />
      </button>

      {expanded ? (
        <div className="border-border/60 animate-in slide-in-from-top-2 space-y-3 border-t px-3 pt-2.5 pb-3 duration-200">
          {exercise.description ? (
            <p className="text-text-secondary text-xs leading-snug">{exercise.description}</p>
          ) : null}

          <div
            className={cn(
              'grid grid-cols-1 gap-3',
              hasBothMedia && 'md:grid-cols-2 md:items-start md:gap-4'
            )}
          >
            {hasVideo ? (
              <div className="min-w-0 space-y-2">
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
              <div className="min-w-0 space-y-2">
                <h4 className="label-caps flex items-center gap-2">
                  <BookOpen className="h-3 w-3" /> Ejecución
                </h4>
                <ExerciseExecutionSteps
                  execution={exercise.execution}
                  title="Guía de ejecución"
                  showTitle={false}
                  compact
                />
              </div>
            ) : null}
            {!hasVideo && !exercise.execution ? (
              <p className="text-text-muted text-xs italic">Sin video ni guía aún.</p>
            ) : null}
          </div>

          {!readOnly && canManage ? (
            <div className="flex items-center justify-end gap-1 pt-0.5">
              <button
                type="button"
                onClick={() => onEdit!(exercise)}
                className="text-text-muted hover:bg-surface-overlay hover:text-text inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                aria-label={`Editar ${exercise.name}`}
                title="Editar"
              >
                <Edit className="h-3.5 w-3.5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => onDelete!(exercise)}
                className="text-text-muted inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-red-500/10 hover:text-red-500"
                aria-label={`Eliminar ${exercise.name}`}
                title="Eliminar"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );

  if (listRow) {
    return <div className="bg-transparent">{body}</div>;
  }

  return (
    <Card
      padding="none"
      rounded="xl"
      className={cn(
        'border-border/80 bg-surface h-fit overflow-hidden border transition-colors',
        expanded && 'ring-brand/25 ring-1'
      )}
    >
      {body}
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
      <div className="mx-auto w-full max-w-md">
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
    <>
      {/* Mobile: lista densa tipo herramienta */}
      <div className="border-border/80 bg-surface divide-border/60 divide-y overflow-hidden rounded-[var(--radius-card)] border md:hidden">
        {filteredExercises.map((exercise) => {
          const expanded = expandedId === exercise.id;
          return (
            <div key={exercise.id} className={cn(expanded && 'bg-surface-overlay/30')}>
              <ExerciseCard
                exercise={exercise}
                expanded={expanded}
                readOnly={readOnly}
                onToggle={() => setExpandedId(expanded ? null : exercise.id)}
                onEdit={onEdit}
                onDelete={onDelete}
                listRow
              />
            </div>
          );
        })}
      </div>

      {/* Desktop: grid de cards */}
      <div className="hidden grid-cols-1 items-start gap-2 md:grid md:grid-cols-2 md:gap-3 xl:grid-cols-4">
        {filteredExercises.map((exercise) => {
          const expanded = expandedId === exercise.id;
          return (
            <div key={exercise.id} className={cn(expanded && 'md:col-span-2 xl:col-span-4')}>
              <ExerciseCard
                exercise={exercise}
                expanded={expanded}
                readOnly={readOnly}
                onToggle={() => setExpandedId(expanded ? null : exercise.id)}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            </div>
          );
        })}
      </div>
    </>
  );
}
