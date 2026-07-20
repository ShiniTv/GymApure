import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { apiFetch, parseJsonResponse } from '../lib/api';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Calendar, Clock, Dumbbell, ArrowLeft, Play, Trash2, Trophy } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { dateLocale as es } from '../lib/dateLocale';
import {
  Card,
  PageHeader,
  Spinner,
  PaginationBar,
  Badge,
  EmptyState,
  Button,
  Breadcrumbs,
  BackToDashboardLink,
  StatCard,
  PageState,
  Modal,
  Skeleton,
} from '../components/ui';
import { clientLogger } from '../lib/clientLogger';
import { usePageTitle } from '../hooks/usePageTitle';
import { useToastOptional } from '../context/ToastContext';
import { toDisplayErrorMessage } from '../lib/api';
import { useMemberStatsOptional } from '../context/MemberStatsContext';
import { WorkoutWeeklyChart } from '../components/workout/WorkoutWeeklyChart';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { PullToRefreshContainer } from '../components/PullToRefresh';

const WorkoutHistoryCharts = lazy(() => import('../components/workout/WorkoutHistoryCharts'));

interface WorkoutSession {
  id: number;
  start_time: string;
  end_time: string | null;
  success: number;
  routine_id: number;
  routine_name: string;
  sets_completed: number;
}

interface SessionLog {
  set_number: number;
  weight: number;
  reps: number;
}

interface SessionExercise {
  exercise_id: number;
  name: string;
  muscle_group: string;
  planned_sets: number;
  planned_reps: number;
  logs: SessionLog[];
  session_best?: { weight: number; reps: number } | null;
  is_all_time_pr?: boolean;
}

interface SessionDetail {
  id: number;
  routine_id: number;
  routine_name: string;
  start_time: string;
  end_time: string | null;
  success: boolean;
  member: { id: number; full_name: string };
  exercises: SessionExercise[];
  summary: {
    sets_logged: number;
    sets_planned: number;
    total_volume_kg: number;
  };
}

interface User {
  id: number;
  full_name: string;
}

interface PaginatedHistory {
  items: WorkoutSession[];
  activeSessions?: WorkoutSession[];
  total: number;
  page: number;
  pageSize: number;
  workoutsThisWeek?: number;
}

interface WorkoutProgress {
  weekly_goal: number;
  workouts_this_week: number;
  goal_completion_percent: number;
  weeks: {
    week_start: string;
    volume_kg: number;
    max_weight_kg: number;
    workouts: number;
  }[];
}

