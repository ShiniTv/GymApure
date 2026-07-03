import { useCallback, useEffect, useState } from 'react';
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
import { apiFetch, parseJsonResponse } from '../../lib/api';
import { QuickAction } from '../admin/QuickAction';
import { Card, DashboardSkeleton } from '../ui';
import ReceptionActivityFeed from './ReceptionActivityFeed';
import BrandName from '../BrandName';

interface ReceptionStats {
  todayCheckIns: number;
  insideNow: number;
  pendingPayments: number;
}

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
            <div className="px-2.5 py-3 sm:px-3.5 sm:py-3.5 text-center">
              <div className="flex items-center justify-center gap-1 mb-1 min-w-0">
                <item.icon className={cn('h-3.5 w-3.5 shrink-0', kpiToneMap[item.tone])} aria-hidden />
                <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 leading-tight truncate">
                  {item.title}
                </p>
              </div>
              <p className="text-xl sm:text-2xl font-bold tabular-nums text-zinc-900 dark:text-white leading-none">
                {item.value}
              </p>
            </div>
          );

          if (item.to) {
            return (
              <Link
                key={item.title}
                to={item.to}
                className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40 active:bg-zinc-100 dark:active:bg-zinc-800/60"
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
      className="flex items-center justify-between gap-2 rounded-xl border border-brand/30 bg-brand/5 px-3 py-2.5 transition-colors hover:bg-brand/10"
    >
      <div className="flex items-center gap-2 min-w-0">
        <CreditCard className="h-4 w-4 text-brand shrink-0" />
        <span className="text-xs font-semibold text-brand dark:text-brand truncate">
          {count} pago{count !== 1 ? 's' : ''} pendiente{count !== 1 ? 's' : ''} de aprobar
        </span>
      </div>
      <span className="text-[10px] font-bold text-brand dark:text-brand shrink-0">Revisar</span>
    </Link>
  );
}

async function fetchReceptionStats(): Promise<ReceptionStats | null> {
  const res = await apiFetch('/api/stats/reception');
  return parseJsonResponse<ReceptionStats>(res);
}

interface ReceptionHomeSummaryProps {
  onOpenCounter: () => void;
  compact?: boolean;
}

export function ReceptionHomeSummary({ onOpenCounter, compact }: ReceptionHomeSummaryProps) {
  const [stats, setStats] = useState<ReceptionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await fetchReceptionStats();
      setStats(data);
      setRefreshKey((k) => k + 1);
    } catch {
      setStats(null);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchReceptionStats()
      .then((data) => setStats(data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const pendingPayments = stats?.pendingPayments ?? 0;

  if (loading) {
    return <DashboardSkeleton statCount={3} />;
  }

  return (
    <div className={cn('space-y-3', compact && 'space-y-2.5')}>
      {!compact && (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">
              Resumen del día · <BrandName variant="plain" className="text-brand" />
            </h2>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              Desliza hacia abajo en móvil para actualizar KPIs
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={refreshing}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-brand hover:border-brand/30 transition-colors disabled:opacity-50"
              aria-label="Actualizar resumen"
              title="Actualizar"
            >
              <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
            </button>
            <span className="relative inline-flex">
              <button
                type="button"
                onClick={onOpenCounter}
                className="inline-flex h-9 w-9 lg:h-auto lg:min-h-10 lg:w-auto shrink-0 items-center justify-center gap-2 rounded-xl brand-solid brand-solid-hover px-0 py-0 lg:px-4 lg:py-2.5 text-sm font-semibold shadow-md shadow-zinc-900/10 transition-colors"
                aria-label={
                  pendingPayments > 0
                    ? `Modo mostrador (${pendingPayments} pagos pendientes)`
                    : 'Modo mostrador'
                }
                title="Modo mostrador"
              >
                <Monitor className="h-4 w-4 shrink-0" />
                <span className="hidden lg:inline whitespace-nowrap">Modo mostrador</span>
              </button>
              {pendingPayments > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[1rem] h-4 px-1 flex items-center justify-center rounded-full bg-white dark:bg-zinc-900 text-brand text-[9px] font-bold shadow-sm border border-brand/20 dark:border-brand/30 pointer-events-none">
                  {pendingPayments > 99 ? '99+' : pendingPayments}
                </span>
              )}
            </span>
            <Link
              to="/check-in?kiosk=1"
              className="inline-flex h-9 w-9 lg:h-auto lg:min-h-10 lg:w-auto shrink-0 items-center justify-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 px-0 lg:px-3 text-zinc-600 dark:text-zinc-400 hover:text-brand hover:border-brand/30 transition-colors"
              title="Kiosk tablet (pantalla completa)"
              aria-label="Abrir kiosk tablet"
            >
              <Tablet className="h-4 w-4 shrink-0" />
              <span className="hidden lg:inline text-xs font-semibold whitespace-nowrap">Kiosk</span>
            </Link>
          </div>
        </div>
      )}

      <PendingPaymentsBanner count={pendingPayments} />

      <div className="grid gap-3 md:grid-cols-5 md:items-stretch">
        <div className="md:col-span-2 space-y-2.5">
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

          <div className="grid grid-cols-3 gap-2 md:grid-cols-1">
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
              description="Aprobar pagos walk-in"
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

        <Card padding="sm" rounded="xl" className="md:col-span-3 flex flex-col min-h-[180px] md:min-h-[240px]">
          <div className="flex items-center justify-between gap-2 mb-2 shrink-0">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-brand" />
              Actividad de hoy
            </h3>
            <Link
              to="/reception?mode=counter&tab=inside"
              className="text-[10px] sm:text-xs font-semibold text-brand hover:text-brand shrink-0"
            >
              Dentro ahora
            </Link>
          </div>
          <div className="flex-1 min-h-0 flex flex-col md:overflow-y-auto md:max-h-[280px]">
            <ReceptionActivityFeed limit={10} refreshKey={refreshKey} compact className="flex-1 flex flex-col" />
          </div>
        </Card>
      </div>
    </div>
  );
}
