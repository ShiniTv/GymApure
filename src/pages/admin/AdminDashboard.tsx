import { lazy, Suspense, useState, useEffect } from 'react';
import { Link } from 'react-router';
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
  FileSpreadsheet,
  Wrench,
  Monitor,
  Mail,
  LogIn,
  Users,
  UsersRound,
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
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { apiFetch, parseJsonSafe } from '../../lib/api';

const RevenueChart = lazy(() => import('../../components/RevenueChart'));

type RevenueRange = '7d' | '30d' | '6m';

export default function AdminDashboard() {
  usePageTitle('Panel');
  const adminStats = useAdminStats();
  const { isDesktop } = useBreakpoint();
  const [showRevenueChart, setShowRevenueChart] = useState(false);
  const [showExpiringList, setShowExpiringList] = useState(false);
  const [revenueRange, setRevenueRange] = useState<RevenueRange>('7d');
  const [emailConfigured, setEmailConfigured] = useState<boolean | null>(null);

  const stats = adminStats.stats;
  const alertDays = stats?.expiryAlertDays ?? 7;
  const expiringList = stats?.expiringList ?? [];

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
      <div className="page-stack-tight mx-auto w-full max-w-7xl">
        <PageHeader compact title={<>Administración general</>} />
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
  const demoLeadsPending = stats?.demoLeadsPending ?? 0;
  const expiringSoon = stats?.expiringSoon ?? 0;
  const criticalExpiring = expiringList.filter(
    (item) => getExpirySeverity(item.days_remaining, alertDays) === 'critical'
  ).length;
  const criticalItems = expiringList.filter(
    (item) => getExpirySeverity(item.days_remaining, alertDays) === 'critical'
  );
  const previewExpiring = expiringList.slice(0, isDesktop ? 12 : 5);
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
  const pausedSubs = stats?.pausedSubscriptions ?? 0;
  const chartExpanded = showRevenueChart || isDesktop;
  const expiringExpanded = showExpiringList || isDesktop;

  return (
    <div className="page-stack-tight mx-auto w-full max-w-7xl">
      <StaffPortalBanner
        eyebrow="GymApure · Panel administrativo"
        title={<>Administración general</>}
        subtitle="Supervisión y gestión del gym"
      />

      {emailConfigured === false && (
        <Link
          to="/settings"
          className="border-border/70 bg-surface-raised/50 hover:bg-surface-raised flex items-start gap-3 rounded-[var(--radius-card)] border px-4 py-3 transition-colors"
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
        {demoLeadsPending > 0 && (
          <Link
            to="/demo-leads"
            className="flex items-center justify-between gap-2 rounded-xl border border-sky-500/30 bg-sky-500/5 px-3 py-2 transition-colors hover:bg-sky-500/10"
          >
            <div className="flex min-w-0 items-center gap-2">
              <UsersRound className="h-4 w-4 shrink-0 text-sky-500" />
              <span className="truncate text-xs font-semibold text-sky-700 dark:text-sky-400">
                {demoLeadsPending} demo{demoLeadsPending !== 1 ? 's' : ''} pendiente
                {demoLeadsPending !== 1 ? 's' : ''}
              </span>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-sky-500" />
          </Link>
        )}
      </div>

      <StaggerContainer className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2 [&>*]:h-full">
        <StaggerItem>
          <StatCard
            title="Ingresos (mes)"
            value={formatMoney(revenueThisMonth)}
            icon={DollarSign}
            trend={monthTrend.label}
            trendTone={monthTrend.tone}
            to="/payments"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            title="Activas"
            value={stats?.activeSubscriptions || 0}
            icon={Activity}
            to="/memberships"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            title="Accesos hoy"
            value={stats?.todayCheckIns || 0}
            icon={Clock}
            trend={checkInTrend.label}
            trendTone={checkInTrend.tone}
            to="/attendance"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            title={`Por vencer (${alertDays}d)`}
            value={expiringSoon}
            icon={CalendarClock}
            withIcon={expiringSoon > 0}
            color="orange"
            to="/members?expiring=true"
            className={expiringSoon > 0 ? 'border-warning/40' : undefined}
          />
        </StaggerItem>
      </StaggerContainer>

      {totalRevenue > 0 && (
        <p className="text-text-muted px-0.5 text-[10px]">
          Ingresos acumulados{' '}
          <span className="text-text-secondary font-semibold tabular-nums">
            {formatMoney(totalRevenue)}
          </span>
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:items-start lg:gap-4">
        <div className="space-y-4">
          <DashboardSection title="Requiere acción" compact>
            {(() => {
              const actionItems: {
                key: string;
                to: string;
                title: string;
                description: string;
                count?: number;
                tone: string;
                icon: typeof AlertTriangle;
              }[] = [];

              if (pendingPayments > 0) {
                actionItems.push({
                  key: 'payments',
                  to: '/payments?status=pending',
                  title: 'Pagos por aprobar',
                  description:
                    pendingOld > 0
                      ? `${pendingOld} con más de 2 días sin revisar`
                      : 'Revisa comprobantes y aprueba renovaciones',
                  count: pendingPayments,
                  tone: 'border-red-500/30 bg-red-500/5 hover:bg-red-500/10 text-red-700 dark:text-red-400',
                  icon: AlertTriangle,
                });
              }
              if (expiringSoon > 0) {
                actionItems.push({
                  key: 'expiring',
                  to: '/members?expiring=true',
                  title: 'Membresías por vencer',
                  description:
                    criticalExpiring > 0
                      ? `${criticalExpiring} críticas · contactar o renovar`
                      : `En los próximos ${alertDays} días`,
                  count: expiringSoon,
                  tone: 'border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10 text-orange-700 dark:text-orange-400',
                  icon: CalendarClock,
                });
              }
              if (equipmentAlertCount > 0) {
                actionItems.push({
                  key: 'equipment',
                  to: '/equipment',
                  title: 'Equipamiento',
                  description:
                    equipmentOutOfService > 0
                      ? `${equipmentOutOfService} fuera de servicio`
                      : `${equipmentInspectionsDue} inspección${equipmentInspectionsDue !== 1 ? 'es' : ''} pendiente${equipmentInspectionsDue !== 1 ? 's' : ''}`,
                  count: equipmentAlertCount,
                  tone: 'border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 text-amber-800 dark:text-amber-300',
                  icon: Wrench,
                });
              }
              if (emailConfigured === false) {
                actionItems.push({
                  key: 'email',
                  to: '/settings',
                  title: 'Correo sin configurar',
                  description: 'Bienvenidas y resets no se enviarán',
                  tone: 'border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 text-amber-800 dark:text-amber-300',
                  icon: Mail,
                });
              }
              if (demoLeadsPending > 0) {
                actionItems.push({
                  key: 'demo-leads',
                  to: '/demo-leads',
                  title: 'Solicitudes demo',
                  description: 'Leads pendientes de contactar',
                  count: demoLeadsPending,
                  tone: 'border-sky-500/30 bg-sky-500/5 hover:bg-sky-500/10 text-sky-800 dark:text-sky-300',
                  icon: UsersRound,
                });
              }

              if (actionItems.length === 0) {
                return (
                  <Card padding="sm" rounded="xl" className="border-border/60">
                    <p className="text-text text-sm font-medium">Nada urgente por ahora</p>
                    <p className="text-text-muted mt-0.5 text-[11px]">
                      Sin pagos pendientes, vencimientos ni alertas de equipos.
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <QuickAction
                        compact
                        iconOnlyMobile
                        to="/reception?mode=counter&tab=access"
                        icon={Monitor}
                        title="Mostrador"
                        description="Acceso"
                        tone="blue"
                      />
                      <QuickAction
                        compact
                        iconOnlyMobile
                        to="/payments?status=pending"
                        icon={AlertTriangle}
                        title="Pagos"
                        description="Cola de revisión"
                        tone="red"
                        prefetchPaymentsPending
                      />
                      <QuickAction
                        compact
                        iconOnlyMobile
                        to="/members?expiring=true"
                        icon={CalendarClock}
                        title="Por vencer"
                        description="Membresías"
                        tone="orange"
                      />
                      <QuickAction
                        compact
                        iconOnlyMobile
                        to="/equipment"
                        icon={Wrench}
                        title="Equipos"
                        description="Inventario"
                        tone="orange"
                      />
                    </div>
                  </Card>
                );
              }

              return (
                <div className="space-y-2">
                  {actionItems.map((item) => (
                    <Link
                      key={item.key}
                      to={item.to}
                      className={cn(
                        'flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 transition-colors',
                        item.tone
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">
                            {item.title}
                            {typeof item.count === 'number' ? (
                              <span className="ml-1.5 tabular-nums">({item.count})</span>
                            ) : null}
                          </p>
                          <p className="truncate text-[11px] opacity-80">{item.description}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                    </Link>
                  ))}
                  <div className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-4">
                    <QuickAction
                      compact
                      iconOnlyMobile
                      to="/reception?mode=counter&tab=access"
                      icon={Monitor}
                      title="Mostrador"
                      description="Acceso"
                      tone="blue"
                    />
                    <QuickAction
                      compact
                      iconOnlyMobile
                      to="/payments?status=pending"
                      icon={AlertTriangle}
                      title="Pagos"
                      description="Cola"
                      count={pendingPayments || undefined}
                      tone="red"
                      prefetchPaymentsPending
                    />
                    <QuickAction
                      compact
                      iconOnlyMobile
                      to="/members?expiring=true"
                      icon={CalendarClock}
                      title="Por vencer"
                      description="Miembros"
                      count={expiringSoon || undefined}
                      tone="orange"
                    />
                    <QuickAction
                      compact
                      iconOnlyMobile
                      to="/equipment"
                      icon={Wrench}
                      title="Equipos"
                      description="Inventario"
                      count={equipmentAlertCount > 0 ? equipmentAlertCount : undefined}
                      tone="orange"
                    />
                  </div>
                </div>
              );
            })()}
          </DashboardSection>

          <DashboardSection title="Operación" compact>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              <QuickAction
                compact
                iconOnlyMobile
                to="/check-in?kiosk=1"
                icon={LogIn}
                title="Modo tablet"
                description="Modo tablet"
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
              <QuickAction
                compact
                iconOnlyMobile
                to="/trainers"
                icon={Users}
                title="Entrenadores"
                description="Turnos y niveles"
                tone="blue"
              />
            </div>
          </DashboardSection>

          <DashboardSection title="Finanzas y supervisión" compact>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Card padding="sm" rounded="xl" className="space-y-0.5">
                <p className="text-text-muted text-[10px] font-medium tracking-wide uppercase">
                  Pagos &gt;2 días
                </p>
                <p className="text-text text-lg font-semibold tabular-nums">{pendingOld}</p>
              </Card>
              <Card padding="sm" rounded="xl" className="space-y-0.5">
                <p className="text-text-muted text-[10px] font-medium tracking-wide uppercase">
                  Pausadas
                </p>
                <p className="text-text text-lg font-semibold tabular-nums">{pausedSubs}</p>
              </Card>
              <Card padding="sm" rounded="xl" className="space-y-0.5">
                <p className="text-text-muted text-[10px] font-medium tracking-wide uppercase">
                  Pendientes
                </p>
                <p className="text-text text-lg font-semibold tabular-nums">{pendingPayments}</p>
              </Card>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
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
                to="/audit-logs"
                icon={Monitor}
                title="Auditoría"
                description="Eventos del sistema"
                tone="emerald"
              />
            </div>
          </DashboardSection>
        </div>

        <div className="space-y-4 lg:sticky lg:top-3">
          {expiringList.length > 0 ? (
            <Card padding="sm" rounded="xl">
              <button
                type="button"
                className="flex w-full min-w-0 items-center gap-2 text-left lg:cursor-default"
                onClick={() => {
                  if (isDesktop) return;
                  setShowExpiringList((v) => !v);
                }}
                aria-expanded={expiringExpanded}
              >
                <CalendarClock className="text-brand h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-text text-sm font-bold">Próximos vencimientos</p>
                  <p className="text-text-muted truncate text-[11px]">
                    {expiringList.length} en {alertDays} días
                    {criticalExpiring > 0
                      ? ` · ${criticalExpiring} crítico${criticalExpiring !== 1 ? 's' : ''}`
                      : ''}
                  </p>
                </div>
                {!isDesktop &&
                  (expiringExpanded ? (
                    <ChevronUp className="text-text-muted h-4 w-4 shrink-0" />
                  ) : (
                    <ChevronDown className="text-text-muted h-4 w-4 shrink-0" />
                  ))}
              </button>

              {!expiringExpanded && criticalItems.length > 0 && (
                <div className="mt-2 space-y-1">
                  {criticalItems.slice(0, 1).map((item) => (
                    <Link
                      key={item.user_id}
                      to={`/members?expiring=true&q=${encodeURIComponent(item.full_name)}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-red-500/15 bg-red-500/5 px-2 py-1.5 transition-colors hover:bg-red-500/10"
                    >
                      <span className="text-text truncate text-xs font-semibold">
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

              {expiringExpanded && (
                <div className="mt-2 max-h-[min(50vh,22rem)] space-y-1.5 overflow-y-auto lg:max-h-[min(40vh,18rem)]">
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
                          <p className="text-text truncate text-xs font-semibold">
                            {item.full_name}
                          </p>
                          <p className="text-text-muted truncate text-[10px]">
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
              <h3 className="text-text text-sm font-bold">Flujo de ingresos</h3>
              {!isDesktop && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 px-2.5"
                  onClick={() => {
                    setShowRevenueChart((v) => !v);
                  }}
                  aria-expanded={chartExpanded}
                  aria-label={
                    chartExpanded ? 'Ocultar gráfico de ingresos' : 'Ver gráfico de ingresos'
                  }
                  title={chartExpanded ? 'Ocultar' : 'Ver ingresos'}
                >
                  {chartExpanded ? (
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
              )}
            </div>
            {chartExpanded && (
              <div>
                <SegmentedControl
                  variant="compact"
                  value={revenueRange}
                  onChange={setRevenueRange}
                  className="mb-2.5 w-fit max-w-full"
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
                    className="h-40 sm:h-56 lg:h-52"
                  />
                </Suspense>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
