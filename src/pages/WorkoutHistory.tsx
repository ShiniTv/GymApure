import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch, parseJsonResponse } from '../lib/api';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Calendar, Clock, Dumbbell, ArrowLeft } from 'lucide-react';
import { Card, PageHeader, Spinner, PaginationBar } from '../components/ui';
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

  const formatDuration = (start: string, end: string | null) => {
    if (!end) return 'In Progress';
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const diffMins = Math.round((endTime - startTime) / 60000);
    return `${diffMins} mins`;
  };

  const displayName = id ? targetUser?.full_name : user?.name;

  if (loading && history.length === 0 && !displayName) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {id && (
          <button
            onClick={() => navigate('/members')}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-400 dark:text-zinc-500 transition-colors"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
        )}
        <PageHeader
          title={
            id ? (
              <>
                Historial de <span className="text-orange-500">{displayName ?? '...'}</span>
              </>
            ) : (
              <>
                Mi historial de <span className="text-orange-500">entrenamiento</span>
              </>
            )
          }
          subtitle="Sesiones pasadas y rendimiento en Caribean Gym"
        />
      </div>

      <Card padding="none" rounded="3xl" className="overflow-hidden">
        {history.length === 0 && !loading ? (
          <div className="p-12 text-center">
            <Dumbbell className="h-12 w-12 text-zinc-100 dark:text-zinc-800 mx-auto mb-4" />
            <p className="text-zinc-400 font-black uppercase tracking-widest text-[10px]">
              No se encontró historial de entrenamiento.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-500 dark:text-zinc-400">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-400 uppercase font-black text-[10px] tracking-widest">
                  <tr>
                    <th className="px-8 py-5">Fecha</th>
                    <th className="px-8 py-5">Rutina</th>
                    <th className="px-8 py-5">Duración</th>
                    <th className="px-8 py-5">Series</th>
                    <th className="px-8 py-5">Éxito</th>
                    <th className="px-8 py-5">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-12 text-center">
                        <Spinner />
                      </td>
                    </tr>
                  ) : (
                    history.map((session) => (
                      <tr
                        key={session.id}
                        className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors group"
                      >
                        <td className="px-8 py-5 font-black text-zinc-700 dark:text-zinc-200 uppercase tracking-tight">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-orange-500" />
                            {new Date(session.start_time).toLocaleDateString()}
                            <span className="text-[10px] text-zinc-400 font-black tracking-widest opacity-50">
                              {new Date(session.start_time).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-5 font-black text-orange-600 dark:text-orange-500 italic tracking-tighter uppercase">
                          {session.routine_name}
                        </td>
                        <td className="px-8 py-5 font-black text-zinc-500 dark:text-zinc-400 tracking-tighter">
                          <div className="flex items-center gap-2 opacity-70">
                            <Clock className="h-4 w-4" />
                            {formatDuration(session.start_time, session.end_time)}
                          </div>
                        </td>
                        <td className="px-8 py-5 font-black text-zinc-500 dark:text-zinc-400 tracking-tighter">
                          {session.sets_completed}{' '}
                          <span className="text-[10px] uppercase opacity-50">series</span>
                        </td>
                        <td className="px-8 py-5">
                          <button
                            onClick={() => toggleSuccess(session.id, session.success)}
                            className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                              session.success === 1
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 hover:bg-emerald-500/20'
                                : 'bg-red-500/10 text-red-600 dark:text-red-500 hover:bg-red-500/20'
                            } ${id ? 'cursor-default' : 'cursor-pointer'}`}
                            title={id ? '' : 'Click para cambiar estado'}
                          >
                            {session.success === 1 ? 'EXITOSO' : 'FALLIDO'}
                          </button>
                        </td>
                        <td className="px-8 py-5">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                              session.end_time
                                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                                : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500'
                            }`}
                          >
                            {session.end_time ? 'FINALIZADO' : 'EN CURSO'}
                          </span>
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
