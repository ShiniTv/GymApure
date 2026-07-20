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
import { QuickAction } from '../admin/QuickAction';
import { Button, Card, DashboardSkeleton, EmptyState } from '../ui';
import ReceptionActivityFeed from './ReceptionActivityFeed';
import BrandName from '../BrandName';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { PullToRefreshContainer } from '../PullToRefresh';
import { useReceptionStatsQuery } from '../../hooks/queries/useReceptionStatsQuery';

type KpiTone = 'orange' | 'emerald' | 'blue';

interface KpiItem {
  title: string;
  value: number;
  icon: LucideIcon;
  tone: KpiTone;
  to?: string;
}

const kpiToneMap: Record<KpiTone, string> = {
  orange: 'text-brand dark:text-brand',
  emerald: 'text-emerald-600 dark:text-emerald-500',
  blue: 'text-blue-600 dark:text-blue-500',
};

function ReceptionKpiStrip({ items }: { items: KpiItem[] }) {
  return (
    <Card padding="none" rounded="xl" className="overflow-hidden">
      <div className="grid grid-cols-3 divide-x divide-zinc-200 dark:divide-zinc-800">
        {items.map((item) => {
          const content = (
            <div className="px-2.5 py-3 text-center sm:px-3.5 sm:py-3.5">
              <div className="mb-1 flex min-w-0 items-center justify-center gap-1">
                <item.icon
                  className={cn('h-3.5 w-3.5 shrink-0', kpiToneMap[item.tone])}
                  aria-hidden
                />
                <p className="truncate text-[9px] leading-tight font-semibold tracking-wide text-zinc-500 uppercase sm:text-[10px] dark:text-zinc-400">
                  {item.title}
                </p>
              </div>
              <p className="text-xl leading-none font-bold text-zinc-900 tabular-nums sm:text-2xl dark:text-white">
                {item.value}
              </p>
            </div>
          );

          if (item.to) {
            return (
              <Link
                key={item.title}
                to={item.to}
                className="transition-colors hover:bg-zinc-50 active:bg-zinc-100 dark:hover:bg-zinc-800/40 dark:active:bg-zinc-800/60"
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
    </Card>
  );
}

function PendingPaymentsBanner({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <Link
      to="/payments?status=pending"
      className="border-brand/30 bg-brand/5 hover:bg-brand/10 flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 transition-colors"
    >
      <div className="flex min-w-0 items-center gap-2">
        <CreditCard className="text-brand h-4 w-4 shrink-0" />
        <span className="text-brand dark:text-brand truncate text-xs font-semibold">
          {count} pago{count !== 1 ? 's' : ''} pendiente{count !== 1 ? 's' : ''} de aprobar
        </span>
      </div>
      <span className="text-brand dark:text-brand shrink-0 text-[10px] font-bold">Revisar</span>
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
      <div {...ptrHandlers} className={cn('space-y-3', compact && 'space-y-2.5')}>
        {!compact && (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-zinc-900 sm:text-lg dark:text-white">
                Resumen del día · <BrandName variant="plain" className="text-brand" />
              </h2>
              <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                Desliza hacia abajo o toca actualizar para refrescar KPIs
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => void refresh()}
                disabled={refreshing}
                className="hover:text-brand hover:border-brand/30 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition-colors disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400"
                aria-label="Actualizar resumen"
                title="Actualizar"
              >
                <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
              </button>
              <span className="relative inline-flex">
                <button
                  type="button"
                  onClick={onOpenCounter}
                  className="brand-solid brand-solid-hover inline-flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-xl px-0 py-0 text-sm font-semibold shadow-md shadow-zinc-900/10 transition-colors lg:h-auto lg:min-h-10 lg:w-auto lg:px-4 lg:py-2.5"
                  aria-label={
                    pendingPayments > 0
                      ? `Modo mostrador (${pendingPayments} pagos pendientes)`
                      : 'Modo mostrador'
                  }
                  title="Modo mostrador"
                >
                  <Monitor className="h-4 w-4 shrink-0" />
                  <span className="hidden whitespace-nowrap lg:inline">Modo mostrador</span>
                </button>
                {pendingPayments > 0 && (
                  <span className="text-brand border-brand/20 dark:border-brand/30 pointer-events-none absolute -top-1 -right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full border bg-white px-1 text-[9px] font-bold shadow-sm dark:bg-zinc-900">
                    {pendingPayments > 99 ? '99+' : pendingPayments}
                  </span>
                )}
              </span>
              <Link
                to="/check-in?kiosk=1"
                className="hover:text-brand hover:border-brand/30 inline-flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-xl border border-zinc-200 px-0 text-zinc-600 transition-colors lg:h-auto lg:min-h-10 lg:w-auto lg:px-3 dark:border-zinc-700 dark:text-zinc-400"
                title="Pantalla de acceso (tablet)"
                aria-label="Modo tablet"
              >
                <Tablet className="h-4 w-4 shrink-0" />
                <span className="hidden text-xs font-semibold whitespace-nowrap lg:inline">
                  Modo tablet
                </span>
              </Link>
            </div>
          </div>
        )}

        <PendingPaymentsBanner count={pendingPayments} />

        <Link
          to="/reception?mode=counter&tab=access"
          className="border-brand/25 bg-brand/5 hover:bg-brand/10 active:bg-brand/15 flex min-h-[var(--touch-min)] touch-manipulation items-center gap-3 rounded-xl border px-4 py-3 transition-colors lg:hidden"
          aria-label="Abrir mostrador: check-in y acceso"
        >
          <span className="brand-solid inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white">
            <Fingerprint className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-zinc-900 dark:text-white">Abrir mostrador</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Check-in y acceso de miembros
            </p>
          </div>
        </Link>

        <div className="grid gap-3 md:grid-cols-5 md:items-stretch">
          <div className="space-y-2.5 md:col-span-2">
            <ReceptionKpiStrip
              items={[
                {
                  title: 'Ingresos hoy',
                  value: stats?.todayCheckIns ?? 0,
                  icon: Fingerprint,
                  tone: 'orange',
                },
                {
                  title: 'Dentro ahora',
                  value: stats?.insideNow ?? 0,
                  icon: Users,
                  tone: 'emerald',
                  to: '/reception?mode=counter&tab=inside',
                },
                {
                  title: 'Pagos pend.',
                  value: pendingPayments,
                  icon: CreditCard,
                  tone: 'blue',
                  to: '/payments?status=pending',
                },
              ]}
            />

            <div className="hidden grid-cols-3 gap-2 md:grid-cols-1 lg:grid">
              <QuickAction
                to="/members"
                icon={UserPlus}
                title="Miembros"
                description="Registrar personas nuevas"
                tone="blue"
                compact
                iconOnlyMobile
                showDescriptionFrom="lg"
              />
              <QuickAction
                to="/payments?status=pending"
                icon={CreditCard}
                title="Pagos"
                description="Aprobar pagos del mostrador"
                count={pendingPayments}
                tone="emerald"
                compact
                iconOnlyMobile
                showDescriptionFrom="lg"
              />
              <QuickAction
                to="/reception?mode=counter"
                icon={Monitor}
                title="Mostrador"
                description="Atajos F1/F2"
                tone="orange"
                compact
                iconOnlyMobile
                showDescriptionFrom="lg"
              />
            </div>
          </div>

          <Card
            padding="sm"
            rounded="xl"
            className="flex min-h-[180px] flex-col md:col-span-3 md:min-h-[240px]"
          >
            <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900 dark:text-white">
                <Clock className="text-brand h-3.5 w-3.5" />
                Actividad de hoy
              </h3>
              <Link
                to="/reception?mode=counter&tab=inside"
                className="text-brand hover:text-brand shrink-0 text-[10px] font-semibold sm:text-xs"
              >
                {isMobile ? 'Ver todo' : 'Dentro ahora'}
              </Link>
            </div>
            <div className="flex min-h-0 flex-1 flex-col md:max-h-[280px] md:overflow-y-auto">
              <ReceptionActivityFeed
                limit={isMobile ? 3 : 10}
                refreshKey={refreshKey}
                compact
                className="flex flex-1 flex-col"
              />
            </div>
            {isMobile && (
              <Link
                to="/reception?mode=counter&tab=inside"
                className="text-brand hover:text-brand mt-2 block text-center text-xs font-semibold"
              >
                Ver actividad completa
              </Link>
            )}
          </Card>
        </div>
      </div>
    </PullToRefreshContainer>
  );
}
