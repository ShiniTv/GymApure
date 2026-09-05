import { Link } from 'react-router';
import { Trophy, History, ChevronRight } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { Badge, Button, Card, EmptyState, Spinner } from '../../components/ui';
import { useMemberProgressQuery } from '../../hooks/queries/useCoachNotesQuery';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, parseJsonResponse } from '../../lib/api';
import type { ExerciseRecordSummary } from '../../lib/exerciseRecords';
import { cn } from '../../lib/utils';
import { typography } from '../../lib/typography';

const WorkoutHistoryCharts = lazy(() => import('../../components/workout/WorkoutHistoryCharts'));

interface MemberProgressPanelProps {
  memberId: number;
}

function adherenceTone(percent: number): string {
  if (percent >= 75) return 'text-success';
  if (percent >= 50) return 'text-warning';
  return 'text-danger';
}

export function MemberProgressPanel({ memberId }: MemberProgressPanelProps) {
  const {
    data: progress,
    isPending: progressLoading,
    isError: progressError,
    refetch: refetchProgress,
  } = useMemberProgressQuery(memberId);

  const {
    data: records,
    isPending: recordsLoading,
    isError: recordsError,
  } = useQuery({
    queryKey: ['exercise-records-summary', memberId],
    queryFn: async () => {
      const res = await apiFetch(`/api/users/${memberId}/exercise-records`);
      return parseJsonResponse<ExerciseRecordSummary[]>(res);
    },
    staleTime: 60_000,
  });

  const topRecords = (records ?? []).slice(0, 5);
  const loading = progressLoading || recordsLoading;

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Spinner />
      </div>
    );
  }

  if (progressError && recordsError) {
    return (
      <EmptyState
        icon={Trophy}
        title="No se pudo cargar el progreso"
        description="Revisa tu conexión e inténtalo de nuevo."
        action={
          <Button size="sm" variant="secondary" onClick={() => void refetchProgress()}>
            Reintentar
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center">
          <p className={cn(typography.statLabel)}>Semana</p>
          <p className={cn(typography.statValueSm, 'mt-0.5')}>
            {progress ? `${progress.workouts_this_week}/${progress.weekly_goal}` : '—'}
          </p>
        </div>
        <div className="text-center">
          <p className={cn(typography.statLabel)}>Adherencia</p>
          <p
            className={cn(
              typography.statValueSm,
              'mt-0.5',
              progress ? adherenceTone(progress.goal_completion_percent) : 'text-text-muted'
            )}
          >
            {progress ? `${progress.goal_completion_percent}%` : '—'}
          </p>
        </div>
        <div className="text-center">
          <p className={cn(typography.statLabel)}>Marcas</p>
          <p className={cn(typography.statValueSm, 'mt-0.5')}>{records?.length ?? 0}</p>
        </div>
      </div>

      {progress?.weeks?.length ? (
        <Card padding="sm" rounded="xl">
          <h3 className="text-text mb-2 text-sm font-semibold">Volumen · 8 semanas</h3>
          <Suspense
            fallback={
              <div className="flex h-40 items-center justify-center">
                <Spinner />
              </div>
            }
          >
            <WorkoutHistoryCharts weeks={progress.weeks} />
          </Suspense>
        </Card>
      ) : null}

      <Card padding="sm" rounded="xl">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-text text-sm font-semibold">Mejores marcas</h3>
          <Link
            to={`/members/${memberId}/records`}
            className="text-brand text-small inline-flex items-center gap-0.5 font-semibold hover:underline"
          >
            Ver todas
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {topRecords.length === 0 ? (
          <p className="text-text-muted text-small">
            Aún no hay marcas registradas en entrenamientos.
          </p>
        ) : (
          <ul className="divide-border divide-y">
            {topRecords.map((row) => (
              <li key={row.exercise_id} className="flex items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="text-text truncate text-sm font-semibold">{row.name}</p>
                  <p className="text-text-muted text-small capitalize">{row.muscle_group}</p>
                </div>
                <div className="shrink-0 text-right">
                  {row.best_set ? (
                    <>
                      <p className="text-text text-sm font-semibold tabular-nums">
                        {row.best_set.weight} kg × {row.best_set.reps}
                      </p>
                      {row.estimated_1rm_kg != null ? (
                        <Badge variant="default" className="text-small mt-0.5">
                          e1RM {Math.round(row.estimated_1rm_kg)}
                        </Badge>
                      ) : null}
                    </>
                  ) : (
                    <span className="text-text-muted text-small">—</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="flex flex-wrap gap-2">
        <Link to={`/members/${memberId}/history`} className="min-w-0 flex-1 sm:flex-none">
          <Button size="sm" variant="secondary" className="w-full sm:w-auto">
            <History className="h-3.5 w-3.5" />
            Historial
          </Button>
        </Link>
        <Link to={`/members/${memberId}/records`} className="min-w-0 flex-1 sm:flex-none">
          <Button size="sm" variant="secondary" className="w-full sm:w-auto">
            <Trophy className="h-3.5 w-3.5" />
            Marcas
          </Button>
        </Link>
      </div>
    </div>
  );
}
