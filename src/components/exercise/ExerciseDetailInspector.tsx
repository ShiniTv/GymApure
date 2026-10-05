import { BookOpen, Dumbbell, Pencil, Trash2, Video, Info, Sparkles } from 'lucide-react';
import { Badge, Button, Card, Skeleton } from '../ui';
import { formatMuscleGroupLabel } from '../../lib/exerciseMuscleGroups';
import {
  exerciseHasVideo,
  useExerciseDetailQuery,
  type Exercise,
} from '../../hooks/queries/useExercisesQuery';
import { ExerciseVideoPlayer } from './ExerciseVideoPlayer';
import { ExerciseExecutionSteps } from './ExerciseExecutionSteps';
import { exerciseCatalogBadge } from './ExerciseListCard';
import { cn } from '../../lib/utils';

export interface ExerciseDetailInspectorProps {
  exerciseId: number | null;
  readOnly?: boolean;
  onEdit?: (exercise: Exercise) => void;
  onDelete?: (exercise: Exercise) => void;
  onClose?: () => void;
  className?: string;
}

export function ExerciseDetailInspector({
  exerciseId,
  readOnly = false,
  onEdit,
  onDelete,
  onClose,
  className,
}: ExerciseDetailInspectorProps) {
  const { data: detail, isPending } = useExerciseDetailQuery(exerciseId);
  const badge = detail ? exerciseCatalogBadge(detail, readOnly) : null;
  const hasVideo = detail ? exerciseHasVideo(detail) : false;
  const canManage = Boolean(!readOnly && onEdit && onDelete && detail);

  if (exerciseId == null) {
    return (
      <Card
        padding="lg"
        rounded="xl"
        className={cn(
          'border-border/70 bg-surface/60 flex min-h-[360px] flex-col items-center justify-center text-center backdrop-blur-sm',
          className
        )}
      >
        <div className="bg-surface-overlay text-text-muted mb-3 flex h-14 w-14 items-center justify-center rounded-2xl shadow-inner">
          <Dumbbell className="h-7 w-7 opacity-75" />
        </div>
        <h3 className="text-text text-base font-semibold">Selecciona un ejercicio</h3>
        <p className="text-text-muted mt-1.5 max-w-xs text-xs leading-relaxed">
          Haz clic en cualquier movimiento de la lista para inspeccionar su técnica paso a paso,
          biomecánica y video demostrativo.
        </p>
      </Card>
    );
  }

  if (isPending) {
    return (
      <Card
        padding="md"
        rounded="xl"
        className={cn('border-border/80 bg-surface space-y-4', className)}
      >
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-40 rounded" />
            <Skeleton className="h-3.5 w-24 rounded" />
          </div>
        </div>
        <Skeleton className="h-44 w-full rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-3/4 rounded" />
        </div>
      </Card>
    );
  }

  if (!detail) {
    return (
      <Card
        padding="md"
        rounded="xl"
        className={cn('border-border/80 bg-surface text-center', className)}
      >
        <p className="text-text-muted text-sm">No se pudo cargar la información del ejercicio.</p>
        {onClose && (
          <Button size="sm" variant="secondary" onClick={onClose} className="mt-3">
            Cerrar inspector
          </Button>
        )}
      </Card>
    );
  }

  const muscleLabel = formatMuscleGroupLabel(detail.muscle_group);

  return (
    <Card
      padding="none"
      rounded="xl"
      className={cn(
        'border-border/90 bg-surface shadow-card flex flex-col overflow-hidden',
        className
      )}
    >
      {/* Header bar */}
      <div className="border-border/70 bg-surface-raised/40 border-b p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className={cn(
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors',
                hasVideo ? 'bg-brand/15 text-brand' : 'bg-surface-overlay text-text-muted'
              )}
            >
              {hasVideo ? <Video className="h-6 w-6" /> : <Dumbbell className="h-6 w-6" />}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-text-muted text-micro font-bold tracking-wider uppercase">
                  {muscleLabel}
                </span>
                {badge ? (
                  <Badge variant={badge.variant} className="text-micro">
                    {badge.label}
                  </Badge>
                ) : null}
              </div>
              <h2 className="text-text mt-0.5 truncate text-lg font-bold sm:text-xl">
                {detail.name}
              </h2>
            </div>
          </div>

          {canManage && (
            <div className="flex shrink-0 items-center gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                className="gap-1.5 text-xs font-semibold"
                onClick={() => onEdit?.(detail)}
                title="Editar este ejercicio"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Editar</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="hover:bg-danger/10 text-danger gap-1.5 text-xs font-semibold"
                onClick={() => onDelete?.(detail)}
                title={
                  detail.is_system && detail.owner_trainer_id == null
                    ? 'Ocultar ejercicio'
                    : 'Eliminar ejercicio'
                }
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {detail.is_system && detail.owner_trainer_id == null ? 'Ocultar' : 'Borrar'}
                </span>
              </Button>
            </div>
          )}
        </div>

        {/* Quick pill stats */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="border-border/60 bg-surface-overlay/60 text-text-secondary flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium">
            <span className="text-text-muted">Grupo:</span>
            <span className="text-text font-semibold">{muscleLabel}</span>
          </div>
          <div className="border-border/60 bg-surface-overlay/60 text-text-secondary flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium">
            <span className="text-text-muted">Video:</span>
            <span className={cn('font-semibold', hasVideo ? 'text-brand' : 'text-text-muted')}>
              {hasVideo ? 'Disponible' : 'Sin video'}
            </span>
          </div>
          <div className="border-border/60 bg-surface-overlay/60 text-text-secondary flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium">
            <span className="text-text-muted">Origen:</span>
            <span className="text-text font-semibold">
              {detail.owner_trainer_id ? 'Entrenador' : 'Catálogo base'}
            </span>
          </div>
        </div>
      </div>

      {/* Body content */}
      <div className="space-y-5 p-4 sm:p-5">
        {/* Description / Biomechanics */}
        {detail.description && (
          <div className="border-border/60 bg-surface-overlay/30 space-y-1.5 rounded-xl border p-3.5">
            <h4 className="text-text-secondary flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase">
              <Info className="text-brand h-3.5 w-3.5" /> Biomecánica y Objetivos
            </h4>
            <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-line">
              {detail.description}
            </p>
          </div>
        )}

        {/* Video Player */}
        {hasVideo && detail.video_url && (
          <div className="space-y-2">
            <h4 className="text-text-secondary flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase">
              <Video className="text-brand h-3.5 w-3.5" /> Demostración en Video
            </h4>
            <div className="border-border/80 overflow-hidden rounded-xl border shadow-md">
              <ExerciseVideoPlayer
                url={detail.video_url}
                posterUrl={detail.video_poster_url}
                title={`${detail.name} — video tutorial`}
              />
            </div>
          </div>
        )}

        {/* Execution Steps */}
        {detail.execution ? (
          <div className="space-y-2">
            <h4 className="text-text-secondary flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase">
              <BookOpen className="text-brand h-3.5 w-3.5" /> Guía de Ejecución
            </h4>
            <div className="border-border/60 bg-surface-overlay/20 rounded-xl border p-3">
              <ExerciseExecutionSteps
                execution={detail.execution}
                title="Paso a paso"
                showTitle={false}
                compact
              />
            </div>
          </div>
        ) : !detail.description && !hasVideo ? (
          <div className="py-6 text-center">
            <Sparkles className="text-text-muted/60 mx-auto mb-2 h-8 w-8" />
            <p className="text-text-muted text-sm">
              Este ejercicio aún no tiene guía ni video registrados.
            </p>
            {canManage && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onEdit?.(detail)}
                className="mt-3"
              >
                Completar técnica y video
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
