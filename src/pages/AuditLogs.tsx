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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { dateLocale as es } from '../lib/dateLocale';
import {
  Badge,
  Button,
  Card,
  PageHeader,
  Spinner,
  EmptyState,
  FilterChips,
  BackToDashboardLink,
  Input,
  Label,
} from '../components/ui';
import { clientLogger } from '../lib/clientLogger';
import { cn } from '../lib/utils';
import { auditActionLabel } from '../lib/auditLabels';

interface AuditLogRow {
  id: number;
  user_id: number | null;
  user_name: string | null;
  user_email: string | null;
  action: string;
  details: string | null;
  created_at: string;
}

interface AuditLogsResponse {
  items: AuditLogRow[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

const PAGE_SIZE = 50;

const ACTION_FILTERS = [
  { value: '', label: 'Todas' },
  { value: 'payment.approve', label: 'Pagos aprobados' },
  { value: 'payment.reject', label: 'Pagos rechazados' },
  { value: 'membership.assign', label: 'Membresías asignadas' },
  { value: 'membership.create', label: 'Planes creados' },
  { value: 'membership.update', label: 'Planes editados' },
  { value: 'membership.delete', label: 'Planes eliminados' },
  { value: 'user.create', label: 'Usuarios creados' },
  { value: 'user.role_change', label: 'Cambios de rol' },
  { value: 'report.export', label: 'Exportaciones' },
  { value: 'admin.bootstrap', label: 'Bootstrap admin' },
  { value: 'reception.check_in', label: 'Entradas' },
  { value: 'reception.check_out', label: 'Salidas' },
  { value: 'reception.walk_in', label: 'Walk-in' },
  { value: 'user.status_change', label: 'Estados' },
  { value: 'user.delete', label: 'Eliminaciones' },
  { value: 'auth.mfa.enabled', label: 'MFA activado' },
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

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [userIdFilter, setUserIdFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(offset));
      if (actionFilter) params.set('action', actionFilter);
      if (userIdFilter.trim()) params.set('user_id', userIdFilter.trim());
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);

      const res = await apiFetch(`/api/audit-logs?${params.toString()}`);
      const data = await parseJsonResponse<AuditLogsResponse>(res);
      setLogs(Array.isArray(data.items) ? data.items : []);
      setTotal(data.total ?? 0);
      setHasMore(Boolean(data.hasMore));
    } catch (err) {
      clientLogger.error('Failed to fetch audit logs', err);
      setLogs([]);
      setTotal(0);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, userIdFilter, fromDate, toDate, offset]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    setOffset(0);
  }, [actionFilter, userIdFilter, fromDate, toDate]);

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="page-stack">
      <PageHeader
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

      <FilterChips options={ACTION_FILTERS} value={actionFilter} onChange={setActionFilter} />

      <Card padding="sm" rounded="xl">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="audit-user-id">ID usuario</Label>
            <Input
              id="audit-user-id"
              type="number"
              min={1}
              value={userIdFilter}
              onChange={(e) => setUserIdFilter(e.target.value)}
              placeholder="Opcional"
            />
          </div>
          <div>
            <Label htmlFor="audit-from">Desde</Label>
            <Input
              id="audit-from"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="audit-to">Hasta</Label>
            <Input
              id="audit-to"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        </div>
      </Card>

      <Card padding="lg" rounded="2xl">
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={Shield}
            title="No hay registros"
            description="Las acciones de administradores y recepción aparecerán aquí en formato de línea de tiempo."
          />
        ) : (
          <>
            <ol className="relative space-y-0">
              {logs.map((log, index) => {
                const Icon = actionIcon(log.action);
                const variant = actionBadgeVariant(log.action);
                const isLast = index === logs.length - 1;

                return (
                  <li key={log.id} className="relative flex gap-4 pb-8">
                    {!isLast && (
                      <span
                        className="absolute top-10 bottom-0 left-5 w-px bg-zinc-200 dark:bg-zinc-800"
                        aria-hidden
                      />
                    )}
                    <div
                      className={cn(
                        'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-4 ring-white dark:ring-zinc-900',
                        variant === 'success' && 'bg-emerald-500/10 text-emerald-600',
                        variant === 'danger' && 'bg-red-500/10 text-red-600',
                        variant === 'accent' && 'bg-brand/10 text-brand',
                        variant === 'default' &&
                          'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <Badge variant={variant}>{auditActionLabel(log.action)}</Badge>
                        <time
                          className="text-xs text-zinc-400 dark:text-zinc-300"
                          dateTime={log.created_at}
                        >
                          {format(new Date(log.created_at), 'dd MMM yyyy · HH:mm', { locale: es })}
                        </time>
                      </div>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                        {log.user_name ?? 'Sistema'}
                        {log.user_email && (
                          <span className="ml-2 text-xs font-normal text-zinc-500 dark:text-zinc-400">
                            {log.user_email}
                          </span>
                        )}
                      </p>
                      <p className="mt-1 text-xs break-words text-zinc-500 dark:text-zinc-400">
                        {formatDetails(log.details)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {total} registro{total !== 1 ? 's' : ''} · página {page} de {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 px-0"
                  disabled={offset === 0}
                  onClick={() => setOffset((v) => Math.max(0, v - PAGE_SIZE))}
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 px-0"
                  disabled={!hasMore}
                  onClick={() => setOffset((v) => v + PAGE_SIZE)}
                  aria-label="Página siguiente"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