export default function WorkoutHistory() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const routineFilterId = searchParams.get('routine');
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToastOptional();
  const memberStatsCtx = useMemberStatsOptional();

  const [history, setHistory] = useState<WorkoutSession[]>([]);
  const [activeSessions, setActiveSessions] = useState<WorkoutSession[]>([]);
  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [workoutsThisWeek, setWorkoutsThisWeek] = useState(0);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [progress, setProgress] = useState<WorkoutProgress | null>(null);
  const [discardTarget, setDiscardTarget] = useState<WorkoutSession | null>(null);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeletingSession, setIsDeletingSession] = useState(false);
  const pageSize = 20;

  const userIdToFetch = id ? parseInt(id, 10) : user?.id;
  const isMemberSelf = !id && user?.role === 'member';

  useEffect(() => {
    setPage(1);
    setTargetUser(null);
    setSelectedSessionId(null);
    setSessionDetail(null);
  }, [userIdToFetch, routineFilterId]);

  const openSessionDetail = useCallback(
    async (sessionId: number) => {
      setSelectedSessionId(sessionId);
      setSessionDetail(null);
      setDetailLoading(true);
      try {
        const res = await apiFetch(`/api/workouts/sessions/${sessionId}`);
        const data = await parseJsonResponse<SessionDetail>(res);
        setSessionDetail(data);
      } catch (err) {
        clientLogger.error('Failed to fetch session detail', err);
        toast?.error(toDisplayErrorMessage(err, 'No se pudo cargar el detalle'));
        setSelectedSessionId(null);
      } finally {
        setDetailLoading(false);
      }
    },
    [toast]
  );

  const closeSessionDetail = () => {
    setSelectedSessionId(null);
    setSessionDetail(null);
    setDeleteConfirmOpen(false);
  };

  const filteredHistory = routineFilterId
    ? history.filter((s) => String(s.routine_id) === routineFilterId)
    : history;

  const filteredActiveSessions = routineFilterId
    ? activeSessions.filter((s) => String(s.routine_id) === routineFilterId)
    : activeSessions;

  const routineFilterName =
    routineFilterId && filteredHistory[0]
      ? filteredHistory[0].routine_name
      : history.find((s) => String(s.routine_id) === routineFilterId)?.routine_name;

  useEffect(() => {
    if (!userIdToFetch) return;

    let cancelled = false;
    void apiFetch(`/api/users/${userIdToFetch}`)
      .then((res) => parseJsonResponse<User>(res))
      .then((data) => {
        if (!cancelled) setTargetUser(data);
      })
      .catch(() => {
        if (!cancelled) setTargetUser(null);
      });

    return () => {
      cancelled = true;
    };
  }, [userIdToFetch]);

  const fetchHistory = useCallback(async () => {
    if (!userIdToFetch) return;
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
      const historyRes = await apiFetch(`/api/users/${userIdToFetch}/history?${params.toString()}`);
      const historyData = await parseJsonResponse<PaginatedHistory>(historyRes);
      setHistory(Array.isArray(historyData.items) ? historyData.items : []);
      setActiveSessions(
        Array.isArray(historyData.activeSessions) ? historyData.activeSessions : []
      );
      setTotal(historyData.total ?? 0);
      setWorkoutsThisWeek(historyData.workoutsThisWeek ?? 0);
    } catch (err) {
      clientLogger.error('Failed to fetch workout history', err);
      setHistory([]);
      setActiveSessions([]);
      setTotal(0);
      setWorkoutsThisWeek(0);
      setLoadError(toDisplayErrorMessage(err, 'No se pudo cargar el historial'));
    } finally {
      setLoading(false);
    }
  }, [userIdToFetch, page, pageSize]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    if (!isMemberSelf) return;
    let cancelled = false;
    void apiFetch('/api/workouts/progress')
      .then((res) => parseJsonResponse<WorkoutProgress>(res))
      .then((data) => {
        if (!cancelled) setProgress(data);
      })
      .catch(() => {
        if (!cancelled) setProgress(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isMemberSelf]);

  const {
    pullDistance: historyPullDistance,
    isRefreshing: historyRefreshing,
    handlers: historyPtrHandlers,
  } = usePullToRefresh({
    onRefresh: fetchHistory,
    threshold: 80,
  });

  const toggleSuccess = async (sessionId: number, currentSuccess: number) => {
    if (id) return;
    try {
      await parseJsonResponse(
        await apiFetch(`/api/workouts/sessions/${sessionId}/success`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: currentSuccess === 1 ? 0 : 1 }),
        })
      );
      void fetchHistory();
    } catch (err) {
      clientLogger.error('Failed to toggle workout success', err);
      toast?.error(toDisplayErrorMessage(err, 'No se pudo actualizar el estado'));
    }
  };

  const clearWorkoutLocalStorage = (sessionId: number) => {
    localStorage.removeItem(`active_workout_logs_${sessionId}`);
    localStorage.removeItem(`active_workout_sets_${sessionId}`);
    localStorage.removeItem(`active_workout_completed_exercises_${sessionId}`);
  };

  const confirmDiscard = async () => {
    if (!discardTarget || isDiscarding) return;
    setIsDiscarding(true);
    try {
      await parseJsonResponse(
        await apiFetch('/api/workouts/discard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: discardTarget.id }),
        })
      );
      clearWorkoutLocalStorage(discardTarget.id);
      if (selectedSessionId === discardTarget.id) {
        closeSessionDetail();
      }
      setDiscardTarget(null);
      await memberStatsCtx?.refresh();
      void fetchHistory();
      toast?.success('Entrenamiento descartado');
    } catch (err) {
      clientLogger.error('Failed to discard workout session', err);
      toast?.error(toDisplayErrorMessage(err, 'No se pudo descartar el entrenamiento'));
    } finally {
      setIsDiscarding(false);
    }
  };

  const confirmDeleteSession = async () => {
    if (!sessionDetail || isDeletingSession) return;
    setIsDeletingSession(true);
    try {
      await parseJsonResponse(
        await apiFetch(`/api/workouts/sessions/${sessionDetail.id}`, {
          method: 'DELETE',
        })
      );
      clearWorkoutLocalStorage(sessionDetail.id);
      setDeleteConfirmOpen(false);
      closeSessionDetail();
      await memberStatsCtx?.refresh();
      void fetchHistory();
      toast?.success('Sesión eliminada del historial');
    } catch (err) {
      clientLogger.error('Failed to delete workout session', err);
      toast?.error(toDisplayErrorMessage(err, 'No se pudo eliminar la sesión'));
    } finally {
      setIsDeletingSession(false);
    }
  };

  const formatSessionDate = (iso: string) => {
    try {
      return format(parseISO(iso), 'dd MMM yyyy', { locale: es });
    } catch {
      return iso;
    }
  };

  const formatSessionTime = (iso: string) => {
    try {
      return format(parseISO(iso), 'HH:mm', { locale: es });
    } catch {
      return '';
    }
  };

  const formatDuration = (start: string, end: string | null) => {
    if (!end) return 'En curso';
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const diffMins = Math.round((endTime - startTime) / 60000);
    return `${diffMins} min`;
  };

  const displayName = id ? targetUser?.full_name : user?.name;

  usePageTitle(id ? 'Historial del miembro' : 'Historial');

  if (loadError && history.length === 0) {
    return (
      <PageState>
        <EmptyState
          icon={Dumbbell}
          title="Error al cargar"
          description={loadError}
          action={<Button onClick={() => void fetchHistory()}>Reintentar</Button>}
        />
      </PageState>
    );
  }

  if (loading && history.length === 0 && !displayName) {
    return (
      <PageState>
        <Spinner />
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">Cargando historial…</p>
      </PageState>
    );
  }

  const historyPage = (
    <div className="page-stack-tight mx-auto w-full max-w-5xl">
      {id && (
        <Breadcrumbs
          items={[
            { label: 'Miembros', href: '/members' },
            { label: displayName ?? 'Miembro', href: `/members/${id}/routines` },
            { label: 'Historial' },
          ]}
        />
      )}

      <PageHeader
        compact
        title={
          id ? (
            <>
              Historial de <span className="text-brand">{displayName ?? '…'}</span>
            </>
          ) : (
            <>
              Mi historial de <span className="text-brand">entrenamiento</span>
            </>
          )
        }
        subtitle={
          routineFilterId
            ? `Sesiones de ${routineFilterName ?? 'esta rutina'}`
            : id
              ? 'Sesiones registradas del miembro'
              : 'Sesiones y rendimiento'
        }
        action={
          id ? (
            <div className="flex items-center gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                className="h-9 gap-1.5 px-2.5 text-xs"
                onClick={() => navigate(`/members/${id}/records`)}
              >
                <Trophy className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Marcas</span>
              </Button>
              <button
                type="button"
                onClick={() => navigate(`/members/${id}/routines`)}
                className="hover:text-brand inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 lg:hidden dark:text-zinc-400 dark:hover:bg-zinc-800"
                aria-label="Volver al miembro"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                className="h-9 gap-1.5 px-2.5 text-xs"
                onClick={() => navigate('/history/records')}
              >
                <Trophy className="h-3.5 w-3.5" />
                Marcas
              </Button>
              <BackToDashboardLink />
            </div>
          )
        }
      />

      {!id && (
        <>
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
            <StatCard
              compact
              title="Esta semana"
              value={workoutsThisWeek}
              icon={Calendar}
              color="orange"
            />
            <StatCard compact title="Total sesiones" value={total} icon={Dumbbell} color="blue" />
          </div>
          {history.length > 0 && (
            <Card padding="sm" rounded="xl">
              <h3 className="section-title mb-2">Volumen semanal</h3>
              <WorkoutWeeklyChart history={history} />
            </Card>
          )}
          {progress && (
            <Card padding="md" rounded="xl">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="section-title">Progreso de fuerza</h3>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Últimas 8 semanas de entrenamientos completados.
                  </p>
                </div>
                <div className="bg-brand/10 rounded-lg px-3 py-2 text-right">
                  <p className="text-brand text-lg font-bold tabular-nums">
                    {progress.workouts_this_week}/{progress.weekly_goal}
                  </p>
                  <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                    Meta semanal · {progress.goal_completion_percent}%
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <Suspense fallback={<Skeleton className="h-44 w-full rounded-xl" />}>
                  <WorkoutHistoryCharts weeks={progress.weeks} />
                </Suspense>
              </div>
            </Card>
          )}
        </>
      )}

      {filteredActiveSessions.length > 0 && (
        <Card padding="md" rounded="xl" className="border-brand/30 bg-brand/5">
          <h3 className="section-title mb-3">Entrenamientos en curso</h3>
          <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
            Puedes salir y volver cuando quieras. Solo se registrará en tu historial al pulsar
            Finalizar.
          </p>
          <div className="space-y-2">
            {filteredActiveSessions.map((session) => (
              <div
                key={session.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-100 bg-white px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="min-w-0">
                  <p className="text-brand text-sm font-semibold">{session.routine_name}</p>
                  <p className="mt-0.5 text-[10px] text-zinc-500 tabular-nums dark:text-zinc-400">
                    Iniciado {formatSessionDate(session.start_time)} ·{' '}
                    {formatSessionTime(session.start_time)} · {session.sets_completed} series
                  </p>
                </div>
                {!id && (
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button size="sm" onClick={() => navigate(`/workout/${session.routine_id}`)}>
                      <Play className="h-3.5 w-3.5" />
                      Continuar
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setDiscardTarget(session)}>
                      <Trash2 className="h-3.5 w-3.5" />
                      Descartar
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card padding="none" rounded="xl" className="overflow-hidden">
        {filteredHistory.length === 0 && filteredActiveSessions.length === 0 && !loading ? (
          <EmptyState
            variant="motivational"
            icon={Dumbbell}
            title={
              routineFilterId
                ? 'Sin sesiones de esta rutina'
                : id
                  ? 'Sin historial'
                  : 'Aún no tienes entrenamientos'
            }
            description={
              routineFilterId
                ? 'Este miembro no tiene sesiones registradas para esta rutina.'
                : id
                  ? 'Este miembro no tiene sesiones registradas.'
                  : 'Cuando finalices una rutina, tus sesiones aparecerán aquí.'
            }
            action={
              !id ? (
                <Link to="/routines">
                  <Button size="sm">Ver mis rutinas</Button>
                </Link>
              ) : undefined
            }
          />
        ) : filteredHistory.length === 0 && !loading ? (
          <EmptyState
            variant="motivational"
            icon={Dumbbell}
            title="Sin sesiones finalizadas"
            description={
              routineFilterId
                ? 'No hay sesiones finalizadas para esta rutina.'
                : 'Tus entrenamientos en curso aparecen arriba. Al pulsar Finalizar, quedarán registrados aquí.'
            }
          />
        ) : (
          <>
            {/* Mobile card list */}
            <div className="divide-y divide-zinc-100 lg:hidden dark:divide-zinc-800">
              {loading ? (
                <div className="flex justify-center p-8">
                  <Spinner />
                </div>
              ) : (
                filteredHistory.map((session) => (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => void openSessionDetail(session.id)}
                    className="content-visibility-auto relative w-full bg-white px-3 py-2.5 pl-8 text-left transition-colors hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/50"
                  >
                    <span
                      className="bg-brand ring-brand/15 absolute top-4 left-3 h-2.5 w-2.5 rounded-full ring-4"
                      aria-hidden
                    />
                    <span
                      className="absolute top-6 bottom-0 left-[1.125rem] w-px bg-zinc-200 last:hidden dark:bg-zinc-800"
                      aria-hidden
                    />
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-brand dark:text-brand truncate text-sm font-semibold">
                          {session.routine_name}
                        </p>
                        <p className="mt-0.5 text-[10px] text-zinc-500 tabular-nums dark:text-zinc-400">
                          {formatSessionDate(session.start_time)} ·{' '}
                          {formatSessionTime(session.start_time)}
                        </p>
                      </div>
                      <Badge variant="default" className="shrink-0 px-1.5 py-0 text-[9px]">
                        Finalizado
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="text-brand h-3 w-3" />
                        {formatDuration(session.start_time, session.end_time)}
                      </span>
                      <span>{session.sets_completed} series</span>
                      {id ? (
                        <Badge
                          variant={session.success === 1 ? 'success' : 'danger'}
                          className="px-1.5 py-0 text-[9px]"
                        >
                          {session.success === 1 ? 'Exitoso' : 'Fallido'}
                        </Badge>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void toggleSuccess(session.id, session.success);
                          }}
                          className="inline-flex"
                        >
                          <Badge
                            variant={session.success === 1 ? 'success' : 'danger'}
                            className="px-1.5 py-0 text-[9px]"
                          >
                            {session.success === 1 ? 'Exitoso' : 'Fallido'}
                          </Badge>
                        </button>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left text-xs text-zinc-500 sm:text-sm dark:text-zinc-400">
                <thead className="bg-zinc-50 text-[10px] font-semibold text-zinc-500 sm:text-xs dark:bg-zinc-800/50 dark:text-zinc-400">
                  <tr>
                    <th className="px-3 py-2.5 lg:px-5">Fecha</th>
                    <th className="px-3 py-2.5 lg:px-5">Rutina</th>
                    <th className="px-3 py-2.5 lg:px-5">Duración</th>
                    <th className="px-3 py-2.5 lg:px-5">Series</th>
                    <th className="px-3 py-2.5 lg:px-5">Éxito</th>
                    <th className="px-3 py-2.5 lg:px-5">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center">
                        <Spinner />
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((session) => (
                      <tr
                        key={session.id}
                        className="cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
                        onClick={() => void openSessionDetail(session.id)}
                      >
                        <td className="px-3 py-2.5 font-medium whitespace-nowrap text-zinc-700 lg:px-5 dark:text-zinc-200">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="text-brand h-3.5 w-3.5 shrink-0" />
                            {formatSessionDate(session.start_time)}
                            <span className="text-[10px] text-zinc-400 tabular-nums dark:text-zinc-300">
                              {formatSessionTime(session.start_time)}
                            </span>
                          </div>
                        </td>
                        <td className="text-brand dark:text-brand px-3 py-2.5 font-semibold lg:px-5">
                          {session.routine_name}
                        </td>
                        <td className="px-3 py-2.5 text-zinc-500 lg:px-5 dark:text-zinc-400">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {formatDuration(session.start_time, session.end_time)}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-zinc-500 lg:px-5 dark:text-zinc-400">
                          {session.sets_completed} series
                        </td>
                        <td className="px-3 py-2.5 lg:px-5">
                          {id ? (
                            <Badge
                              variant={session.success === 1 ? 'success' : 'danger'}
                              className="px-1.5 py-0 text-[9px]"
                            >
                              {session.success === 1 ? 'Exitoso' : 'Fallido'}
                            </Badge>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void toggleSuccess(session.id, session.success);
                              }}
                            >
                              <Badge
                                variant={session.success === 1 ? 'success' : 'danger'}
                                className="px-1.5 py-0 text-[9px]"
                              >
                                {session.success === 1 ? 'Exitoso' : 'Fallido'}
                              </Badge>
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-2.5 lg:px-5">
                          <Badge variant="default" className="px-1.5 py-0 text-[9px]">
                            Finalizado
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <PaginationBar
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              label="sesiones"
            />
          </>
        )}
      </Card>

      <Modal
        open={selectedSessionId !== null}
        onClose={closeSessionDetail}
        title={
          sessionDetail ? (
            <>
              {sessionDetail.routine_name} ·{' '}
              <span className="text-brand">{formatSessionDate(sessionDetail.start_time)}</span>
            </>
          ) : (
            'Detalle de sesión'
          )
        }
        maxWidth="xl"
        scrollable
      >
        {detailLoading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : sessionDetail ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span>
                {formatSessionTime(sessionDetail.start_time)}
                {sessionDetail.end_time
                  ? ` – ${formatSessionTime(sessionDetail.end_time)}`
                  : ' · En curso'}
              </span>
              <span>·</span>
              <span>{formatDuration(sessionDetail.start_time, sessionDetail.end_time)}</span>
              <Badge
                variant={
                  sessionDetail.end_time
                    ? sessionDetail.success
                      ? 'success'
                      : 'danger'
                    : 'warning'
                }
                className="px-1.5 py-0 text-[9px]"
              >
                {sessionDetail.end_time
                  ? sessionDetail.success
                    ? 'Exitoso'
                    : 'Fallido'
                  : 'En curso'}
              </Badge>
            </div>

            {!sessionDetail.end_time && !id && (
              <div className="flex flex-wrap gap-2">
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => {
                    closeSessionDetail();
                    navigate(`/workout/${sessionDetail.routine_id}`);
                  }}
                >
                  <Play className="h-4 w-4" />
                  Continuar entrenamiento
                </Button>
                <Button
                  variant="secondary"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    const active = activeSessions.find((s) => s.id === sessionDetail.id);
                    if (active) setDiscardTarget(active);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Descartar
                </Button>
              </div>
            )}

            {sessionDetail.end_time && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="danger"
                  className="w-full sm:w-auto"
                  onClick={() => setDeleteConfirmOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar del historial
                </Button>
              </div>
            )}

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-center dark:border-zinc-800 dark:bg-zinc-800/50">
                <p className="text-lg font-bold text-zinc-900 dark:text-white">
                  {sessionDetail.summary.sets_logged}
                </p>
                <p className="text-[10px] text-zinc-500">Series hechas</p>
              </div>
              <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-center dark:border-zinc-800 dark:bg-zinc-800/50">
                <p className="text-lg font-bold text-zinc-900 dark:text-white">
                  {sessionDetail.summary.sets_planned}
                </p>
                <p className="text-[10px] text-zinc-500">Series planeadas</p>
              </div>
              <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-center dark:border-zinc-800 dark:bg-zinc-800/50">
                <p className="text-lg font-bold text-zinc-900 dark:text-white">
                  {sessionDetail.summary.total_volume_kg} kg
                </p>
                <p className="text-[10px] text-zinc-500">Volumen total</p>
              </div>
            </div>

            <div className="space-y-3">
              {sessionDetail.exercises.map((exercise) => {
                const omitted = exercise.logs.length === 0;
                return (
                  <div
                    key={exercise.exercise_id}
                    className="rounded-lg border border-zinc-100 p-3 dark:border-zinc-800"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                            {exercise.name}
                          </p>
                          {exercise.is_all_time_pr && (
                            <Badge variant="success" className="px-1.5 py-0 text-[9px]">
                              Nueva marca
                            </Badge>
                          )}
                        </div>
                        {exercise.muscle_group && (
                          <p className="text-[10px] text-zinc-500 capitalize dark:text-zinc-400">
                            {exercise.muscle_group}
                          </p>
                        )}
                        {exercise.session_best && (
                          <p className="mt-0.5 text-[11px] text-zinc-600 dark:text-zinc-300">
                            Mejor serie:{' '}
                            <span className="font-semibold tabular-nums">
                              {exercise.session_best.weight} kg × {exercise.session_best.reps}
                            </span>
                          </p>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                        Plan: {exercise.planned_sets}×{exercise.planned_reps}
                      </p>
                    </div>
                    {omitted ? (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400">
                        Sin series registradas
                      </p>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="text-[10px] text-zinc-500 dark:text-zinc-400">
                            <th className="pb-1 font-medium">Serie</th>
                            <th className="pb-1 font-medium">Peso</th>
                            <th className="pb-1 font-medium">Reps</th>
                          </tr>
                        </thead>
                        <tbody>
                          {exercise.logs.map((log) => (
                            <tr key={log.set_number} className="text-zinc-700 dark:text-zinc-200">
                              <td className="py-0.5 tabular-nums">{log.set_number}</td>
                              <td className="py-0.5 tabular-nums">{log.weight} kg</td>
                              <td className="py-0.5 tabular-nums">{log.reps}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={discardTarget !== null}
        onClose={() => {
          if (isDiscarding) return;
          setDiscardTarget(null);
        }}
        title="Descartar entrenamiento"
      >
        {discardTarget && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              ¿Descartar <span className="font-semibold">{discardTarget.routine_name}</span>{' '}
              iniciado el {formatSessionDate(discardTarget.start_time)} a las{' '}
              {formatSessionTime(discardTarget.start_time)}?
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Se eliminará el progreso de esta sesión. No aparecerá en tu historial. Podrás empezar
              de nuevo cuando quieras.
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                disabled={isDiscarding}
                onClick={() => setDiscardTarget(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                disabled={isDiscarding}
                onClick={() => void confirmDiscard()}
              >
                {isDiscarding ? 'Descartando…' : 'Descartar'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={deleteConfirmOpen && sessionDetail !== null}
        onClose={() => {
          if (isDeletingSession) return;
          setDeleteConfirmOpen(false);
        }}
        title="Eliminar sesión del historial"
      >
        {sessionDetail && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              ¿Eliminar la sesión de{' '}
              <span className="font-semibold">{sessionDetail.routine_name}</span> del{' '}
              {formatSessionDate(sessionDetail.start_time)} a las{' '}
              {formatSessionTime(sessionDetail.start_time)}?
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Esta acción no se puede deshacer. Se borrarán las series registradas de esta sesión.
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                disabled={isDeletingSession}
                onClick={() => setDeleteConfirmOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                disabled={isDeletingSession}
                onClick={() => void confirmDeleteSession()}
              >
                {isDeletingSession ? 'Eliminando…' : 'Eliminar'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );

  if (isMemberSelf) {
    return (
      <PullToRefreshContainer pullDistance={historyPullDistance} isRefreshing={historyRefreshing}>
        <div {...historyPtrHandlers}>{historyPage}</div>
      </PullToRefreshContainer>
    );
  }

  return historyPage;
}
