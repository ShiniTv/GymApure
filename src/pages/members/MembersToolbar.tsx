import { useState } from 'react';
import { Plus, AlertTriangle, X, SlidersHorizontal } from 'lucide-react';
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
  needsFilter?: string;
  onTrainerRosterFilterChange?: (value: string) => void;
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
  needsFilter = '',
  onTrainerRosterFilterChange,
  onPageChange,
  membersWithoutPlanCount,
  loading,
  noPlanAlertDismissed,
  onDismissNoPlanAlert,
}: MembersToolbarProps) {
  const hasAdvancedNeeds = Boolean(needsFilter) && needsFilter !== '' && needsFilter !== 'expiring';
  const [filtersOpen, setFiltersOpen] = useState(
    () => Boolean(shiftFilter) || expiringFilter || hasAdvancedNeeds
  );

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
          <div className="border-border/80 bg-surface rounded-xl border px-3 py-2.5">
            <p className="text-text-muted text-[10px] font-semibold tracking-wide uppercase">
              Activas
            </p>
            <p className="text-text mt-0.5 text-xl font-bold tabular-nums">
              {adminStats.stats.activeSubscriptions}
            </p>
          </div>
          <div className="border-border/80 bg-surface rounded-xl border px-3 py-2.5">
            <p className="text-text-muted text-[10px] font-semibold tracking-wide uppercase">
              Por vencer ({alertDays}d)
            </p>
            <p className="text-text mt-0.5 text-xl font-bold tabular-nums">
              {adminStats.stats.expiringSoon}
            </p>
          </div>
          <div className="border-border/80 bg-surface rounded-xl border px-3 py-2.5">
            <p className="text-text-muted text-[10px] font-semibold tracking-wide uppercase">
              Pagos pend.
            </p>
            <p className="text-text mt-0.5 text-xl font-bold tabular-nums">
              {adminStats.stats.pendingPayments}
            </p>
          </div>
          <div className="border-border/80 bg-surface rounded-xl border px-3 py-2.5">
            <p className="text-text-muted text-[10px] font-semibold tracking-wide uppercase">
              En lista
            </p>
            <p className="text-text mt-0.5 text-xl font-bold tabular-nums">{total}</p>
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
          {(userRole === 'admin' || userRole === 'receptionist' || isTrainer) && (
            <Button
              type="button"
              size="sm"
              variant={filtersOpen ? 'secondary' : 'ghost'}
              className="h-10 min-h-10 w-10 shrink-0 p-0 sm:h-11 sm:min-h-11 sm:w-auto sm:gap-1.5 sm:px-3"
              aria-expanded={filtersOpen}
              aria-label="Más filtros"
              onClick={() => setFiltersOpen((open) => !open)}
            >
              <SlidersHorizontal className="h-4 w-4 shrink-0" />
              <span className="hidden text-xs font-semibold sm:inline sm:text-sm">Filtros</span>
            </Button>
          )}
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
        {(userRole === 'admin' || userRole === 'receptionist' || isTrainer) && filtersOpen && (
          <div className="flex flex-col gap-2 sm:gap-2.5">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {(userRole === 'admin' || userRole === 'receptionist') && (
                <ShiftFilter value={shiftFilter} onChange={onShiftFilterChange} label="Turno" />
              )}
              {(userRole === 'admin' || isTrainer) && (
                <FilterChips
                  className="w-fit max-w-full shrink-0"
                  ariaLabel={
                    isTrainer ? 'Filtrar miembros por atención' : 'Filtrar membresías por vencer'
                  }
                  options={
                    isTrainer
                      ? [
                          { value: '', label: 'Todos' },
                          { value: 'expiring', label: `Por vencer (${alertDays}d)` },
                          { value: 'assessment', label: 'Sin evaluación' },
                          { value: 'checkin', label: 'Seguimiento' },
                          { value: 'recovery', label: 'Recuperación' },
                          { value: 'choices', label: 'Elecciones' },
                        ]
                      : [
                          { value: '', label: 'Todos' },
                          { value: 'expiring', label: `Por vencer (${alertDays}d)` },
                        ]
                  }
                  value={needsFilter || (expiringFilter ? 'expiring' : '')}
                  onChange={(v) => {
                    if (isTrainer && onTrainerRosterFilterChange) {
                      onTrainerRosterFilterChange(v);
                      onPageChange(1);
                      return;
                    }
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
          <p className="text-text-secondary min-w-0 flex-1">
            <span className="text-text font-semibold">
              {membersWithoutPlanCount === 1 ? '1 sin plan' : `${membersWithoutPlanCount} sin plan`}
            </span>
            <span className="text-text-muted"> · recepción activa el acceso</span>
          </p>
          <button
            type="button"
            onClick={onDismissNoPlanAlert}
            className="text-text-muted hover:text-text inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md hover:bg-amber-500/10"
            aria-label="Cerrar aviso"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </>
  );
}
