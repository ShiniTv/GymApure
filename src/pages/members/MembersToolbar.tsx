import { Plus, AlertTriangle, X } from 'lucide-react';
import {
  Button,
  PageHeader,
  FilterChips,
  SearchInput,
  BackToDashboardLink,
} from '../../components/ui';
import { ShiftFilter } from '../../components/trainers/ShiftFilter';
import { type TrainingShift } from '../../lib/trainingShift';
import { type UserRole } from '../../lib/roles';
import { MEMBER_ROLE_FILTER_OPTIONS } from './useMembersPage';

export interface MembersToolbarProps {
  isTrainer: boolean;
  isReceptionist: boolean;
  userRole: string | undefined;
  adminStats: {
    stats?: {
      activeSubscriptions: number;
      expiringSoon: number;
      pendingPayments: number;
    } | null;
  } | null;
  alertDays: number;
  total: number;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  canAddUser: boolean;
  addUserLabel: string;
  onAdd: () => void;
  roleFilter: UserRole | '';
  onRoleFilterChange: (value: UserRole | '') => void;
  shiftFilter: TrainingShift | '';
  onShiftFilterChange: (shift: TrainingShift | '') => void;
  expiringFilter: boolean;
  onExpiringFilterChange: (value: boolean) => void;
  onPageChange: (page: number) => void;
  membersWithoutPlanCount: number;
  loading: boolean;
  noPlanAlertDismissed: boolean;
  onDismissNoPlanAlert: () => void;
}

export function MembersToolbar({
  isTrainer,
  isReceptionist,
  userRole,
  adminStats,
  alertDays,
  total,
  searchInput,
  onSearchInputChange,
  canAddUser,
  addUserLabel,
  onAdd,
  roleFilter,
  onRoleFilterChange,
  shiftFilter,
  onShiftFilterChange,
  expiringFilter,
  onExpiringFilterChange,
  onPageChange,
  membersWithoutPlanCount,
  loading,
  noPlanAlertDismissed,
  onDismissNoPlanAlert,
}: MembersToolbarProps) {
  return (
    <>
      <PageHeader
        compact
        title={
          isTrainer ? (
            <>
              Mis <span className="text-brand">miembros</span>
            </>
          ) : isReceptionist ? (
            <>
              Registro de <span className="text-brand">miembros</span>
            </>
          ) : (
            <>
              Gestión de <span className="text-brand">usuarios</span>
            </>
          )
        }
        subtitle={
          isTrainer
            ? 'Tus miembros asignados'
            : isReceptionist
              ? 'Altas y cuentas del gym'
              : 'Usuarios del gym'
        }
        action={<BackToDashboardLink />}
      />

      {userRole === 'admin' && adminStats?.stats && (
        <div className="hidden grid-cols-4 gap-2 lg:grid">
          <div className="rounded-xl border border-zinc-200/80 bg-white/70 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/40">
            <p className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              Activas
            </p>
            <p className="mt-0.5 text-xl font-bold text-zinc-900 tabular-nums dark:text-white">
              {adminStats.stats.activeSubscriptions}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200/80 bg-white/70 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/40">
            <p className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              Por vencer ({alertDays}d)
            </p>
            <p className="mt-0.5 text-xl font-bold text-zinc-900 tabular-nums dark:text-white">
              {adminStats.stats.expiringSoon}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200/80 bg-white/70 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/40">
            <p className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              Pagos pend.
            </p>
            <p className="mt-0.5 text-xl font-bold text-zinc-900 tabular-nums dark:text-white">
              {adminStats.stats.pendingPayments}
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
      )}

      <div className="space-y-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <SearchInput
            containerClassName="min-w-0 flex-1"
            placeholder="Buscar nombre o cédula…"
            value={searchInput}
            onChange={(e) => {
              onSearchInputChange(e.target.value);
            }}
          />
          {canAddUser && (
            <Button
              size="sm"
              className="h-10 min-h-10 w-10 shrink-0 rounded-xl p-0 sm:h-11 sm:min-h-11 sm:w-auto sm:gap-1.5 sm:px-3"
              onClick={() => {
                onAdd();
              }}
              aria-label={addUserLabel}
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span className="hidden text-xs font-semibold sm:inline sm:text-sm">
                {addUserLabel}
              </span>
            </Button>
          )}
        </div>
        {(userRole === 'admin' || userRole === 'receptionist' || isTrainer) && (
          <div className="flex flex-col gap-2 sm:gap-2.5">
            {userRole === 'admin' && (
              <FilterChips
                className="w-fit max-w-full"
                ariaLabel="Filtrar por rol"
                options={MEMBER_ROLE_FILTER_OPTIONS}
                value={roleFilter}
                onChange={(v) => {
                  onRoleFilterChange(v as UserRole | '');
                  if (v && v !== 'member') onExpiringFilterChange(false);
                  onPageChange(1);
                }}
              />
            )}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {(userRole === 'admin' || userRole === 'receptionist') && (
                <ShiftFilter value={shiftFilter} onChange={onShiftFilterChange} label="Turno" />
              )}
              {(userRole === 'admin' || isTrainer) && (
                <FilterChips
                  className="w-fit max-w-full shrink-0"
                  ariaLabel="Filtrar membresías por vencer"
                  options={[
                    { value: '', label: 'Todos' },
                    { value: 'expiring', label: `Por vencer (${alertDays}d)` },
                  ]}
                  value={expiringFilter ? 'expiring' : ''}
                  onChange={(v) => {
                    onExpiringFilterChange(v === 'expiring');
                    if (v === 'expiring') onRoleFilterChange('member');
                    onPageChange(1);
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {isTrainer && membersWithoutPlanCount > 0 && !loading && !noPlanAlertDismissed && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-2.5 py-1.5 text-[11px]">
          <AlertTriangle className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="min-w-0 flex-1 text-zinc-600 dark:text-zinc-300">
            <span className="font-semibold text-zinc-900 dark:text-white">
              {membersWithoutPlanCount === 1 ? '1 sin plan' : `${membersWithoutPlanCount} sin plan`}
            </span>
            <span className="text-zinc-500 dark:text-zinc-400">
              {' '}
              · recepción activa el check-in
            </span>
          </p>
          <button
            type="button"
            onClick={onDismissNoPlanAlert}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-400 hover:bg-amber-500/10 hover:text-zinc-700 dark:hover:text-zinc-200"
            aria-label="Cerrar aviso"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </>
  );
}
