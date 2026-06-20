import { lazy, Suspense, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch, parseJsonResponse } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useAdminStats } from '../context/AdminStatsContext';
import { useMemberStatsOptional } from '../context/MemberStatsContext';
import { expiryBannerClasses, formatExpiryLabel, getExpirySeverity } from '../lib/expiryUtils';
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
} from 'lucide-react';
import { QuickAction } from '../components/admin/QuickAction';
import { DashboardSection } from '../components/admin/DashboardSection';
import { format } from 'date-fns';
import { dateLocale as es } from '../lib/dateLocale';
import { StatCard, Card, PageHeader, Badge, EmptyState, Button, DashboardSkeleton, Skeleton } from '../components/ui';

import MemberDashboardView from './member/MemberDashboard';
import ReceptionDashboardView from './reception/ReceptionDashboard';

const RevenueChart = lazy(() => import('../components/RevenueChart'));

interface TrainerActivity {
  user_id: number;
  full_name: string;
  routine_name: string;
  start_time: string;
}

interface TrainerExpiringMember {
  id: number;
  full_name: string;
  days_remaining: number;
}

interface TrainerDashboardStats {
  assignedMembers: number;
  activeNow: number;
  todayWorkouts: number;
  routinesCreated: number;
  recentActivities: TrainerActivity[];
  membersWithoutRoutines?: number;
  expiringMembers?: TrainerExpiringMember[];
  expiryAlertDays?: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const adminStats = useAdminStats();
  const memberStatsCtx = useMemberStatsOptional();
  const [trainerStats, setTrainerStats] = useState<TrainerDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === 'admin';
  const isMember = user?.role === 'member';
  const isReceptionist = user?.role === 'receptionist';
  const memberStats = memberStatsCtx?.stats ?? null;
  const pageLoading = isAdmin
    ? adminStats.loading && !adminStats.stats
    : isMember
      ? memberStatsCtx?.loading && !memberStats
      : isReceptionist
        ? false
        : loading;

  useEffect(() => {
    if (!user) return;

    if (user.role === 'member' || user.role === 'receptionist') {
      return;
    }

    if (user.role === 'admin') {
      setLoading(false);
      return;
    }

    apiFetch('/api/stats/trainer')
      .then((res) => parseJsonResponse<TrainerDashboardStats>(res))
      .then((data) => {
        if (data?.recentActivities && !Array.isArray(data.recentActivities)) {
          data.recentActivities = [];
        }
        if (data && !Array.isArray(data.expiringMembers)) {
          data.expiringMembers = [];
        }
        setTrainerStats(data);
        setLoading(false);
      })
      .catch(() => {
        setTrainerStats(null);
        setLoading(false);
      });
  }, [user]);

  if (pageLoading) {
    return (
      <DashboardSkeleton statCount={isAdmin ? 6 : isMember ? 3 : 4} />
    );
  }

  if (user?.role === 'member') {
    return <MemberDashboardView />;
  }

  if (user?.role === 'receptionist') {
    return <ReceptionDashboardView />;
  }

  if (user?.role === 'admin') {
    const stats = adminStats.stats;
    const alertDays = stats?.expiryAlertDays ?? 7;

    return (
      <div className="page-stack-loose">
        <PageHeader
          title={<>Administración <span className="text-orange-500">general</span></>}
          subtitle="Resumen financiero, operaciones y alertas del gym"
          badge={`${stats?.todayCheckIns || 0} check-ins hoy`}
        />

        <DashboardSection title="Finanzas" icon={DollarSign}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard title="Ingresos totales" value={`$${stats?.totalRevenue || 0}`} icon={DollarSign} color="emerald" />
            <StatCard title="Pagos pendientes" value={stats?.pendingPayments || 0} icon={AlertTriangle} color="red" />
            <StatCard title="Suscripciones activas" value={stats?.activeSubscriptions || 0} icon={Activity} color="blue" />
          </div>
        </DashboardSection>

        <DashboardSection title="Operaciones" icon={Fingerprint}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard title="Check-ins hoy" value={stats?.todayCheckIns || 0} icon={Clock} color="emerald" />
            <StatCard title={`Por vencer (${alertDays}d)`} value={stats?.expiringSoon || 0} icon={CalendarClock} color="orange" />
            <StatCard title="Vencidas esta semana" value={stats?.expiredThisWeek || 0} icon={AlertTriangle} color="red" />
          </div>
        </DashboardSection>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickAction
            to="/payments?status=pending"
            icon={AlertTriangle}
            title="Pagos pendientes"
            description="Revisar y aprobar reportes"
            count={stats?.pendingPayments || 0}
            tone="red"
          />
          <QuickAction
            to="/members?expiring=true"
            icon={CalendarClock}
            title="Por vencer"
            description={`Membresías en los próximos ${alertDays} días`}
            count={stats?.expiringSoon || 0}
            tone="orange"
          />
          <QuickAction
            to="/attendance"
            icon={Fingerprint}
            title="Asistencias"
            description="Volumen y frecuencia de ingreso"
            tone="blue"
          />
          <QuickAction
            to="/settings"
            icon={Settings2}
            title="Configuración"
            description="Notificaciones y salud del sistema"
            tone="emerald"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card padding="lg" rounded="2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="section-title flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-orange-500" />
                Alertas de vencimiento
              </h3>
              <Link
                to="/members?expiring=true"
                className="text-xs font-semibold text-orange-600 hover:text-orange-500"
              >
                Ver miembros
              </Link>
            </div>
            <div className="scroll-area space-y-3 max-h-72">
              {(stats?.expiringList ?? []).map((item: {
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
                  className={`flex items-center justify-between p-3 sm:p-4 rounded-xl border ${classes.itemBorder}`}
                >
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                      {item.full_name}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {item.membership_name} · vence {format(new Date(item.end_date), 'dd MMM', { locale: es })}
                    </p>
                  </div>
                  <Badge variant={severity === 'critical' ? 'danger' : 'warning'}>
                    {formatExpiryLabel(item.days_remaining)}
                  </Badge>
                </div>
              );
              })}
              {(!stats?.expiringList || stats.expiringList.length === 0) && (
                <p className="text-center text-zinc-400 text-sm py-8">
                  Sin vencimientos en los próximos {alertDays} días
                </p>
              )}
            </div>
          </Card>

          <Card padding="lg" rounded="2xl">
            <h3 className="section-title mb-6">Flujo de ingresos</h3>
            <Suspense fallback={<Skeleton className="h-72 w-full rounded-xl" />}>
              <RevenueChart data={stats?.revenueHistory || []} />
            </Suspense>
          </Card>
        </div>
      </div>
    );
  }

