import { lazy, Suspense, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAdminStats } from '../../context/AdminStatsContext';
import { expiryBannerClasses, formatExpiryLabel, getExpirySeverity } from '../../lib/expiryUtils';
import {
  checkInsTrend,
  revenueMonthTrend,
  fillDailyRevenueSeries,
} from '../../lib/dashboardTrends';
import {
  DollarSign,
  Activity,
  Clock,
  AlertTriangle,
  CalendarClock,
  Settings2,
  Fingerprint,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  UtensilsCrossed,
  FileSpreadsheet,
  Wrench,
  Monitor,
  Mail,
  Inbox,
  CalendarDays,
  LogIn,
} from 'lucide-react';
import { QuickAction } from '../../components/admin/QuickAction';
import { DashboardSection } from '../../components/admin/DashboardSection';
import { StaffPortalBanner } from '../../components/StaffPortalBanner';
import { format } from 'date-fns';
import { dateLocale as es } from '../../lib/dateLocale';
import {
  StatCard,
  Card,
  PageHeader,
  Badge,
  Button,
  Skeleton,
  SegmentedControl,
  EmptyState,
} from '../../components/ui';
import { cn, formatMoney } from '../../lib/utils';
import { StaggerContainer, StaggerItem } from '../../components/animations';
import { usePageTitle } from '../../hooks/usePageTitle';
import { apiFetch, parseJsonSafe } from '../../lib/api';
import {
  readAdminFavorites,
  resolveAdminFavoriteItems,
  ADMIN_FAVORITES_CHANGED_EVENT,
} from '../../lib/adminFavorites';

const RevenueChart = lazy(() => import('../../components/RevenueChart'));

type RevenueRange = '7d' | '30d' | '6m';

