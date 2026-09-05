import { useState } from 'react';
import { Plus, AlertTriangle, X, SlidersHorizontal, Users } from 'lucide-react';
import { Button, FilterChips, SearchInput, BackToDashboardLink } from '../../components/ui';
import { OperateHeader } from '../../components/operate/OperateChrome';
import { typography } from '../../lib/typography';
import { cn } from '../../lib/utils';
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
      <OperateHeader
        icon={Users}
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
            ? loading
              ? 'Tus miembros asignados'
              : total === 1
                ? '1 miembro asignado'
                : `${total} miembros asignados`
            : isReceptionist
              ? 'Altas y cuentas del gym'
              : 'Usuarios del gym'
        }
        action={
          <>
            <BackToDashboardLink iconOnly className="sm:hidden" />
            <span className="hidden sm:inline-flex">
              <BackToDashboardLink />
            </span>
          </>
        }
      />

      {userRole === 'admin' && adminStats?.stats && (
        <div className="hidden grid-cols-4 gap-2 lg:grid">
          <div className="border-border/80 bg-surface rounded-[var(--radius-card)] border px-3 py-2.5">
            <p className={cn(typography.statLabel)}>Activas</p>
            <p className={cn(typography.statValueSm, 'mt-0.5')}>
              {adminStats.stats.activeSubscriptions}
            </p>
          </div>
          <div className="border-border/80 bg-surface rounded-[var(--radius-card)] border px-3 py-2.5">
            <p className={cn(typography.statLabel)}>Por vencer ({alertDays}d)</p>
            <p className={cn(typography.statValueSm, 'mt-0.5')}>{adminStats.stats.expiringSoon}</p>
          </div>
          <div className="border-border/80 bg-surface rounded-[var(--radius-card)] border px-3 py-2.5">
            <p className={cn(typography.statLabel)}>Pagos pend.</p>
            <p className={cn(typography.statValueSm, 'mt-0.5')}>
              {adminStats.stats.pendingPayments}
            </p>
          </div>
          <div className="border-border/80 bg-surface rounded-[var(--radius-card)] border px-3 py-2.5">
            <p className={cn(typography.statLabel)}>En lista</p>
            <p className={cn(typography.statValueSm, 'mt-0.5')}>{total}</p>
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
          {(userRole === 'admin' || userRole === 'receptionist') && (
            <Button
              type="button"
              size="sm"
              variant={filtersOpen ? 'secondary' : 'ghost'}
              className="min-h-11 w-11 shrink-0 p-0 sm:w-auto sm:gap-1.5 sm:px-3"
              aria-expanded={filtersOpen}
              aria-label="Más filtros"
              onClick={() => setFiltersOpen((open) => !open)}
            >
              <SlidersHorizontal className="h-4 w-4 shrink-0" />
              <span className="hidden text-sm font-semibold sm:inline">Filtros</span>
            </Button>
          )}
          {canAddUser && (
            <Button
              size="sm"
              className="min-h-11 w-11 shrink-0 p-0 sm:w-auto sm:gap-1.5 sm:px-3"
              onClick={() => {
                onAdd();
              }}
              aria-label={addUserLabel}
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span className="hidden text-sm font-semibold sm:inline">{addUserLabel}</span>
            </Button>
          )}
        </div>
        {isTrainer && onTrainerRosterFilterChange ? (
          <FilterChips
            className="w-fit max-w-full"
            ariaLabel="Filtrar miembros por atención"
            options={[
              { value: '', label: 'Todos' },
              { value: 'expiring', label: `Por vencer (${alertDays}d)` },
              { value: 'assessment', label: 'Sin evaluación' },
              { value: 'checkin', label: 'Seguimiento' },
              { value: 'recovery', label: 'Recuperación' },
              { value: 'choices', label: 'Elecciones' },
            ]}
            value={needsFilter || (expiringFilter ? 'expiring' : '')}
            onChange={(v) => {
              onTrainerRosterFilterChange(v);
              onPageChange(1);
            }}
          />
        ) : null}
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
        {(userRole === 'admin' || userRole === 'receptionist') && filtersOpen && (
          <div className="flex flex-col gap-2 sm:gap-2.5">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <ShiftFilter value={shiftFilter} onChange={onShiftFilterChange} label="Turno" />
              {userRole === 'admin' && (
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
        <div className="border-border/80 bg-surface text-small flex min-h-11 items-center gap-2 rounded-[var(--radius-card)] border px-3 py-2">
          <AlertTriangle className="text-warning h-4 w-4 shrink-0" aria-hidden />
          <p className="text-text-secondary min-w-0 flex-1 leading-snug">
            <span className="text-text font-semibold">
              {membersWithoutPlanCount === 1 ? '1 sin plan' : `${membersWithoutPlanCount} sin plan`}
            </span>
            <span className="text-text-muted"> · recepción activa el acceso</span>
          </p>
          <button
            type="button"
            onClick={onDismissNoPlanAlert}
            className="text-text-muted hover:bg-surface-raised hover:text-text inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md"
            aria-label="Cerrar aviso"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  );
}