  // Trainer view
  const stats = trainerStats;
  return (
    <div className="page-stack-loose">
      <PageHeader
        title={<>Control de <span className="text-orange-500">entrenamiento</span></>}
        subtitle="Resumen de tu actividad con los miembros asignados"
        badge={stats?.activeNow ? `${stats.activeNow} en el gym ahora` : undefined}
        action={
          (trainerStats?.membersWithoutRoutines ?? 0) > 0 ? (
            <Link to="/members">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-700 dark:text-orange-400 text-sm font-semibold">
                <Users className="h-4 w-4" />
                {trainerStats!.membersWithoutRoutines} sin rutina
              </span>
            </Link>
          ) : undefined
        }
      />

      <DashboardSection title="Tu actividad" icon={Activity}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Mis miembros" value={stats?.assignedMembers || 0} icon={Users} color="blue" />
          <StatCard title="Activos ahora" value={stats?.activeNow || 0} icon={Activity} color="orange" />
          <StatCard title="Sesiones hoy" value={stats?.todayWorkouts || 0} icon={Clock} color="emerald" />
          <StatCard title="Rutinas creadas" value={stats?.routinesCreated || 0} icon={TrendingUp} color="blue" />
        </div>
      </DashboardSection>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickAction
          to="/members"
          icon={Users}
          title="Mis miembros"
          description="Ver lista y asignar rutinas"
          count={stats?.assignedMembers || 0}
          tone="blue"
        />
        <QuickAction
          to="/routines"
          icon={Dumbbell}
          title="Plantillas"
          description="Crear y editar rutinas"
          count={stats?.routinesCreated || 0}
          tone="orange"
        />
        <QuickAction
          to="/routines?view=assignments"
          icon={CalendarClock}
          title="Asignaciones"
          description="Rutinas activas por miembro"
          tone="emerald"
        />
        <QuickAction
          to="/exercises"
          icon={BookOpen}
          title="Ejercicios"
          description="Catálogo de movimientos"
          tone="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card padding="md" rounded="xl">
        <h3 className="section-title mb-4">Actividad reciente</h3>
        <div className="scroll-area max-h-72 space-y-0">
          {stats?.recentActivities?.map((activity: TrainerActivity, i: number) => (
            <Link
              key={i}
              to={`/members/${activity.user_id}/history`}
              className="flex items-center gap-3 py-2.5 border-b border-zinc-100 dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 rounded-lg px-1 transition-colors"
            >
              <div className="relative shrink-0">
                <div className="h-9 w-9 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-600">
                  <Dumbbell className="h-4 w-4" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{activity.full_name}</p>
                <p className="text-xs text-zinc-500 truncate">
                  {activity.routine_name}
                </p>
              </div>
              <div className="flex items-center text-xs font-medium text-zinc-500 bg-zinc-50 dark:bg-zinc-800/50 px-2.5 py-1 rounded-lg shrink-0">
                <Clock className="h-3.5 w-3.5 mr-1 text-orange-500" />
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

      <Card padding="lg" rounded="2xl">
        <h3 className="section-title mb-6">Atención requerida</h3>
        <div className="space-y-4">
          {(trainerStats?.membersWithoutRoutines ?? 0) > 0 && (
            <Link
              to="/members"
              className="flex items-center justify-between p-4 rounded-2xl bg-orange-500/5 border border-orange-500/20 hover:bg-orange-500/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-orange-500/10">
                  <Users className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-900 dark:text-white">Sin rutina asignada</p>
                  <p className="text-xs text-zinc-500">
                    {trainerStats!.membersWithoutRoutines} miembro{trainerStats!.membersWithoutRoutines !== 1 ? 's' : ''} activo{trainerStats!.membersWithoutRoutines !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-orange-500" />
            </Link>
          )}

          {(trainerStats?.expiringMembers ?? []).map((m) => (
            <Link
              key={m.id}
              to={`/members/${m.id}/routines`}
              className="flex items-center justify-between p-4 rounded-2xl bg-red-500/5 border border-red-500/15 hover:bg-red-500/10 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-red-500/10 shrink-0">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">{m.full_name}</p>
                  <p className="text-xs text-zinc-500">Membresía por vencer</p>
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
  );
}
