import { lazy, Suspense, useState, useEffect, useCallback } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAdminStats } from '../context/AdminStatsContext';
import { useMemberStatsOptional } from '../context/MemberStatsContext';
import { expiryBannerClasses, formatExpiryLabel, getExpirySeverity } from '../lib/expiryUtils';
import { checkInsTrend, revenueMonthTrend, fillDailyRevenueSeries } from '../lib/dashboardTrends';
import {
  Users,
  DollarSign,
  Activity,
  TrendingUp,
  Clock,
  AlertTriangle,
  Dumbbell,
  CalendarClock,
  Settings2,
  Fingerprint,
  BookOpen,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  UtensilsCrossed,
  Tablet,
} from 'lucide-react';
import { QuickAction } from '../components/admin/QuickAction';
import { DashboardSection } from '../components/admin/DashboardSection';
import { format } from 'date-fns';
import { dateLocale as es } from '../lib/dateLocale';
import { StatCard, Card, PageHeader, Badge, EmptyState, Button, DashboardSkeleton, Skeleton, SegmentedControl } from '../components/ui';
import { cn, formatMoney } from '../lib/utils';
import { StaggerContainer, StaggerItem } from '../components/animations';

import { useTrainerStatsQuery, type TrainerStatsResponse } from '../hooks/queries/useDashboardQuery';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { PullToRefreshContainer } from '../components/PullToRefresh';
import MemberDashboardView from './member/MemberDashboard';

const RevenueChart = lazy(() => import('../components/RevenueChart'));

type TrainerDashboardStats = TrainerStatsResponse;

