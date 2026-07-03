import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch, parseJsonResponse } from '../lib/api';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Calendar, Clock, Dumbbell, ArrowLeft } from 'lucide-react';
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
} from '../components/ui';
import { clientLogger } from '../lib/clientLogger';
import { usePageTitle } from '../hooks/usePageTitle';
import { useToastOptional } from '../context/ToastContext';
import { toDisplayErrorMessage } from '../lib/api';
import { WorkoutWeeklyChart } from '../components/workout/WorkoutWeeklyChart';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { PullToRefreshContainer } from '../components/PullToRefresh';

interface WorkoutSession {
  id: number;
  start_time: string;
  end_time: string | null;
  success: number;
  routine_name: string;
  sets_completed: number;
}

interface User {
  id: number;
  full_name: string;
}

interface PaginatedHistory {
  items: WorkoutSession[];
  total: number;
  page: number;
  pageSize: number;
  workoutsThisWeek?: number;
}

export default function WorkoutHistory() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToastOptional();

  const [history, setHistory] = useState<WorkoutSession[]>([]);
  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [workoutsThisWeek, setWorkoutsThisWeek] = useState(0);
  const pageSize = 20;

  const userIdToFetch = id ? parseInt(id, 10) : user?.id;

  useEffect(() => {
    setPage(1);
    setTargetUser(null);
  }, [userIdToFetch]);

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
      setTotal(historyData.total ?? 0);
      setWorkoutsThisWeek(historyData.workoutsThisWeek ?? 0);
    } catch (err) {
      clientLogger.error('Failed to fetch workout history', err);
      setHistory([]);
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

  const isMemberSelf = !id && user?.role === 'member';
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
    <div className="page-stack-tight">
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
        subtitle={id ? 'Sesiones registradas del miembro' : 'Sesiones y rendimiento'}
        action={
          id ? (
            <button
              type="button"
              onClick={() => navigate(`/members/${id}/routines`)}
              className="hover:text-brand inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 lg:hidden dark:text-zinc-400 dark:hover:bg-zinc-800"
              aria-label="Volver al miembro"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : (
            <BackToDashboardLink />
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
        </>
      )}

      <Card padding="none" rounded="xl" className="overflow-hidden">
        {history.length === 0 && !loading ? (
          <EmptyState
            variant="motivational"
            icon={Dumbbell}
            title={id ? 'Sin historial' : 'Aún no tienes entrenamientos'}
            description={
              id
                ? 'Este miembro no tiene sesiones registradas.'
                : 'Cuando completes una rutina, tus sesiones aparecerán aquí.'
            }
            action={
              !id ? (
                <Link to="/routines">
                  <Button size="sm">Ver mis rutinas</Button>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <>
            {/* Mobile card list */}
            <div className="divide-y divide-zinc-100 md:hidden dark:divide-zinc-800">
              {loading ? (
                <div className="flex justify-center p-8">
                  <Spinner />
                </div>
              ) : (
                history.map((session) => (
                  <div
                    key={session.id}
                    className="content-visibility-auto relative bg-white px-3 py-2.5 pl-8 dark:bg-zinc-900"
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
                      <Badge
                        variant={session.end_time ? 'default' : 'warning'}
                        className="shrink-0 px-1.5 py-0 text-[9px]"
                      >
                        {session.end_time ? 'Finalizado' : 'En curso'}
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
                          onClick={() => toggleSuccess(session.id, session.success)}
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
                  </div>
                ))
              )}
            </div>

            <div className="hidden overflow-x-auto md:block">
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
                    history.map((session) => (
                      <tr
                        key={session.id}
                        className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
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
                              onClick={() => toggleSuccess(session.id, session.success)}
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
                          <Badge
                            variant={session.end_time ? 'default' : 'warning'}
                            className="px-1.5 py-0 text-[9px]"
                          >
                            {session.end_time ? 'Finalizado' : 'En curso'}
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
