import { useCallback, useState } from 'react';
import { Link } from 'react-router';
import {
  Fingerprint,
  Users,
  CreditCard,
  UserPlus,
  Monitor,
  Clock,
  RefreshCw,
  Tablet,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button, DashboardSkeleton, EmptyState, StatCard } from '../ui';
import ReceptionActivityFeed from './ReceptionActivityFeed';
import { StaffPortalBanner } from '../StaffPortalBanner';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { PullToRefreshContainer } from '../PullToRefresh';
import { useReceptionStatsQuery } from '../../hooks/queries/useReceptionStatsQuery';
import { routePrefetchHandlers } from '../../lib/routePrefetch';

interface KpiItem {
  title: string;
  value: number;
  icon: LucideIcon;
  to?: string;
}

const LIGHT = 'rounded-lg border border-border/80 bg-surface';

function ReceptionKpiStrip({ items }: { items: KpiItem[] }) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {items.map((item) => (
        <StatCard
          key={item.title}
          minimal
          title={item.title}
          value={item.value}
          icon={item.icon}
          to={item.to}
          className="min-h-16"
        />
      ))}
    </div>
  );
}

function ShortcutChip({
  to,
  icon: Icon,
  label,
  count,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
  count?: number;
}) {
  return (
    <Link
      to={to}
      {...routePrefetchHandlers(to)}
      className="border-border/80 text-text-secondary hover:bg-surface-raised inline-flex h-11 shrink-0 touch-manipulation items-center gap-1.5 rounded-full border bg-transparent px-3 text-[12px] font-semibold transition-colors"
    >
      <Icon className="text-brand h-3.5 w-3.5" aria-hidden />
      {label}
      {count != null && count > 0 ? (
        <span className="bg-brand/15 text-brand ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums">
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </Link>
  );
}

function PendingPaymentsBanner({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <Link
      to="/payments?status=pending"
      className="border-brand/25 bg-brand/5 hover:bg-brand/10 flex min-h-11 items-center justify-between gap-2 rounded-lg border px-3 py-2 transition-colors"
    >
      <div className="flex min-w-0 items-center gap-2">
        <CreditCard className="text-brand h-3.5 w-3.5 shrink-0" />
        <span className="text-brand truncate text-xs font-semibold">
          {count} pago{count !== 1 ? 's' : ''} pendiente{count !== 1 ? 's' : ''}
        </span>
      </div>
      <span className="text-brand shrink-0 text-[10px] font-bold">Revisar</span>
    </Link>
  );
}

interface ReceptionHomeSummaryProps {
  onOpenCounter: () => void;
  compact?: boolean;
}

export function ReceptionHomeSummary({ onOpenCounter, compact }: ReceptionHomeSummaryProps) {
  const { isMobileShell: isMobile } = useBreakpoint();
  const [refreshKey, setRefreshKey] = useState(0);
  const {
    data: stats,
    isPending: loading,
    isError: statsError,
    isFetching,
    refetch,
  } = useReceptionStatsQuery();

  const refresh = useCallback(async () => {
    await refetch();
    setRefreshKey((k) => k + 1);
  }, [refetch]);

  const {
    pullDistance,
    isRefreshing: ptrRefreshing,
    handlers: ptrHandlers,
  } = usePullToRefresh({
    onRefresh: refresh,
    threshold: 80,
  });

  const pendingPayments = stats?.pendingPayments ?? 0;
  const refreshing = isFetching && !loading;

  if (loading && !stats) {
    return <DashboardSkeleton statCount={3} />;
  }

  if (statsError && !stats) {
    return (
      <EmptyState
        icon={Fingerprint}
        title="No se pudo cargar el resumen"
        description="Revisa tu conexión e inténtalo de nuevo."
        action={
          <Button size="sm" onClick={() => void refresh()} loading={refreshing}>
            Reintentar
          </Button>
        }
      />
    );
  }

  return (
    <PullToRefreshContainer pullDistance={pullDistance} isRefreshing={ptrRefreshing}>
      <div {...ptrHandlers} className={cn('space-y-2.5', compact && 'space-y-2')}>
        {!compact && (
          <StaffPortalBanner
            eyebrow="Recepción"
            title="Operación de hoy"
            subtitle={
              (stats?.insideNow ?? 0) > 0 ? `${stats?.insideNow} dentro ahora` : 'Nadie dentro'
            }
            action={
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => void refresh()}
                  disabled={refreshing}
                  className="text-text-muted hover:bg-surface-raised inline-flex h-11 w-11 items-center justify-center rounded-lg transition-colors disabled:opacity-50"
                  aria-label="Actualizar resumen"
                  title="Actualizar"
                >
                  <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
                </button>
                <button
                  type="button"
                  onClick={onOpenCounter}
                  className="brand-solid brand-solid-hover hidden h-11 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold lg:inline-flex"
                  aria-label={
                    pendingPayments > 0
                      ? `Modo mostrador (${pendingPayments} pagos pendientes)`
                      : 'Modo mostrador'
                  }
                >
                  <Monitor className="h-3.5 w-3.5" />
                  Mostrador
                  {pendingPayments > 0 && (
                    <span className="rounded-full bg-white/20 px-1.5 text-[10px] tabular-nums">
                      {pendingPayments > 99 ? '99+' : pendingPayments}
                    </span>
                  )}
                </button>
                <Link
                  to="/check-in?kiosk=1"
                  className="text-text-muted hover:bg-surface-raised hidden h-11 w-11 items-center justify-center rounded-lg transition-colors sm:inline-flex"
                  title="Pantalla de acceso (tablet)"
                  aria-label="Modo tablet"
                >
                  <Tablet className="h-4 w-4" />
                </Link>
              </div>
            }
          />
        )}

        <PendingPaymentsBanner count={pendingPayments} />

        <Link
          to="/reception?mode=counter&tab=access"
          className="border-brand/30 bg-brand/5 hover:bg-brand/10 active:bg-brand/15 flex min-h-11 touch-manipulation items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-colors lg:hidden"
          aria-label="Abrir mostrador: check-in y acceso"
        >
          <span className="brand-solid inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white">
            <Fingerprint className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-text text-sm font-semibold">Abrir mostrador</p>
            <p className="text-text-muted text-[11px]">Check-in y acceso</p>
          </div>
        </Link>

        <div className="grid gap-3 md:grid-cols-5 md:items-stretch md:gap-4">
          <div className="space-y-2 md:col-span-2">
            <ReceptionKpiStrip
              items={[
                {
                  title: 'Ingresos',
                  value: stats?.todayCheckIns ?? 0,
                  icon: Fingerprint,
                },
                {
                  title: 'Dentro',
                  value: stats?.insideNow ?? 0,
                  icon: Users,
                  to: '/reception?mode=counter&tab=inside',
                },
                {
                  title: 'Pagos',
                  value: pendingPayments,
                  icon: CreditCard,
                  to: '/payments?status=pending',
                },
              ]}
            />

            <div className="hidden flex-wrap gap-1.5 pb-0.5 lg:flex">
              <ShortcutChip to="/members" icon={UserPlus} label="Miembros" />
              <ShortcutChip
                to="/payments?status=pending"
                icon={CreditCard}
                label="Pagos"
                count={pendingPayments}
              />
              <ShortcutChip to="/reception?mode=counter" icon={Monitor} label="Mostrador" />
            </div>
          </div>

          <div
            className={cn(LIGHT, 'flex min-h-[120px] flex-col p-3 md:col-span-3 md:min-h-[140px]')}
          >
            <div className="mb-1.5 flex shrink-0 items-center justify-between gap-2">
              <h3 className="text-text flex items-center gap-1.5 text-xs font-semibold">
                <Clock className="text-brand h-3.5 w-3.5" />
                Actividad
              </h3>
              <Link
                to="/reception?mode=counter&tab=inside"
                className="text-brand inline-flex min-h-11 shrink-0 items-center text-[10px] font-semibold hover:underline sm:text-xs"
              >
                {isMobile ? 'Ver todo' : 'Dentro ahora'}
              </Link>
            </div>
            <div className="flex min-h-0 flex-1 flex-col">
              <ReceptionActivityFeed
                limit={isMobile ? 3 : 10}
                refreshKey={refreshKey}
                compact
                className="flex flex-1 flex-col"
              />
            </div>
          </div>
        </div>
      </div>
    </PullToRefreshContainer>
  );
}
