import { Link } from 'react-router-dom';
import { Trophy, History, ChevronRight } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Spinner } from '../../components/ui';
import { useMemberProgressQuery } from '../../hooks/queries/useCoachNotesQuery';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, parseJsonResponse } from '../../lib/api';
import type { ExerciseRecordSummary } from '../../lib/exerciseRecords';
import WorkoutHistoryCharts from '../../components/workout/WorkoutHistoryCharts';
import { cn } from '../../lib/utils';

interface MemberProgressPanelProps {
  memberId: number;
}

function adherenceTone(percent: number): string {
  if (percent >= 75) return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
  if (percent >= 50) return 'bg-amber-500/10 text-amber-800 dark:text-amber-300';
  return 'bg-red-500/10 text-red-700 dark:text-red-300';
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
      <div className="flex justify-center py-12">
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
        <Card padding="sm" rounded="xl" className="text-center">
          <p className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase">Semana</p>
          <p className="mt-0.5 text-xl font-bold text-zinc-900 tabular-nums dark:text-white">
            {progress ? `${progress.workouts_this_week}/${progress.weekly_goal}` : '—'}
          </p>
        </Card>
        <Card padding="sm" rounded="xl" className="text-center">
          <p className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase">
            Adherencia
          </p>
          <p
            className={cn(
              'mt-1 inline-flex rounded-full px-2 py-0.5 text-sm font-bold tabular-nums',
              progress ? adherenceTone(progress.goal_completion_percent) : 'text-zinc-500'
            )}
          >
            {progress ? `${progress.goal_completion_percent}%` : '—'}
          </p>
        </Card>
        <Card padding="sm" rounded="xl" className="text-center">
          <p className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase">Marcas</p>
          <p className="mt-0.5 text-xl font-bold text-zinc-900 tabular-nums dark:text-white">
            {records?.length ?? 0}
          </p>
        </Card>
      </div>

      {progress?.weeks?.length ? (
        <Card padding="sm" rounded="xl">
          <h3 className="mb-2 text-[13px] font-semibold text-zinc-900 dark:text-white">
            Volumen · 8 semanas
          </h3>
          <WorkoutHistoryCharts weeks={progress.weeks} />
        </Card>
      ) : null}

      <Card padding="sm" rounded="xl">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-[13px] font-semibold text-zinc-900 dark:text-white">
            Mejores marcas
          </h3>
          <Link
            to={`/members/${memberId}/records`}
            className="text-brand inline-flex items-center gap-0.5 text-[11px] font-semibold hover:underline"
          >
            Ver todas
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {topRecords.length === 0 ? (
          <p className="text-[12px] text-zinc-500 dark:text-zinc-400">
            Aún no hay marcas registradas en entrenamientos.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {topRecords.map((row) => (
              <li key={row.exercise_id} className="flex items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-zinc-900 dark:text-white">
                    {row.name}
                  </p>
                  <p className="text-[11px] text-zinc-500 capitalize dark:text-zinc-400">
                    {row.muscle_group}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  {row.best_set ? (
                    <>
                      <p className="text-[13px] font-bold text-zinc-900 tabular-nums dark:text-white">
                        {row.best_set.weight} kg × {row.best_set.reps}
                      </p>
                      {row.estimated_1rm_kg != null ? (
                        <Badge variant="default" className="mt-0.5 text-[9px]">
                          e1RM {Math.round(row.estimated_1rm_kg)}
                        </Badge>
                      ) : null}
                    </>
                  ) : (
                    <span className="text-[11px] text-zinc-400">—</span>
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