export default function AdminDashboard() {
  usePageTitle('Panel');
  const adminStats = useAdminStats();
  const [showRevenueChart, setShowRevenueChart] = useState(false);
  const [showExpiringList, setShowExpiringList] = useState(false);
  const [revenueRange, setRevenueRange] = useState<RevenueRange>('7d');
  const [emailConfigured, setEmailConfigured] = useState<boolean | null>(null);
  const [favoriteHrefs, setFavoriteHrefs] = useState(() => readAdminFavorites());

  const stats = adminStats.stats;
  const alertDays = stats?.expiryAlertDays ?? 7;
  const expiringList = stats?.expiringList ?? [];
  const favoriteItems = resolveAdminFavoriteItems(favoriteHrefs);

  useEffect(() => {
    const syncFavorites = () => setFavoriteHrefs(readAdminFavorites());
    window.addEventListener('storage', syncFavorites);
    window.addEventListener('focus', syncFavorites);
    window.addEventListener(ADMIN_FAVORITES_CHANGED_EVENT, syncFavorites);
    return () => {
      window.removeEventListener('storage', syncFavorites);
      window.removeEventListener('focus', syncFavorites);
      window.removeEventListener(ADMIN_FAVORITES_CHANGED_EVENT, syncFavorites);
    };
  }, []);

  useEffect(() => {
    apiFetch('/api/health/ops')
      .then((res) => parseJsonSafe<{ email?: { configured?: boolean } }>(res))
      .then((data) => {
        if (typeof data.email?.configured === 'boolean') {
          setEmailConfigured(data.email.configured);
        } else {
          setEmailConfigured(null);
        }
      })
      .catch(() => {
        setEmailConfigured(null);
      });
  }, []);

  useEffect(() => {
    if (!stats) return;
    const critical = expiringList.filter(
      (item) => getExpirySeverity(item.days_remaining, alertDays) === 'critical'
    ).length;
    if (critical === 0) return;
    const key = `cg-dashboard-expiring-${format(new Date(), 'yyyy-MM-dd')}`;
    if (sessionStorage.getItem(key)) return;
    setShowExpiringList(true);
    sessionStorage.setItem(key, '1');
  }, [stats, expiringList, alertDays]);

  if (adminStats.error && !stats) {
    return (
      <div className="space-y-2.5 sm:space-y-3">
        <PageHeader
          compact
          title={
            <>
              Administración <span className="text-brand">general</span>
            </>
          }
        />
        <EmptyState
          icon={AlertTriangle}
          title="No se pudo cargar el panel"
          description="Revisa tu conexión e inténtalo de nuevo."
          action={
            <Button variant="secondary" size="sm" onClick={() => void adminStats.refresh()}>
              Reintentar
            </Button>
          }
        />
      </div>
    );
  }

  const pendingPayments = stats?.pendingPayments ?? 0;
  const expiringSoon = stats?.expiringSoon ?? 0;
  const criticalExpiring = expiringList.filter(
    (item) => getExpirySeverity(item.days_remaining, alertDays) === 'critical'
  ).length;
  const criticalItems = expiringList.filter(
    (item) => getExpirySeverity(item.days_remaining, alertDays) === 'critical'
  );
  const previewExpiring = expiringList.slice(0, 5);
  const revenueThisMonth = stats?.revenueThisMonth ?? 0;
  const revenueLastMonth = stats?.revenueLastMonth ?? 0;
  const yesterdayCheckIns = stats?.yesterdayCheckIns ?? 0;
  const totalRevenue = stats?.totalRevenue ?? 0;
  const checkInTrend = checkInsTrend(stats?.todayCheckIns ?? 0, yesterdayCheckIns);
  const monthTrend = revenueMonthTrend(revenueThisMonth, revenueLastMonth);

  const revenueChartData =
    revenueRange === '6m'
      ? (stats?.revenueHistory ?? []).map((row) => ({ period: row.month, income: row.income }))
      : fillDailyRevenueSeries(stats?.revenueDaily ?? [], revenueRange === '7d' ? 7 : 30);

  const revenueChartMode = revenueRange === '6m' ? ('month' as const) : ('day' as const);

  const equipmentOutOfService = stats?.equipmentOutOfService ?? 0;
  const equipmentInspectionsDue = stats?.equipmentInspectionsDue ?? 0;
  const equipmentAlertCount = equipmentOutOfService + equipmentInspectionsDue;
  const pendingOld = stats?.pendingPaymentsOlderThan2Days ?? 0;
  const classFill = stats?.classFillPercentToday ?? 0;
  const demoPending = stats?.demoLeadsPending ?? 0;
  const pausedSubs = stats?.pausedSubscriptions ?? 0;

  return (
    <div className="space-y-2.5 sm:space-y-3">
      <StaffPortalBanner
        eyebrow="Panel administrativo"
        title={
          <>
            Administración <span className="text-brand">general</span>
          </>
        }
        subtitle="Supervisión y gestión del gym"
      />

      {emailConfigured === false && (
        <Link
          to="/settings"
          className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 transition-colors hover:bg-amber-500/15"
        >
          <Mail className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
              Correo SMTP no configurado
            </p>
            <p className="mt-0.5 text-xs text-amber-800/80 dark:text-amber-300/80">
              Bienvenidas, resets y avisos no se enviarán. Configure SMTP en el servidor o revise
              Configuración.
            </p>
          </div>
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-amber-600" />
        </Link>
      )}

      <div className="grid grid-cols-2 gap-2 sm:hidden">
        {pendingPayments > 0 && (
          <Link
            to="/payments?status=pending"
            className="flex items-center justify-between gap-2 rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 transition-colors hover:bg-red-500/10"
          >
            <div className="flex min-w-0 items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
              <span className="truncate text-xs font-semibold text-red-700 dark:text-red-400">
                {pendingPayments} pago{pendingPayments !== 1 ? 's' : ''} pendiente
                {pendingPayments !== 1 ? 's' : ''}
              </span>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-red-500" />
          </Link>
        )}
        {equipmentOutOfService > 0 && (
          <Link
            to="/equipment"
            className="flex items-center justify-between gap-2 rounded-xl border border-orange-500/30 bg-orange-500/5 px-3 py-2 transition-colors hover:bg-orange-500/10"
          >
            <div className="flex min-w-0 items-center gap-2">
              <Wrench className="h-4 w-4 shrink-0 text-orange-500" />
              <span className="truncate text-xs font-semibold text-orange-700 dark:text-orange-400">
                {equipmentOutOfService} equipo{equipmentOutOfService !== 1 ? 's' : ''} fuera de
                servicio
              </span>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-orange-500" />
          </Link>
        )}
      </div>

      <StaggerContainer className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 [&>*]:h-full">
        <StaggerItem>
          <StatCard
            compact
            title="Ingresos (mes)"
            value={formatMoney(revenueThisMonth)}
            icon={DollarSign}
            color="emerald"
            trend={monthTrend.label}
            trendTone={monthTrend.tone}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            compact
            title="Activas"
            value={stats?.activeSubscriptions || 0}
            icon={Activity}
            color="blue"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            compact
            title="Check-ins hoy"
            value={stats?.todayCheckIns || 0}
            icon={Clock}
            color="emerald"
            trend={checkInTrend.label}
            trendTone={checkInTrend.tone}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            compact
            title={`Por vencer (${alertDays}d)`}
            value={expiringSoon}
            icon={CalendarClock}
            color="orange"
            className={expiringSoon > 0 ? 'border-brand/40 bg-brand/[0.03]' : undefined}
          />
        </StaggerItem>
      </StaggerContainer>

      {totalRevenue > 0 && (
        <p className="px-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
          Ingresos acumulados{' '}
          <span className="font-semibold text-zinc-700 tabular-nums dark:text-zinc-300">
            {formatMoney(totalRevenue)}
          </span>
        </p>
      )}

      <DashboardSection title="Requiere acción" compact>
        <div
          className={cn(
            'grid gap-1.5 sm:gap-3',
            demoPending > 0
              ? 'grid-cols-3 sm:grid-cols-3 lg:grid-cols-5'
              : 'grid-cols-4 sm:grid-cols-2 lg:grid-cols-4'
          )}
        >
          <QuickAction
            compact
            iconOnlyMobile
            to="/reception?mode=counter&tab=access"
            icon={Monitor}
            title="Mostrador"
            description="Check-in y registro"
            tone="blue"
          />
          <QuickAction
            compact
            iconOnlyMobile
            to="/payments?status=pending"
            icon={AlertTriangle}
            title="Pagos"
            description={pendingOld > 0 ? `${pendingOld} con más de 2 días` : 'Revisar y aprobar'}
            count={pendingPayments}
            tone="red"
            prefetchPaymentsPending
          />
          <QuickAction
            compact
            iconOnlyMobile
            to="/members?expiring=true"
            icon={CalendarClock}
            title="Miembros"
            description="Membresías por vencer"
            count={expiringSoon}
            tone="orange"
          />
          <QuickAction
            compact
            iconOnlyMobile
            to="/equipment"
            icon={Wrench}
            title="Equipamiento"
            description="Inventario y mantenimiento"
            count={equipmentAlertCount > 0 ? equipmentAlertCount : undefined}
            tone="orange"
          />
          {demoPending > 0 && (
            <QuickAction
              compact
              iconOnlyMobile
              to="/demo-leads"
              icon={Inbox}
              title="Demos"
              description="Solicitudes pendientes"
              count={demoPending}
              tone="blue"
            />
          )}
        </div>
      </DashboardSection>

      <DashboardSection title="Favoritos" compact>
        {favoriteItems.length > 0 ? (
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 sm:gap-3">
            {favoriteItems.map((item) => (
              <QuickAction
                key={item.href}
                compact
                iconOnlyMobile
                to={item.href}
                icon={item.icon}
                title={item.name}
                description={item.section ?? 'Atajo'}
                tone="emerald"
              />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-zinc-200 px-3 py-3 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            Fija atajos desde Más (estrella) para verlos aquí.
          </p>
        )}
      </DashboardSection>

      <DashboardSection title="Operación" compact>
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-3 sm:gap-3">
          <QuickAction
            compact
            iconOnlyMobile
            to="/check-in?kiosk=1"
            icon={LogIn}
            title="Modo tablet"
            description="Check-in en tablet"
            tone="emerald"
          />
          <QuickAction
            compact
            iconOnlyMobile
            to="/attendance"
            icon={Fingerprint}
            title="Asistencias"
            description="Volumen de ingreso"
            tone="blue"
          />
          <QuickAction
            compact
            iconOnlyMobile
            to="/settings"
            icon={Settings2}
            title="Configuración"
            description="Avisos y salud"
            tone="emerald"
          />
        </div>
      </DashboardSection>

      {pendingOld > 0 && (
        <Link
          to="/payments?status=pending"
          className="flex items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 transition-colors hover:bg-red-500/10"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-red-700 dark:text-red-400">
                {pendingOld} pago{pendingOld !== 1 ? 's' : ''} sin revisar (&gt;2 días)
              </p>
              <p className="text-[11px] text-red-700/80 dark:text-red-400/80">
                Prioriza la aprobación para no bloquear renovaciones
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-red-500" />
        </Link>
      )}

      <DashboardSection title="Finanzas y supervisión" compact>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-3">
          <Card padding="sm" rounded="xl" className="space-y-1">
            <p className="text-[10px] font-bold tracking-wide text-zinc-500 uppercase">
              Pagos &gt;2 días
            </p>
            <p className="text-lg font-bold text-zinc-900 tabular-nums dark:text-white">
              {pendingOld}
            </p>
          </Card>
          <Card padding="sm" rounded="xl" className="space-y-1">
            <p className="flex items-center gap-1 text-[10px] font-bold tracking-wide text-zinc-500 uppercase">
              <CalendarDays className="h-3 w-3" />
              Clases hoy
            </p>
            <p className="text-lg font-bold text-zinc-900 tabular-nums dark:text-white">
              {classFill}%
              <span className="ml-1 text-xs font-normal text-zinc-500">
                ({stats?.classBookingsToday ?? 0}/{stats?.classCapacityToday ?? 0})
              </span>
            </p>
          </Card>
          <Card padding="sm" rounded="xl" className="space-y-1">
            <p className="text-[10px] font-bold tracking-wide text-zinc-500 uppercase">Pausadas</p>
            <p className="text-lg font-bold text-zinc-900 tabular-nums dark:text-white">
              {pausedSubs}
            </p>
          </Card>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-1.5 sm:gap-3">
          <QuickAction
            compact
            iconOnlyMobile
            to="/reports"
            icon={FileSpreadsheet}
            title="Reportes"
            description="Exportar datos"
            tone="blue"
          />
          <QuickAction
            compact
            iconOnlyMobile
            to="/nutrition-overview"
            icon={UtensilsCrossed}
            title="Nutrición"
            description="Adherencia general"
            tone="emerald"
          />
        </div>
      </DashboardSection>

      {expiringList.length > 0 ? (
        <Card padding="sm" rounded="xl">
          <button
            type="button"
            className="flex w-full min-w-0 items-center gap-2 text-left"
            onClick={() => {
              setShowExpiringList((v) => !v);
            }}
            aria-expanded={showExpiringList}
          >
            <CalendarClock className="text-brand h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-zinc-900 dark:text-white">
                Próximos vencimientos
              </p>
              <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                {expiringList.length} en {alertDays} días
                {criticalExpiring > 0
                  ? ` · ${criticalExpiring} crítico${criticalExpiring !== 1 ? 's' : ''}`
                  : ''}
              </p>
            </div>
            {showExpiringList ? (
              <ChevronUp className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-300" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-300" />
            )}
          </button>

          {!showExpiringList && criticalItems.length > 0 && (
            <div className="mt-2 space-y-1">
              {criticalItems.slice(0, 1).map((item) => (
                <Link
                  key={item.user_id}
                  to={`/members?expiring=true&q=${encodeURIComponent(item.full_name)}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-red-500/15 bg-red-500/5 px-2 py-1.5 transition-colors hover:bg-red-500/10"
                >
                  <span className="truncate text-xs font-semibold text-zinc-900 dark:text-white">
                    {item.full_name}
                  </span>
                  <Badge variant="danger" className="shrink-0 text-[10px]">
                    {formatExpiryLabel(item.days_remaining)}
                  </Badge>
                </Link>
              ))}
              {criticalItems.length > 1 && (
                <button
                  type="button"
                  className="text-brand hover:text-brand w-full py-0.5 text-[11px] font-semibold"
                  onClick={() => {
                    setShowExpiringList(true);
                  }}
                >
                  Ver {criticalItems.length} crítico{criticalItems.length !== 1 ? 's' : ''}
                </button>
              )}
            </div>
          )}

          {showExpiringList && (
            <div className="mt-2 max-h-44 space-y-1.5 overflow-y-auto">
              {previewExpiring.map((item) => {
                const severity = getExpirySeverity(item.days_remaining, alertDays);
                const classes = expiryBannerClasses(severity);
                return (
                  <Link
                    key={item.user_id}
                    to={`/members?expiring=true&q=${encodeURIComponent(item.full_name)}`}
                    className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 transition-colors hover:opacity-90 ${classes.itemBorder}`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-zinc-900 dark:text-white">
                        {item.full_name}
                      </p>
                      <p className="truncate text-[10px] text-zinc-500 dark:text-zinc-400">
                        {format(new Date(item.end_date), 'dd MMM', { locale: es })}
                      </p>
                    </div>
                    <Badge
                      variant={severity === 'critical' ? 'danger' : 'warning'}
                      className="shrink-0 text-[10px]"
                    >
                      {formatExpiryLabel(item.days_remaining)}
                    </Badge>
                  </Link>
                );
              })}
              {expiringList.length > previewExpiring.length && (
                <Link
                  to="/members?expiring=true"
                  className="text-brand hover:text-brand block py-0.5 text-center text-[11px] font-semibold"
                >
                  +{expiringList.length - previewExpiring.length} más en Miembros
                </Link>
              )}
            </div>
          )}
        </Card>
      ) : null}

      <Card padding="sm" rounded="xl">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Flujo de ingresos</h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 px-2.5"
            onClick={() => {
              setShowRevenueChart((v) => !v);
            }}
            aria-expanded={showRevenueChart}
            aria-label={
              showRevenueChart ? 'Ocultar gráfico de ingresos' : 'Ver gráfico de ingresos'
            }
            title={showRevenueChart ? 'Ocultar' : 'Ver ingresos'}
          >
            {showRevenueChart ? (
              <>
                <ChevronUp className="h-4 w-4" />
                <span className="ml-1 hidden text-xs sm:inline">Ocultar</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                <span className="ml-1 hidden text-xs sm:inline">Ver</span>
              </>
            )}
          </Button>
        </div>
        {showRevenueChart && (
          <div>
            <SegmentedControl
              variant="compact"
              value={revenueRange}
              onChange={setRevenueRange}
              className="mb-2.5 w-full sm:w-auto"
              fullWidth
              options={[
                { value: '7d', label: '7d' },
                { value: '30d', label: '30d' },
                { value: '6m', label: '6m' },
              ]}
            />
            <Suspense fallback={<Skeleton className="h-40 w-full rounded-xl sm:h-56" />}>
              <RevenueChart
                data={revenueChartData}
                mode={revenueChartMode}
                className="h-40 sm:h-56"
              />
            </Suspense>
          </div>
        )}
      </Card>
    </div>
  );
}
