import { Plus } from 'lucide-react';
import { formatMoney } from '../../lib/utils';
import {
  Button,
  PageHeader,
  FilterChips,
  BackToDashboardLink,
  SearchInput,
} from '../../components/ui';
import { paymentStatusLabel, type Payment } from './helpers';

export interface PaymentsToolbarProps {
  isMember: boolean;
  isStaffPayment: boolean;
  adminStats: {
    stats?: {
      pendingPayments: number;
      pendingPaymentsOlderThan2Days?: number;
      revenueThisMonth?: number;
    } | null;
  } | null;
  total: number;
  loading: boolean;
  paymentsCount: number;
  statusFilter: string;
  stalePending: boolean;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onClearStatusFilter: () => void;
  onOpenRegister: () => void;
}

export function PaymentsToolbar({
  isMember,
  isStaffPayment,
  adminStats,
  total,
  loading,
  paymentsCount,
  statusFilter,
  stalePending,
  searchInput,
  onSearchInputChange,
  onStatusFilterChange,
  onClearStatusFilter,
  onOpenRegister,
}: PaymentsToolbarProps) {
  return (
    <>
      <PageHeader
        compact
        showTitleOnMobile
        title={
          isMember ? (
            <>
              Mis <span className="text-brand">pagos</span>
            </>
          ) : (
            <>
              Gestión de <span className="text-brand">pagos</span>
            </>
          )
        }
        subtitle={
          isMember ? 'Activa tu membresía' : isStaffPayment ? 'Revisión y registro' : undefined
        }
        action={
          isMember ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <BackToDashboardLink />
              <Button
                size="sm"
                className="shrink-0 px-3 whitespace-nowrap"
                onClick={onOpenRegister}
                aria-label="Reportar pago"
              >
                <Plus className="h-4 w-4" />
                <span>Reportar pago</span>
              </Button>
            </div>
          ) : (
            <BackToDashboardLink />
          )
        }
      />

      {isStaffPayment && adminStats?.stats ? (
        <div className="hidden grid-cols-4 gap-2 lg:grid">
          <div className="rounded-xl border border-zinc-200/80 bg-white/70 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/40">
            <p className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              Pendientes
            </p>
            <p className="mt-0.5 text-xl font-bold text-zinc-900 tabular-nums dark:text-white">
              {adminStats.stats.pendingPayments}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200/80 bg-white/70 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/40">
            <p className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              &gt;2 días
            </p>
            <p className="mt-0.5 text-xl font-bold text-zinc-900 tabular-nums dark:text-white">
              {adminStats.stats.pendingPaymentsOlderThan2Days ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200/80 bg-white/70 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/40">
            <p className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              Ingresos mes
            </p>
            <p className="mt-0.5 text-xl font-bold text-zinc-900 tabular-nums dark:text-white">
              {formatMoney(adminStats.stats.revenueThisMonth ?? 0)}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200/80 bg-white/70 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/40">
            <p className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              En lista
            </p>
            <p className="mt-0.5 text-xl font-bold text-zinc-900 tabular-nums dark:text-white">
              {total}
            </p>
          </div>
        </div>
      ) : null}

      {isMember && !loading && (paymentsCount > 0 || Boolean(statusFilter)) && (
        <div className="flex items-center justify-between gap-2 px-0.5">
          <p className="text-text-muted min-w-0 truncate text-[11px]">
            {total} pago{total !== 1 ? 's' : ''}
            {statusFilter ? ` · ${paymentStatusLabel(statusFilter as Payment['status'])}` : ''}
          </p>
          {statusFilter ? (
            <button
              type="button"
              onClick={onClearStatusFilter}
              className="text-brand shrink-0 text-[11px] font-semibold hover:underline"
            >
              Ver todos
            </button>
          ) : null}
        </div>
      )}

      {isMember && (loading || paymentsCount > 0 || Boolean(statusFilter)) && (
        <FilterChips
          options={[
            { value: '', label: 'Todos' },
            { value: 'pending', label: 'Pendientes' },
            { value: 'approved', label: 'Aprobados' },
            { value: 'rejected', label: 'Rechazados' },
          ]}
          value={statusFilter}
          onChange={onStatusFilterChange}
        />
      )}

      {isStaffPayment ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <SearchInput
              containerClassName="min-w-0 flex-1"
              placeholder="Buscar por nombre o referencia…"
              value={searchInput}
              onChange={(e) => onSearchInputChange(e.target.value)}
              aria-label="Buscar pagos"
            />
            <Button
              size="sm"
              className="h-10 min-h-10 w-10 shrink-0 rounded-xl p-0 sm:h-11 sm:min-h-11 sm:w-auto sm:gap-1.5 sm:px-3"
              onClick={onOpenRegister}
              aria-label="Registrar pago"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span className="hidden text-xs font-semibold sm:inline sm:text-sm">Registrar</span>
            </Button>
          </div>
          <FilterChips
            className="w-fit max-w-full"
            ariaLabel="Filtrar por estado"
            options={[
              { value: '', label: 'Todos' },
              {
                value: 'pending',
                label: 'Pendientes',
                count: adminStats?.stats?.pendingPayments,
              },
              {
                value: 'pending_old',
                label: '>2 días',
                count: adminStats?.stats?.pendingPaymentsOlderThan2Days,
              },
              { value: 'approved', label: 'Aprobados' },
              { value: 'rejected', label: 'Rechazados' },
            ]}
            value={stalePending ? 'pending_old' : statusFilter}
            onChange={onStatusFilterChange}
          />
        </div>
      ) : null}
    </>
  );
}
