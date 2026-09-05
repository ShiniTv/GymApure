import { useNavigate } from 'react-router';
import { Dumbbell, Play } from 'lucide-react';
import { Button, Card, EmptyState, Skeleton } from '../ui';
import {
  useRoutineTemplatesQuery,
  useSelfAssignTemplateMutation,
} from '../../hooks/queries/useMemberAgencyQuery';
import { useToastOptional } from '../../context/ToastContext';
import { buildExerciseSummary } from '../../lib/routineDisplay';
import { formatDifficulty } from '../../lib/utils';

interface MemberTemplatesSectionProps {
  onAssigned?: (routineId: number) => void;
  className?: string;
}

export function MemberTemplatesSection({ onAssigned, className }: MemberTemplatesSectionProps) {
  const navigate = useNavigate();
  const toast = useToastOptional();
  const { data: templates = [], isLoading } = useRoutineTemplatesQuery(true);
  const selfAssign = useSelfAssignTemplateMutation();

  if (isLoading) {
    return (
      <Card padding="md" rounded="xl" className={className}>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-3 h-16 w-full" />
      </Card>
    );
  }

  if (templates.length === 0) {
    return (
      <EmptyState
        framed={false}
        variant="motivational"
        icon={Dumbbell}
        title="Plantillas próximamente"
        description="Tu entrenador puede habilitar rutinas para que empieces por tu cuenta."
        className={className}
      />
    );
  }

  return (
    <Card padding="md" rounded="xl" className={className}>
      <h3 className="text-text text-sm font-bold">Plantillas para empezar</h3>
      <p className="text-text-secondary text-small mt-1 leading-relaxed">
        Elige una plantilla; tu entrenador puede ajustarla después.
      </p>
      <ul className="mt-3 space-y-2">
        {templates.slice(0, 6).map((template) => {
          const summary = buildExerciseSummary({
            count: template.exercise_count,
            preview: template.exercise_preview,
          });
          return (
            <li
              key={template.id}
              className="border-border/70 bg-surface-raised flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <p className="text-text truncate text-sm font-semibold">{template.name}</p>
                <p className="text-text-secondary text-small mt-0.5 truncate">
                  {formatDifficulty(template.difficulty)} · {summary.preview}
                </p>
                {template.trainer_name ? (
                  <p className="text-text-muted text-small mt-0.5">{template.trainer_name}</p>
                ) : null}
              </div>
              <Button
                size="sm"
                className="shrink-0"
                disabled={selfAssign.isPending}
                onClick={() => {
                  selfAssign.mutate(template.id, {
                    onSuccess: (data) => {
                      toast?.success(`Listo: ${data.routine_name}`);
                      onAssigned?.(data.routine_id);
                      navigate(`/workout/${data.routine_id}`);
                    },
                    onError: (err) => {
                      toast?.error(
                        err instanceof Error ? err.message : 'No se pudo asignar la plantilla'
                      );
                    },
                  });
                }}
              >
                <Play className="h-3.5 w-3.5" />
                Empezar
              </Button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
