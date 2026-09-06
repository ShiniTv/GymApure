import { BookOpen, Pencil, Trash2, Video } from 'lucide-react';
import { Badge, Button, Modal, Spinner } from '../ui';
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

interface ExerciseDetailModalProps {
  exerciseId: number | null;
  readOnly?: boolean;
  onClose: () => void;
  onEdit?: (exercise: Exercise) => void;
  onDelete?: (exercise: Exercise) => void;
}

export function ExerciseDetailModal({
  exerciseId,
  readOnly = false,
  onClose,
  onEdit,
  onDelete,
}: ExerciseDetailModalProps) {
  const { data: detail, isPending } = useExerciseDetailQuery(exerciseId);
  const open = exerciseId != null;
  const badge = detail ? exerciseCatalogBadge(detail, readOnly) : null;
  const hasVideo = detail ? exerciseHasVideo(detail) : false;
  const hasBothMedia = Boolean(detail && hasVideo && detail.execution);
  const canManage = Boolean(!readOnly && onEdit && onDelete && detail);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={detail?.name ?? 'Detalle del ejercicio'}
      maxWidth="3xl"
      scrollable
      initialFocus="dialog"
    >
      {isPending ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : !detail ? (
        <p className="text-text-muted text-sm">No se pudo cargar el detalle.</p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {badge ? <Badge variant={badge.variant}>{badge.label}</Badge> : null}
              <span className="text-text-secondary text-sm">
                {formatMuscleGroupLabel(detail.muscle_group)}
              </span>
            </div>
            {canManage ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    onEdit?.(detail);
                    onClose();
                  }}
                >
                  <Pencil className="h-4 w-4" />
                  Editar
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="text-danger hover:bg-danger/10"
                  onClick={() => {
                    onDelete?.(detail);
                    onClose();
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  {detail.is_system && detail.owner_trainer_id == null ? 'Ocultar' : 'Eliminar'}
                </Button>
              </div>
            ) : null}
          </div>

          {detail.description ? (
            <p className="text-text-secondary text-sm leading-relaxed">{detail.description}</p>
          ) : null}

          <div
            className={cn(
              'grid grid-cols-1 gap-4',
              hasBothMedia && 'md:grid-cols-2 md:items-start'
            )}
          >
            {hasVideo && detail.video_url ? (
              <div className="min-w-0 space-y-2">
                <h4 className="label-caps flex items-center gap-2">
                  <Video className="h-3 w-3" /> Video
                </h4>
                <ExerciseVideoPlayer
                  url={detail.video_url}
                  posterUrl={detail.video_poster_url}
                  title={`${detail.name} — video tutorial`}
                />
              </div>
            ) : null}
            {detail.execution ? (
              <div className="min-w-0 space-y-2">
                <h4 className="label-caps flex items-center gap-2">
                  <BookOpen className="h-3 w-3" /> Ejecución
                </h4>
                <ExerciseExecutionSteps
                  execution={detail.execution}
                  title="Guía de ejecución"
                  showTitle={false}
                  compact
                />
              </div>
            ) : null}
          </div>

          {!hasVideo && !detail.execution && !detail.description ? (
            <p className="text-text-muted text-sm italic">Sin video ni guía aún.</p>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
