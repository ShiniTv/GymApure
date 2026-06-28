import { useState, useEffect, useCallback } from 'react';
import { apiFetch, parseJsonResponse } from '../lib/api';
import { Shield, RefreshCw, CreditCard, UserX, UserCheck, Trash2, Fingerprint, UserPlus, LogIn, LogOut } from 'lucide-react';
import { format } from 'date-fns';
import { dateLocale as es } from '../lib/dateLocale';
import { Badge, Button, Card, PageHeader, Spinner, EmptyState, FilterChips } from '../components/ui';
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
  'reception.walk_in': 'Registro walk-in',
  'settings.expiry.update': 'Config. vencimientos',
  'settings.expiry.run': 'Job vencimientos',
  'auth.login': 'Inicio de sesión',
  'auth.logout': 'Cierre de sesión',
  'auth.register': 'Registro',
  'auth.change_password': 'Cambio contraseña',
};

const ACTION_FILTERS = [
  { value: '', label: 'Todas' },
  { value: 'payment.approve', label: 'Pagos aprobados' },
  { value: 'payment.reject', label: 'Pagos rechazados' },
  { value: 'membership.assign', label: 'Membresías' },
  { value: 'reception.check_in', label: 'Entradas' },
  { value: 'reception.check_out', label: 'Salidas' },
  { value: 'reception.walk_in', label: 'Walk-in' },
  { value: 'user.status_change', label: 'Estados' },
  { value: 'user.delete', label: 'Eliminaciones' },
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
  if (action.startsWith('payment.approve') || action.startsWith('reception.check_in')) return 'success';
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
    <div className="page-stack">
      <PageHeader
        title={<>Registro de <span className="text-brand">auditoría</span></>}
        subtitle="Acciones sensibles realizadas por el personal del gym"
        action={
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 px-0"
            onClick={loadLogs}
            aria-label="Actualizar"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        }
      />

      <FilterChips
        options={ACTION_FILTERS}
        value={actionFilter}
        onChange={setActionFilter}
      />

      <Card padding="lg" rounded="2xl">
        {loading ? (
          <div className="py-12 flex justify-center">
            <Spinner />
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={Shield}
            title="No hay registros"
            description="Las acciones de administradores y recepción aparecerán aquí en formato de línea de tiempo."
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
                      variant === 'accent' && 'bg-brand/10 text-brand',
                      variant === 'default' && 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Badge variant={variant}>{actionLabel(log.action)}</Badge>
                      <time
                        className="text-xs text-zinc-400"
                        dateTime={log.created_at}
                      >
                        {format(new Date(log.created_at), "dd MMM yyyy · HH:mm", { locale: es })}
                      </time>
                    </div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                      {log.user_name ?? 'Sistema'}
                      {log.user_email && (
                        <span className="text-zinc-500 font-normal ml-2 text-xs">
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
