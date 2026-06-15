import { useState, useEffect, useCallback } from 'react';
import { apiFetch, parseJsonResponse } from '../lib/api';
import { Shield, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AuditLogRow {
  id: number;
  user_id: number | null;
  user_name: string | null;
  user_email: string | null;
  action: string;
  details: string | null;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  'payment.approve': 'Pago aprobado',
  'payment.reject': 'Pago rechazado',
  'membership.assign': 'Membresía asignada',
  'user.status_change': 'Estado de usuario',
  'user.delete': 'Usuario eliminado',
};

const ACTION_FILTERS = [
  { value: '', label: 'Todas las acciones' },
  { value: 'payment.approve', label: 'Pagos aprobados' },
  { value: 'payment.reject', label: 'Pagos rechazados' },
  { value: 'membership.assign', label: 'Membresías asignadas' },
  { value: 'user.status_change', label: 'Cambios de estado' },
  { value: 'user.delete', label: 'Usuarios eliminados' },
];

function formatDetails(details: string | null): string {
  if (!details) return '—';
  try {
    const parsed = JSON.parse(details) as Record<string, unknown>;
    return Object.entries(parsed)
      .map(([key, value]) => `${key}: ${value}`)
      .join(' · ');
  } catch {
    return details;
  }
}

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

function actionBadgeClass(action: string): string {
  if (action.startsWith('payment.approve')) {
    return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500';
  }
  if (action.startsWith('payment.reject') || action.startsWith('user.delete')) {
    return 'bg-red-500/10 text-red-600 dark:text-red-500';
  }
  if (action.startsWith('membership')) {
    return 'bg-blue-500/10 text-blue-600 dark:text-blue-500';
  }
  return 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400';
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const qs = actionFilter ? `?action=${encodeURIComponent(actionFilter)}` : '';
      const res = await apiFetch(`/api/audit-logs${qs}`);
      const data = await parseJsonResponse<AuditLogRow[]>(res);
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [actionFilter]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 dark:text-white italic tracking-tighter uppercase leading-tight">
            REGISTRO DE <span className="text-orange-500">AUDITORÍA</span>
          </h1>
          <p className="text-zinc-500 font-medium">
            Acciones sensibles realizadas por administradores
          </p>
        </div>
        <button
          type="button"
          onClick={loadLogs}
          className="inline-flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-300 hover:border-orange-500/50 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
          Filtrar
        </label>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-sm font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
        >
          {ACTION_FILTERS.map((opt) => (
            <option key={opt.value || 'all'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-500 dark:text-zinc-400">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-400 uppercase font-black text-[10px] tracking-widest">
              <tr>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Admin</th>
                <th className="px-6 py-4">Acción</th>
                <th className="px-6 py-4">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-zinc-400 font-bold uppercase tracking-widest text-[10px]">
                    Cargando registros...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <Shield className="h-10 w-10 mx-auto text-zinc-300 dark:text-zinc-700 mb-3" />
                    <p className="text-zinc-400 font-bold uppercase tracking-widest text-[10px]">
                      No hay registros de auditoría
                    </p>
                    <p className="text-xs text-zinc-500 mt-2">
                      Aparecerán al aprobar pagos, asignar membresías o gestionar usuarios.
                    </p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-zinc-600 dark:text-zinc-300">
                      {format(new Date(log.created_at), "dd MMM yyyy · HH:mm", { locale: es })}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-tight text-xs">
                        {log.user_name ?? 'Sistema'}
                      </p>
                      {log.user_email && (
                        <p className="text-[10px] text-zinc-500">{log.user_email}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 rounded-lg text-[10px] font-black tracking-widest uppercase ${actionBadgeClass(log.action)}`}
                      >
                        {actionLabel(log.action)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-zinc-600 dark:text-zinc-400 max-w-md">
                      {formatDetails(log.details)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
