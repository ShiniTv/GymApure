import { Dumbbell, Video } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Badge } from '../ui';
import { formatMuscleGroupLabel } from '../../lib/exerciseMuscleGroups';
import { exerciseHasVideo, type Exercise } from '../../hooks/queries/useExercisesQuery';

type BadgeVariant = 'default' | 'warning' | 'accent';

export function exerciseCatalogBadge(
  exercise: Exercise,
  readOnly: boolean
): { label: string; variant: BadgeVariant } | null {
  if (exerciseHasVideo(exercise)) return { label: 'Video', variant: 'accent' };
  if (readOnly) return null;
  if (exercise.forked_from_id) return { label: 'Personalizado', variant: 'warning' };
  if (exercise.is_system && exercise.owner_trainer_id == null) {
    return { label: 'Sistema', variant: 'default' };
  }
  return null;
}

export function ExerciseListCard({
  exercise,
  onOpen,
  hideMuscle = false,
  readOnly = false,
  isSelected = false,
}: {
  exercise: Exercise;
  onOpen: (id: number) => void;
  hideMuscle?: boolean;
  readOnly?: boolean;
  isSelected?: boolean;
}) {
  const muscleLabel = formatMuscleGroupLabel(exercise.muscle_group);
  const hasVideo = exerciseHasVideo(exercise);
  const badge = exerciseCatalogBadge(exercise, readOnly);
  const TileIcon = hasVideo ? Video : Dumbbell;

  return (
    <button
      type="button"
      onClick={() => onOpen(exercise.id)}
      aria-label={`Ver ${exercise.name}`}
      className={cn(
        'group flex w-full min-w-0 items-center gap-2.5 rounded-xl border p-2.5 text-left transition-all duration-150 sm:gap-3 sm:p-3',
        isSelected
          ? 'border-brand/70 bg-brand/5 ring-brand/50 shadow-[0_0_15px_rgba(235,94,40,0.12)] ring-1'
          : 'border-border/80 bg-surface hover:border-border hover:bg-surface-raised'
      )}
    >
      <div
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors sm:h-12 sm:w-12',
          isSelected
            ? 'bg-brand/20 text-brand'
            : hasVideo
              ? 'bg-brand/15 text-brand'
              : 'bg-surface-overlay text-text-muted'
        )}
      >
        <TileIcon
          className={cn(
            'h-4 w-4 sm:h-5 sm:w-5',
            isSelected || hasVideo ? 'text-brand' : 'text-text-muted'
          )}
          aria-hidden
        />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'truncate text-sm font-semibold sm:text-sm',
            isSelected ? 'text-brand' : 'text-text'
          )}
        >
          {exercise.name}
        </p>
        {!hideMuscle ? (
          <p className="text-text-muted text-small mt-0.5 truncate sm:text-xs">{muscleLabel}</p>
        ) : null}
      </div>
      {badge ? (
        <Badge variant={badge.variant} className="text-small shrink-0">
          {badge.label}
        </Badge>
      ) : null}
    </button>
  );
}
