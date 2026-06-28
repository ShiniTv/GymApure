import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
}

export default function WorkoutHistory() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [history, setHistory] = useState<WorkoutSession[]>([]);
  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
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
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
      const historyRes = await apiFetch(`/api/users/${userIdToFetch}/history?${params.toString()}`);
      const historyData = await parseJsonResponse<PaginatedHistory>(historyRes);
      setHistory(Array.isArray(historyData.items) ? historyData.items : []);
      setTotal(historyData.total ?? 0);
    } catch (err) {
      clientLogger.error('Failed to fetch workout history', err);
      setHistory([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [userIdToFetch, page, pageSize]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

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

  const workoutsThisWeek = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return history.filter((s) => new Date(s.start_time).getTime() >= weekAgo).length;
  }, [history]);

  const displayName = id ? targetUser?.full_name : user?.name;

  if (loading && history.length === 0 && !displayName) {
    return (
      <PageState>
        <Spinner />
        <p className="mt-3 text-zinc-500 text-xs">Cargando historial…</p>
      </PageState>
    );
  }

  return (
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
              className="lg:hidden h-9 w-9 inline-flex items-center justify-center rounded-lg text-zinc-500 hover:text-brand hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
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
        <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
          <StatCard compact title="Esta semana" value={workoutsThisWeek} icon={Calendar} color="orange" />
          <StatCard compact title="Total sesiones" value={total} icon={Dumbbell} color="blue" />
        </div>
      )}

      <Card padding="none" rounded="xl" className="overflow-hidden">
        {history.length === 0 && !loading ? (
          <EmptyState
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
            <div className="md:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading ? (
                <div className="p-8 flex justify-center"><Spinner /></div>
              ) : (
                history.map((session) => (
                  <div key={session.id} className="px-3 py-2.5 bg-white dark:bg-zinc-900">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-brand dark:text-brand truncate">
                          {session.routine_name}
                        </p>
                        <p className="text-[10px] text-zinc-500 mt-0.5 tabular-nums">
                          {formatSessionDate(session.start_time)} · {formatSessionTime(session.start_time)}
                        </p>
                      </div>
                      <Badge variant={session.end_time ? 'default' : 'warning'} className="shrink-0 text-[9px] px-1.5 py-0">
                        {session.end_time ? 'Finalizado' : 'En curso'}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-medium text-zinc-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3 text-brand" />
                        {formatDuration(session.start_time, session.end_time)}
                      </span>
                      <span>{session.sets_completed} series</span>
                      {id ? (
                        <Badge variant={session.success === 1 ? 'success' : 'danger'} className="text-[9px] px-1.5 py-0">
                          {session.success === 1 ? 'Exitoso' : 'Fallido'}
                        </Badge>
                      ) : (
                        <button type="button" onClick={() => toggleSuccess(session.id, session.success)} className="inline-flex">
                          <Badge variant={session.success === 1 ? 'success' : 'danger'} className="text-[9px] px-1.5 py-0">
                            {session.success === 1 ? 'Exitoso' : 'Fallido'}
                          </Badge>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-[10px] sm:text-xs font-semibold text-zinc-500">
                  <tr>
                    <th className="px-3 lg:px-5 py-2.5">Fecha</th>
                    <th className="px-3 lg:px-5 py-2.5">Rutina</th>
                    <th className="px-3 lg:px-5 py-2.5">Duración</th>
                    <th className="px-3 lg:px-5 py-2.5">Series</th>
                    <th className="px-3 lg:px-5 py-2.5">Éxito</th>
                    <th className="px-3 lg:px-5 py-2.5">Estado</th>
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
                        className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                      >
                        <td className="px-3 lg:px-5 py-2.5 font-medium text-zinc-700 dark:text-zinc-200 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-brand shrink-0" />
                            {formatSessionDate(session.start_time)}
                            <span className="text-[10px] text-zinc-400 tabular-nums">
                              {formatSessionTime(session.start_time)}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 lg:px-5 py-2.5 font-semibold text-brand dark:text-brand">
                          {session.routine_name}
                        </td>
                        <td className="px-3 lg:px-5 py-2.5 text-zinc-500">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {formatDuration(session.start_time, session.end_time)}
                          </div>
                        </td>
                        <td className="px-3 lg:px-5 py-2.5 text-zinc-500">
                          {session.sets_completed} series
                        </td>
                        <td className="px-3 lg:px-5 py-2.5">
                          {id ? (
                            <Badge variant={session.success === 1 ? 'success' : 'danger'} className="text-[9px] px-1.5 py-0">
                              {session.success === 1 ? 'Exitoso' : 'Fallido'}
                            </Badge>
                          ) : (
                            <button type="button" onClick={() => toggleSuccess(session.id, session.success)}>
                              <Badge variant={session.success === 1 ? 'success' : 'danger'} className="text-[9px] px-1.5 py-0">
                                {session.success === 1 ? 'Exitoso' : 'Fallido'}
                              </Badge>
                            </button>
                          )}
                        </td>
                        <td className="px-3 lg:px-5 py-2.5">
                          <Badge variant={session.end_time ? 'default' : 'warning'} className="text-[9px] px-1.5 py-0">
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
}
