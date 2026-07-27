import { useState, useEffect, useCallback } from 'react';
import { apiFetch, parseJsonResponse } from '../lib/api';
import {
  Shield,
  RefreshCw,
  CreditCard,
  UserX,
  UserCheck,
  Trash2,
  Fingerprint,
  UserPlus,
  LogIn,
  LogOut,
} from 'lucide-react';
import { format } from 'date-fns';
import { dateLocale as es } from '../lib/dateLocale';
import { Virtuoso } from 'react-virtuoso';
import {
  Badge,
  Button,
  Card,
  PageHeader,
  EmptyState,
  FilterChips,
  BackToDashboardLink,
  AuditLogsSkeleton,
} from '../components/ui';
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
  'membership.delete': 'Membresía eliminada',
  'user.status_change': 'Estado de usuario',
  'user.delete': 'Usuario eliminado',
  'user.create': 'Usuario creado',
  'user.profile_update': 'Perfil actualizado',
  'reception.check_in': 'Entrada recepción',
  'reception.check_out': 'Salida recepción',
  'reception.walk_in': 'Registro en mostrador',
  'settings.expiry.update': 'Config. vencimientos',
  'settings.expiry.run': 'Job vencimientos',
  'auth.login': 'Inicio de sesión',
  'auth.logout': 'Cierre de sesión',
  'auth.register': 'Registro',
  'auth.change_password': 'Cambio contraseña',
  'member.remote_training_start': 'Entrenamiento remoto',
  'member.remote_training_end': 'Fin entrenamiento remoto',
};

const ACTION_FILTERS = [
  { value: '', label: 'Todas' },
  { value: 'payment.approve', label: 'Aprobados' },
  { value: 'payment.reject', label: 'Rechazados' },
  { value: 'membership.assign', label: 'Membresías' },
  { value: 'reception.check_in', label: 'Entradas' },
  { value: 'reception.check_out', label: 'Salidas' },
  { value: 'reception.walk_in', label: 'Mostrador' },
  { value: 'user.status_change', label: 'Estados' },
  { value: 'user.delete', label: 'Bajas' },
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
  return ACTION_LABELS[action] ?? action.replace(/\./g, ' · ');
}

function actionBadgeVariant(action: string): 'success' | 'danger' | 'default' | 'accent' {
  if (action.startsWith('payment.approve') || action.startsWith('reception.check_in'))
    return 'success';
  if (action.startsWith('payment.reject') || action.startsWith('user.delete')) return 'danger';
  if (action.startsWith('reception.')) return 'accent';
  return 'default';
}

function actionIcon(action: string) {
  if (action.startsWith('payment.approve')) return CreditCard;
  if (action.startsWith('payment.reject')) return UserX;
  if (action.startsWith('membership.')) return UserCheck;
  if (action.startsWith('user.delete')) return Trash2;
  if (action.startsWith('reception.check_in')) return LogIn;
  if (action.startsWith('reception.check_out')) return LogOut;
  if (action.startsWith('reception.walk_in')) return UserPlus;
  if (action.startsWith('reception.')) return Fingerprint;
  return Shield;
}

