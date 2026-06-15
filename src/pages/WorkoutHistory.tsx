import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Calendar, Clock, Dumbbell, ArrowLeft } from 'lucide-react';

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

export default function WorkoutHistory() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [history, setHistory] = useState<WorkoutSession[]>([]);
  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Determine which user ID to apiFetch
  const userIdToFetch = id ? parseInt(id) : user?.id;

  const apiFetchData = async () => {
    if (!userIdToFetch) return;
    try {
      const [historyRes, userRes] = await Promise.all([
        apiFetch(`/api/users/${userIdToFetch}/history`),
        apiFetch(`/api/users/${userIdToFetch}`)
      ]);

      const historyData = await historyRes.json();
      const userData = await userRes.json();

      setHistory(Array.isArray(historyData) ? historyData : []);
      setTargetUser(userData);
    } catch (err) {
      console.error('Failed to apiFetch history', err);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    apiFetchData();
  }, [userIdToFetch]);

  const toggleSuccess = async (sessionId: number, currentSuccess: number) => {
    if (id) return; // Only allow user to edit their own history
    try {
      const res = await apiFetch(`/api/workouts/sessions/${sessionId}/success`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: currentSuccess === 1 ? 0 : 1 }),
      });
      if (res.ok) {
        apiFetchData();
      }
    } catch (err) {
      console.error('Failed to toggle success', err);
    }
  };

  const formatDuration = (start: string, end: string | null) => {
    if (!end) return 'In Progress';
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const diffMins = Math.round((endTime - startTime) / 60000);
    return `${diffMins} mins`;
  };

  if (loading) return <div className="p-6 text-zinc-500 dark:text-zinc-400">Cargando historial...</div>;

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
        <div>
          <h1 className="text-3xl font-black text-zinc-900 dark:text-white italic tracking-tighter uppercase whitespace-pre-line leading-tight">
            {id ? `HISTORIAL DE ${targetUser?.full_name?.toUpperCase()}` : 'MI HISTORIAL DE ENTRENAMIENTO'}
          </h1>
          <p className="text-zinc-500 font-medium">Sesiones pasadas y rendimiento en Caribean Gym</p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
        {history.length === 0 ? (
          <div className="p-12 text-center">
            <Dumbbell className="h-12 w-12 text-zinc-100 dark:text-zinc-800 mx-auto mb-4" />
            <p className="text-zinc-400 font-black uppercase tracking-widest text-[10px]">No se encontró historial de entrenamiento.</p>
          </div>
        ) : (
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
                {history.map((session) => (
                  <tr key={session.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors group">
                    <td className="px-8 py-5 font-black text-zinc-700 dark:text-zinc-200 uppercase tracking-tight">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-orange-500" />
                        {new Date(session.start_time).toLocaleDateString()}
                        <span className="text-[10px] text-zinc-400 font-black tracking-widest opacity-50">
                          {new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                      {session.sets_completed} <span className="text-[10px] uppercase opacity-50">series</span>
                    </td>
                    <td className="px-8 py-5">
                      <button
                        onClick={() => toggleSuccess(session.id, session.success)}
                        className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                          session.success === 1
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 hover:bg-emerald-500/20'
                            : 'bg-red-500/10 text-red-600 dark:text-red-500 hover:bg-red-500/20'
                        } ${id ? 'cursor-default' : 'cursor-pointer'}`}
                        title={id ? "" : "Click para cambiar estado"}
                      >
                        {session.success === 1 ? 'EXITOSO' : 'FALLIDO'}
                      </button>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                        session.end_time 
                          ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900' 
                          : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500'
                      }`}>
                        {session.end_time ? 'FINALIZADO' : 'EN CURSO'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
