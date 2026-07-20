import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
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
import { Button, DashboardSkeleton, EmptyState } from '../ui';
import ReceptionActivityFeed from './ReceptionActivityFeed';
import BrandName from '../BrandName';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { PullToRefreshContainer } from '../PullToRefresh';
import { useReceptionStatsQuery } from '../../hooks/queries/useReceptionStatsQuery';
import { routePrefetchHandlers } from '../../lib/routePrefetch';

type KpiTone = 'orange' | 'emerald' | 'blue';

interface KpiItem {
  title: string;
  value: number;
  icon: LucideIcon;
  tone: KpiTone;
  to?: string;
}

const LIGHT =
  'rounded-xl border border-zinc-200/70 bg-white/80 dark:border-zinc-800/80 dark:bg-zinc-900/50';

const kpiToneMap: Record<KpiTone, string> = {
  orange: 'text-brand dark:text-brand',
  emerald: 'text-emerald-600 dark:text-emerald-500',
  blue: 'text-blue-600 dark:text-blue-500',
};

function ReceptionKpiStrip({ items }: { items: KpiItem[] }) {
  return (
    <div className={cn(LIGHT, 'overflow-hidden')}>
      <div className="grid grid-cols-3 divide-x divide-zinc-100 dark:divide-zinc-800">
        {items.map((item) => {
          const content = (
            <div className="px-2 py-2.5 text-center sm:px-3 sm:py-3">
              <div className="mb-0.5 flex min-w-0 items-center justify-center gap-1">
                <item.icon className={cn('h-3 w-3 shrink-0', kpiToneMap[item.tone])} aria-hidden />
                <p className="truncate text-[9px] leading-tight font-medium tracking-wide text-zinc-500 uppercase sm:text-[10px] dark:text-zinc-400">
                  {item.title}
                </p>
              </div>
              <p className="text-lg leading-none font-bold text-zinc-900 tabular-nums sm:text-xl dark:text-white">
                {item.value}
              </p>
            </div>
          );

          if (item.to) {
            return (
              <Link
                key={item.title}
                to={item.to}
                className="transition-colors hover:bg-zinc-50/80 active:bg-zinc-100 dark:hover:bg-zinc-800/40"
                aria-label={`${item.title}: ${item.value}`}
                title={item.title}
              >
                {content}
              </Link>
            );
          }

          return <div key={item.title}>{content}</div>;
        })}
      </div>
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
      className="inline-flex h-9 shrink-0 touch-manipulation items-center gap-1.5 rounded-full border border-zinc-200/80 bg-transparent px-3 text-[12px] font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700/80 dark:text-zinc-200 dark:hover:bg-zinc-900/60"
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
      className="border-brand/25 bg-brand/5 hover:bg-brand/10 flex items-center justify-between gap-2 rounded-xl border px-3 py-2 transition-colors"
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
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-zinc-900 dark:text-white">
                Hoy · <BrandName variant="plain" className="text-brand" />
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {(stats?.insideNow ?? 0) > 0 ? `${stats?.insideNow} dentro ahora` : 'Nadie dentro'}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                onClick={() => void refresh()}
                disabled={refreshing}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
                aria-label="Actualizar resumen"
                title="Actualizar"
              >
                <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
              </button>
              <button
                type="button"
                onClick={onOpenCounter}
                className="brand-solid brand-solid-hover hidden h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold shadow-sm lg:inline-flex"
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
                className="hidden h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 sm:inline-flex dark:text-zinc-400 dark:hover:bg-zinc-800"
                title="Pantalla de acceso (tablet)"
                aria-label="Modo tablet"
              >
                <Tablet className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}

        <PendingPaymentsBanner count={pendingPayments} />

        <Link
          to="/reception?mode=counter&tab=access"
          className="border-brand/30 bg-brand/5 hover:bg-brand/10 active:bg-brand/15 flex min-h-11 touch-manipulation items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-colors lg:hidden"
          aria-label="Abrir mostrador: check-in y acceso"
        >
          <span className="brand-solid inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white">
            <Fingerprint className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">Abrir mostrador</p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Check-in y acceso</p>
          </div>
        </Link>

        <div className="grid gap-2.5 md:grid-cols-5 md:items-stretch md:gap-3">
          <div className="space-y-2 md:col-span-2">
            <ReceptionKpiStrip
              items={[
                {
                  title: 'Ingresos',
                  value: stats?.todayCheckIns ?? 0,
                  icon: Fingerprint,
                  tone: 'orange',
                },
                {
                  title: 'Dentro',
                  value: stats?.insideNow ?? 0,
                  icon: Users,
                  tone: 'emerald',
                  to: '/reception?mode=counter&tab=inside',
                },
                {
                  title: 'Pagos',
                  value: pendingPayments,
                  icon: CreditCard,
                  tone: 'blue',
                  to: '/payments?status=pending',
                },
              ]}
            />

            <div className="hidden gap-1.5 overflow-x-auto pb-0.5 lg:flex">
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
            className={cn(LIGHT, 'flex min-h-[160px] flex-col p-3 md:col-span-3 md:min-h-[220px]')}
          >
            <div className="mb-1.5 flex shrink-0 items-center justify-between gap-2">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                <Clock className="text-brand h-3.5 w-3.5" />
                Actividad
              </h3>
              <Link
                to="/reception?mode=counter&tab=inside"
                className="text-brand shrink-0 text-[10px] font-semibold hover:underline sm:text-xs"
              >
                {isMobile ? 'Ver todo' : 'Dentro ahora'}
              </Link>
            </div>
            <div className="flex min-h-0 flex-1 flex-col md:max-h-[260px] md:overflow-y-auto">
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