function AuditTimelineItem({ log, isLast }: { log: AuditLogRow; isLast: boolean }) {
  const Icon = actionIcon(log.action);
  const variant = actionBadgeVariant(log.action);
  const detailText = formatDetails(log.details);

  return (
    <li className="relative flex gap-4 pb-5 last:pb-0">
      {!isLast && (
        <span className="bg-border/80 absolute top-10 bottom-0 left-5 w-px" aria-hidden />
      )}
      <div
        className={cn(
          'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-4 ring-[var(--color-surface)]',
          variant === 'success' && 'bg-emerald-500/10 text-emerald-600',
          variant === 'danger' && 'bg-red-500/10 text-red-600',
          variant === 'accent' && 'bg-brand/10 text-brand',
          variant === 'default' && 'bg-surface-raised text-text-secondary'
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <Badge variant={variant}>{actionLabel(log.action)}</Badge>
          <time className="text-xs text-zinc-400 dark:text-zinc-300" dateTime={log.created_at}>
            {format(new Date(log.created_at), 'dd MMM yyyy · HH:mm', { locale: es })}
          </time>
        </div>
        <div className="min-w-0">
          <p className="text-text truncate text-sm font-semibold">{log.user_name ?? 'Sistema'}</p>
          {log.user_email ? (
            <p
              className="text-text-secondary mt-0.5 truncate text-xs font-normal"
              title={log.user_email}
            >
              {log.user_email}
            </p>
          ) : null}
        </div>
        <p className="text-text-secondary mt-1 line-clamp-2 text-xs break-words" title={detailText}>
          {detailText}
        </p>
      </div>
    </li>
  );
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
    <div className="page-stack-tight mx-auto w-full max-w-7xl">
      <PageHeader
        compact
        title={
          <>
            Registro de <span className="text-brand">auditoría</span>
          </>
        }
        subtitle="Acciones sensibles realizadas por el personal del gym"
        action={
          <div className="flex items-center gap-1.5">
            <BackToDashboardLink iconOnly className="sm:hidden" />
            <BackToDashboardLink className="hidden sm:inline-flex" />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 px-0"
              onClick={loadLogs}
              aria-label="Actualizar"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <FilterChips
        className="w-fit max-w-full"
        options={ACTION_FILTERS}
        value={actionFilter}
        onChange={setActionFilter}
      />

      <Card padding="none" rounded="xl" className="min-w-0 overflow-hidden">
        {loading ? (
          <div className="p-3 md:p-4">
            <AuditLogsSkeleton />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Shield}
              title="No hay registros"
              description="Las acciones de administradores y recepción aparecerán aquí."
            />
          </div>
        ) : (
          <>
            {/* Mobile / tablet: timeline */}
            <div className="p-3 md:p-4 lg:hidden">
              {logs.length > 12 ? (
                <Virtuoso
                  style={{ height: 'min(70vh, 48rem)' }}
                  data={logs}
                  itemContent={(index, log) => (
                    <ol className="relative">
                      <AuditTimelineItem log={log} isLast={index === logs.length - 1} />
                    </ol>
                  )}
                />
              ) : (
                <ol className="relative space-y-0">
                  {logs.map((log, index) => (
                    <AuditTimelineItem key={log.id} log={log} isLast={index === logs.length - 1} />
                  ))}
                </ol>
              )}
            </div>

            {/* Desktop: dense table */}
            <div className="table-shell hidden min-w-0 overflow-x-auto lg:block">
              <table className="w-full min-w-[52rem] text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50/90 text-[11px] font-semibold tracking-wide text-zinc-500 uppercase dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-400">
                  <tr>
                    <th className="px-3 py-2.5">Cuándo</th>
                    <th className="px-3 py-2.5">Acción</th>
                    <th className="px-3 py-2.5">Actor</th>
                    <th className="min-w-0 px-3 py-2.5">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {logs.map((log) => {
                    const variant = actionBadgeVariant(log.action);
                    const detailText = formatDetails(log.details);
                    return (
                      <tr
                        key={log.id}
                        className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
                      >
                        <td className="text-text-secondary px-3 py-2.5 text-xs whitespace-nowrap tabular-nums">
                          <time dateTime={log.created_at}>
                            {format(new Date(log.created_at), 'dd MMM yyyy · HH:mm', {
                              locale: es,
                            })}
                          </time>
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant={variant}>{actionLabel(log.action)}</Badge>
                        </td>
                        <td className="max-w-[14rem] min-w-0 px-3 py-2.5">
                          <p className="text-text truncate font-semibold">
                            {log.user_name ?? 'Sistema'}
                          </p>
                          {log.user_email ? (
                            <p
                              className="text-text-secondary truncate text-[11px]"
                              title={log.user_email}
                            >
                              {log.user_email}
                            </p>
                          ) : null}
                        </td>
                        <td className="text-text-secondary max-w-[28rem] min-w-0 px-3 py-2.5 text-xs">
                          <p className="line-clamp-2 break-words" title={detailText}>
                            {detailText}
                          </p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