type RevenueRange = '7d' | '30d' | '6m';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const adminStats = useAdminStats();
  const memberStatsCtx = useMemberStatsOptional();
  const { data: trainerStats, isLoading: trainerLoading, refetch: refetchTrainer } = useTrainerStatsQuery();
  const isAdmin = user?.role === 'admin';
  const isMember = user?.role === 'member';
  const isReceptionist = user?.role === 'receptionist';

  const onRefresh = useCallback(async () => {
    if (isAdmin) {
      await adminStats.refresh();
    } else if (!isMember && !isReceptionist) {
      await refetchTrainer();
    }
  }, [isAdmin, isMember, isReceptionist, adminStats, refetchTrainer]);

  const { pullDistance, isRefreshing, handlers } = usePullToRefresh({
    onRefresh,
    threshold: 80,
  });
  const [showRevenueChart, setShowRevenueChart] = useState(false);
  const [showExpiringList, setShowExpiringList] = useState(false);
  const [revenueRange, setRevenueRange] = useState<RevenueRange>('7d');

  const memberStats = memberStatsCtx?.stats ?? null;
  const pageLoading = isAdmin
    ? adminStats.loading && !adminStats.stats
    : isMember
      ? memberStatsCtx?.loading && !memberStats
      : isReceptionist
        ? false
        : trainerLoading;

  useEffect(() => {
    if (user?.role !== 'admin' || !adminStats.stats) return;
    const alertDays = adminStats.stats.expiryAlertDays ?? 7;
    const critical = adminStats.stats.expiringList.filter(
      (item) => getExpirySeverity(item.days_remaining, alertDays) === 'critical'
    ).length;
    if (critical === 0) return;
    const key = `cg-dashboard-expiring-${format(new Date(), 'yyyy-MM-dd')}`;
    if (sessionStorage.getItem(key)) return;
    setShowExpiringList(true);
    sessionStorage.setItem(key, '1');
  }, [user?.role, adminStats.stats]);

  if (user?.role === 'receptionist') {
    return <Navigate to="/reception" replace />;
  }

  if (pageLoading) {
    return (
      <DashboardSkeleton statCount={isAdmin ? 6 : isMember ? 3 : 4} />
    );
  }

  if (user?.role === 'member') {
    return <MemberDashboardView />;
  }

  if (user?.role === 'admin') {
    const stats = adminStats.stats;
    const alertDays = stats?.expiryAlertDays ?? 7;
    const pendingPayments = stats?.pendingPayments ?? 0;
    const expiringSoon = stats?.expiringSoon ?? 0;
    const expiringList = stats?.expiringList ?? [];
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

    return (
      <PullToRefreshContainer pullDistance={pullDistance} isRefreshing={isRefreshing}>
      <div className="space-y-2.5 sm:space-y-3" {...handlers}>
        <PageHeader
          compact
          title={<>Administración <span className="text-brand">general</span></>}
          subtitle="Vista general del gym"
        />

        {pendingPayments > 0 && (
          <Link
            to="/payments?status=pending"
            className="flex items-center justify-between gap-2 rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 transition-colors hover:bg-red-500/10"
          >
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
              <span className="text-xs font-semibold text-red-700 dark:text-red-400 truncate">
                {pendingPayments} pago{pendingPayments !== 1 ? 's' : ''} pendiente{pendingPayments !== 1 ? 's' : ''}
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-red-500 shrink-0" />
          </Link>
        )}

        <StaggerContainer className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 [&>*]:h-full">
          <StaggerItem><StatCard
            compact
            title="Ingresos (mes)"
            value={formatMoney(revenueThisMonth)}
            icon={DollarSign}
            color="emerald"
            trend={monthTrend.label}
            trendTone={monthTrend.tone}
          /></StaggerItem>
          <StaggerItem><StatCard compact title="Activas" value={stats?.activeSubscriptions || 0} icon={Activity} color="blue" /></StaggerItem>
          <StaggerItem><StatCard
            compact
            title="Check-ins hoy"
            value={stats?.todayCheckIns || 0}
            icon={Clock}
            color="emerald"
            trend={checkInTrend.label}
            trendTone={checkInTrend.tone}
          /></StaggerItem>
          <StaggerItem><StatCard
            compact
            title={`Por vencer (${alertDays}d)`}
            value={expiringSoon}
            icon={CalendarClock}
            color="orange"
            className={expiringSoon > 0 ? 'border-brand/40 bg-brand/[0.03]' : undefined}
          /></StaggerItem>
        </StaggerContainer>

        {totalRevenue > 0 && (
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 px-0.5">
            Ingresos acumulados{' '}
            <span className="font-semibold text-zinc-700 dark:text-zinc-300 tabular-nums">{formatMoney(totalRevenue)}</span>
          </p>
        )}

        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
          <QuickAction
            compact
            iconOnlyMobile
            to="/payments?status=pending"
            icon={AlertTriangle}
            title="Pagos"
            description="Revisar y aprobar"
            count={pendingPayments}
            tone="red"
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

        <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
          <QuickAction
            compact
            iconOnlyMobile
            to="/routines"
            icon={Dumbbell}
            title="Rutinas"
            description="Plantillas y asignaciones"
            tone="blue"
          />
          <QuickAction
            compact
            iconOnlyMobile
            to="/exercises"
            icon={BookOpen}
            title="Ejercicios"
            description="Catálogo del gym"
            tone="orange"
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

        <div className="grid grid-cols-2 gap-1.5 sm:gap-3 max-w-md">
          <QuickAction
            compact
            iconOnlyMobile
            to="/check-in?kiosk=1"
            icon={Tablet}
            title="Kiosk"
            description="Check-in en tablet"
            tone="orange"
          />
          <QuickAction
            compact
            iconOnlyMobile
            to="/reception?mode=counter"
            icon={Fingerprint}
            title="Mostrador"
            description="Recepción staff"
            tone="blue"
          />
        </div>

        {expiringList.length > 0 ? (
          <Card padding="sm" rounded="xl">
            <button
              type="button"
              className="flex w-full items-center gap-2 min-w-0 text-left"
              onClick={() => { setShowExpiringList((v) => !v); }}
              aria-expanded={showExpiringList}
            >
              <CalendarClock className="h-4 w-4 text-brand shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-zinc-900 dark:text-white">Próximos vencimientos</p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                  {expiringList.length} en {alertDays} días
                  {criticalExpiring > 0 ? ` · ${criticalExpiring} crítico${criticalExpiring !== 1 ? 's' : ''}` : ''}
                </p>
              </div>
              {showExpiringList ? (
                <ChevronUp className="h-4 w-4 text-zinc-400 dark:text-zinc-300 shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-zinc-400 dark:text-zinc-300 shrink-0" />
              )}
            </button>

            {!showExpiringList && criticalItems.length > 0 && (
              <div className="mt-2 space-y-1">
                {criticalItems.slice(0, 1).map((item) => (
                  <div
                    key={item.user_id}
                    className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-red-500/5 border border-red-500/15"
                  >
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white truncate">{item.full_name}</span>
                    <Badge variant="danger" className="shrink-0 text-[10px]">
                      {formatExpiryLabel(item.days_remaining)}
                    </Badge>
                  </div>
                ))}
                {criticalItems.length > 1 && (
                  <button
                    type="button"
                    className="w-full text-[11px] font-semibold text-brand hover:text-brand py-0.5"
                    onClick={() => { setShowExpiringList(true); }}
                  >
                    Ver {criticalItems.length} crítico{criticalItems.length !== 1 ? 's' : ''}
                  </button>
                )}
              </div>
            )}

            {showExpiringList && (
              <div className="mt-2 space-y-1.5 max-h-44 overflow-y-auto">
                {previewExpiring.map((item: {
                  user_id: number;
                  full_name: string;
                  membership_name: string;
                  days_remaining: number;
                  end_date: string;
                }) => {
                  const severity = getExpirySeverity(item.days_remaining, alertDays);
                  const classes = expiryBannerClasses(severity);
                  return (
                    <div
                      key={item.user_id}
                      className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border ${classes.itemBorder}`}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-zinc-900 dark:text-white truncate">{item.full_name}</p>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                          {format(new Date(item.end_date), 'dd MMM', { locale: es })}
                        </p>
                      </div>
                      <Badge variant={severity === 'critical' ? 'danger' : 'warning'} className="shrink-0 text-[10px]">
                        {formatExpiryLabel(item.days_remaining)}
                      </Badge>
                    </div>
                  );
                })}
                {expiringList.length > previewExpiring.length && (
                  <Link
                    to="/members?expiring=true"
                    className="block text-center text-[11px] font-semibold text-brand hover:text-brand py-0.5"
                  >
                    +{expiringList.length - previewExpiring.length} más en Miembros
                  </Link>
                )}
              </div>
            )}
          </Card>
        ) : null}

        <Card padding="sm" rounded="xl">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Flujo de ingresos</h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 w-9 px-0 sm:hidden"
              onClick={() => { setShowRevenueChart((v) => !v); }}
              aria-expanded={showRevenueChart}
              aria-label={showRevenueChart ? 'Ocultar gráfico de ingresos' : 'Ver gráfico de ingresos'}
              title={showRevenueChart ? 'Ocultar' : 'Ver ingresos'}
            >
              {showRevenueChart ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
          <div className={cn(!showRevenueChart && 'hidden sm:block')}>
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
            <Suspense fallback={<Skeleton className="h-40 sm:h-56 w-full rounded-xl" />}>
              <RevenueChart
                data={revenueChartData}
                mode={revenueChartMode}
                className="h-40 sm:h-56"
              />
            </Suspense>
          </div>
        </Card>
      </div>
    </PullToRefreshContainer>
    );
  }

  // Trainer view
  const stats = trainerStats;
  const withoutRoutines = trainerStats?.membersWithoutRoutines ?? 0;
  const expiringMembers = trainerStats?.expiringMembers ?? [];
  const trainerHasAlerts = withoutRoutines > 0 || expiringMembers.length > 0;

  return (
    <PullToRefreshContainer pullDistance={pullDistance} isRefreshing={isRefreshing}>
    <div className="page-stack-tight" {...handlers}>
      <PageHeader
        compact
        title={<>Control de <span className="text-brand">entrenamiento</span></>}
        subtitle="Actividad con tus miembros asignados"
        badge={stats?.activeNow ? `${stats.activeNow} en el gym` : undefined}
      />

      {trainerHasAlerts && (
        <Card padding="sm" rounded="xl" className="border-brand/30 bg-brand/5">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-brand shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-zinc-900 dark:text-white">Atención requerida</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {withoutRoutines > 0 && (
                  <Link
                    to="/members"
                    className="inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-semibold bg-brand/10 text-brand dark:text-brand hover:bg-brand/15"
                  >
                    {withoutRoutines} sin rutina
                  </Link>
                )}
                {expiringMembers.length > 0 && (
                  <Link
                    to="/members?expiring=true"
                    className="inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-semibold bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/15"
                  >
                    {expiringMembers.length} por vencer
                  </Link>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      <DashboardSection title="Tu actividad" icon={Activity} compact>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <StatCard compact title="Mis miembros" value={stats?.assignedMembers || 0} icon={Users} color="blue" />
          <StatCard compact title="Activos ahora" value={stats?.activeNow || 0} icon={Activity} color="orange" />
          <StatCard compact title="Sesiones hoy" value={stats?.todayWorkouts || 0} icon={Clock} color="emerald" />
          <StatCard compact title="Rutinas creadas" value={stats?.routinesCreated || 0} icon={TrendingUp} color="blue" />
        </div>
      </DashboardSection>

      <div className="grid grid-cols-4 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <QuickAction compact iconOnlyMobile to="/members" icon={Users} title="Mis miembros" description="Ver lista y asignar rutinas" count={stats?.assignedMembers || 0} tone="blue" />
        <QuickAction compact iconOnlyMobile to="/routines" icon={Dumbbell} title="Plantillas" description="Crear y editar rutinas" count={stats?.routinesCreated || 0} tone="orange" />
        <QuickAction compact iconOnlyMobile to="/routines?view=assignments" icon={CalendarClock} title="Asignaciones" description="Rutinas activas por miembro" tone="emerald" />
        <QuickAction compact iconOnlyMobile to="/exercises" icon={BookOpen} title="Ejercicios" description="Catálogo de movimientos" tone="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
      <Card padding="sm" rounded="xl">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-3">Actividad reciente</h3>
        <div className="scroll-area max-h-72 space-y-0">
          {stats?.recentActivities?.map((activity, i) => (
            <Link
              key={i}
              to={`/members/${activity.user_id}/history`}
              className="flex items-center gap-3 py-2.5 border-b border-zinc-100 dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 rounded-lg px-1 transition-colors"
            >
              <div className="relative shrink-0">
                <div className="h-9 w-9 rounded-lg bg-brand/10 flex items-center justify-center text-brand">
                  <Dumbbell className="h-4 w-4" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{activity.full_name}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                  {activity.routine_name}
                </p>
              </div>
              <div className="flex items-center text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 px-2.5 py-1 rounded-lg shrink-0">
                <Clock className="h-3.5 w-3.5 mr-1 text-brand" />
                {new Date(activity.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </Link>
          ))}
          {(!stats?.recentActivities || stats.recentActivities.length === 0) && (
            <EmptyState
              icon={Activity}
              title="Sin actividad reciente"
              description="Cuando tus miembros empiecen a entrenar, verás sus sesiones aquí."
              action={
                <Button variant="secondary" size="sm" onClick={() => navigate('/members')}>
                  Ver miembros
                </Button>
              }
            />
          )}
        </div>
      </Card>

      <Card padding="sm" rounded="xl">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-3">Atención requerida</h3>
        <div className="space-y-2">
          {(trainerStats?.membersWithoutRoutines ?? 0) > 0 && (
            <Link
              to="/members"
              className="flex items-center justify-between p-3 rounded-xl bg-brand/5 border border-brand/20 hover:bg-brand/10 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1.5 rounded-lg bg-brand/10 shrink-0">
                  <Users className="h-4 w-4 text-brand" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white">Sin rutina asignada</p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {trainerStats!.membersWithoutRoutines} miembro{trainerStats!.membersWithoutRoutines !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-brand shrink-0" />
            </Link>
          )}

          {(trainerStats?.expiringMembers ?? []).map((m) => (
            <Link
              key={m.id}
              to={`/members/${m.id}/routines`}
              className="flex items-center justify-between p-3 rounded-xl bg-red-500/5 border border-red-500/15 hover:bg-red-500/10 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1.5 rounded-lg bg-red-500/10 shrink-0">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white truncate">{m.full_name}</p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Membresía por vencer</p>
                </div>
              </div>
              <Badge variant="danger">{m.days_remaining}d</Badge>
            </Link>
          ))}

          {(trainerStats?.membersWithoutRoutines ?? 0) === 0 &&
            (trainerStats?.expiringMembers ?? []).length === 0 && (
              <EmptyState
                icon={CalendarClock}
                title="Todo al día"
                description="No hay miembros pendientes de rutina ni membresías por vencer pronto."
              />
            )}
        </div>
      </Card>
      </div>
    </div>
    </PullToRefreshContainer>
  );
}
