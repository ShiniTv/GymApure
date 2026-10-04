import { Link } from 'react-router';
import { Trophy, History, ChevronRight, CalendarDays, Target } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { Badge, Button, Card, EmptyState, Skeleton } from '../../components/ui';
import { OperateMetricStrip } from '../../components/operate/OperateChrome';
import { useMemberProgressQuery } from '../../hooks/queries/useCoachNotesQuery';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, parseJsonResponse } from '../../lib/api';
import type { ExerciseRecordSummary } from '../../lib/exerciseRecords';

const WorkoutHistoryCharts = lazy(() => import('../../components/workout/WorkoutHistoryCharts'));

interface MemberProgressPanelProps {
  memberId: number;
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
      <div className="space-y-3" aria-busy="true" aria-label="Cargando progreso">
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
        <Skeleton className="h-44 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
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
      <OperateMetricStrip
        items={[
          {
            label: 'Semana',
            value: progress ? `${progress.workouts_this_week}/${progress.weekly_goal}` : '—',
            icon: CalendarDays,
          },
          {
            label: 'Adherencia',
            value: progress ? `${progress.goal_completion_percent}%` : '—',
            icon: Target,
          },
          {
            label: 'Marcas',
            value: records?.length ?? 0,
            icon: Trophy,
          },
        ]}
      />

      {progress?.weeks?.length ? (
        <Card
          padding="none"
          className="border-border/70 bg-surface rounded-xl border p-3.5 shadow-2xs sm:p-4"
        >
          <h3 className="text-text mb-2.5 text-sm font-semibold tracking-tight">
            Volumen · 8 semanas
          </h3>
          <Suspense fallback={<Skeleton className="h-36 w-full rounded-lg" />}>
            <WorkoutHistoryCharts weeks={progress.weeks} />
          </Suspense>
        </Card>
      ) : null}

      <Card
        padding="none"
        className="border-border/70 bg-surface rounded-xl border p-3.5 shadow-2xs sm:p-4"
      >
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <h3 className="text-text text-sm font-semibold tracking-tight">Mejores marcas</h3>
          <Link
            to={`/members/${memberId}/records`}
            className="text-brand inline-flex items-center gap-1 text-xs font-semibold hover:underline"
          >
            Ver todas
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        {topRecords.length === 0 ? (
          <div className="border-border/60 bg-surface-raised/40 text-text-muted flex items-center gap-2.5 rounded-lg border px-3.5 py-3 text-xs">
            <Trophy className="text-text-muted/60 h-4 w-4 shrink-0" />
            <span>Aún no hay marcas registradas en entrenamientos.</span>
          </div>
        ) : (
          <ul className="border-border/70 divide-border/60 divide-y overflow-hidden rounded-lg border">
            {topRecords.map((row) => (
              <li
                key={row.exercise_id}
                className="hover:bg-surface-raised/40 flex items-center justify-between gap-2 px-3 py-2 transition-colors sm:px-3.5 sm:py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-text truncate text-xs font-semibold tracking-tight sm:text-sm">
                    {row.name}
                  </p>
                  <p className="text-text-muted mt-0.5 text-[0.6875rem] capitalize">
                    {row.muscle_group}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  {row.best_set ? (
                    <>
                      <p className="text-text text-xs font-bold tabular-nums sm:text-sm">
                        {row.best_set.weight} kg × {row.best_set.reps}
                      </p>
                      {row.estimated_1rm_kg != null ? (
                        <Badge variant="default" className="mt-0.5 px-1.5 py-0 text-[0.625rem]">
                          e1RM {Math.round(row.estimated_1rm_kg)}
                        </Badge>
                      ) : null}
                    </>
                  ) : (
                    <span className="text-text-muted text-xs">—</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="flex flex-wrap gap-2 pt-0.5">
        <Link to={`/members/${memberId}/history`} className="min-w-0">
          <Button size="sm" variant="secondary" className="gap-1.5 text-xs">
            <History className="h-3.5 w-3.5" />
            <span>Historial completo</span>
          </Button>
        </Link>
        <Link to={`/members/${memberId}/records`} className="min-w-0">
          <Button size="sm" variant="secondary" className="gap-1.5 text-xs">
            <Trophy className="h-3.5 w-3.5" />
            <span>Récords personales</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
