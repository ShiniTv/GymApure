import { useState, useEffect, useCallback } from 'react';
import { apiFetch, parseJsonResponse } from '../lib/api';
import { Shield, RefreshCw, CreditCard, UserX, UserCheck, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge, Button, Card, Label, PageHeader, Select, Spinner, EmptyState } from '../components/ui';
import { clientLogger } from '../lib/clientLogger';
import { cn } from '../lib/utils';

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

function actionBadgeVariant(action: string): 'success' | 'danger' | 'default' {
  if (action.startsWith('payment.approve')) return 'success';
  if (action.startsWith('payment.reject') || action.startsWith('user.delete')) return 'danger';
  return 'default';
}

function actionIcon(action: string) {
  if (action.startsWith('payment.approve')) return CreditCard;
  if (action.startsWith('payment.reject')) return UserX;
  if (action.startsWith('membership.assign')) return UserCheck;
  if (action.startsWith('user.delete')) return Trash2;
  return Shield;
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
      clientLogger.error('Failed to fetch audit logs', err);
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
      <PageHeader
        title={<>REGISTRO DE <span className="text-orange-500">AUDITORÍA</span></>}
        subtitle="Acciones sensibles realizadas por administradores"
        action={
          <Button variant="ghost" size="sm" onClick={loadLogs}>
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Label className="mb-0">Filtrar</Label>
        <Select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="w-auto min-w-[200px] py-2"
        >
          {ACTION_FILTERS.map((opt) => (
            <option key={opt.value || 'all'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>

      <Card padding="lg" rounded="3xl">
        {loading ? (
          <div className="py-12 flex justify-center">
            <Spinner />
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={Shield}
            title="No hay registros"
            description="Las acciones de administradores aparecerán aquí en formato de línea de tiempo."
          />
        ) : (
          <ol className="relative space-y-0">
            {logs.map((log, index) => {
              const Icon = actionIcon(log.action);
              const variant = actionBadgeVariant(log.action);
              const isLast = index === logs.length - 1;

              return (
                <li key={log.id} className="relative flex gap-4 pb-8">
                  {!isLast && (
                    <span
                      className="absolute left-5 top-10 bottom-0 w-px bg-zinc-200 dark:bg-zinc-800"
                      aria-hidden
                    />
                  )}
                  <div
                    className={cn(
                      'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-4 ring-white dark:ring-zinc-900',
                      variant === 'success' && 'bg-emerald-500/10 text-emerald-600',
                      variant === 'danger' && 'bg-red-500/10 text-red-600',
                      variant === 'default' && 'bg-orange-500/10 text-orange-600'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Badge variant={variant}>{actionLabel(log.action)}</Badge>
                      <time
                        className="text-[10px] font-bold uppercase tracking-widest text-zinc-400"
                        dateTime={log.created_at}
                      >
                        {format(new Date(log.created_at), "dd MMM yyyy · HH:mm", { locale: es })}
                      </time>
                    </div>
                    <p className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tight">
                      {log.user_name ?? 'Sistema'}
                      {log.user_email && (
                        <span className="text-zinc-500 font-medium normal-case tracking-normal ml-2 text-xs">
                          {log.user_email}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 break-words">
                      {formatDetails(log.details)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Card>
    </div>
  );
}
