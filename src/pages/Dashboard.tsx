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
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { StatCard, Card, PageHeader, Badge, EmptyState, Button, DashboardSkeleton, Skeleton } from '../components/ui';

import MemberDashboardView from './member/MemberDashboard';

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
  const stats = isAdmin ? adminStats.stats : trainerStats;
  const memberStats = memberStatsCtx?.stats ?? null;
  const pageLoading = isAdmin
    ? adminStats.loading && !adminStats.stats
    : isMember
      ? memberStatsCtx?.loading && !memberStats
      : loading;

  useEffect(() => {
    if (!user) return;

    if (user.role === 'member') {
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

  if (user?.role === 'admin') {
    const alertDays = stats?.expiryAlertDays ?? 7;

    return (
      <div className="space-y-6">
        <PageHeader
          title={<>ADMINISTRACIÓN <span className="text-orange-500">GENERAL</span></>}
          badge="RESUMEN CONTABLE"
        />

        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-12 gap-4">
          <div className="col-span-1 md:col-span-2 xl:col-span-2">
            <StatCard title="Ingresos" value={`$${stats?.totalRevenue || 0}`} icon={DollarSign} color="emerald" />
          </div>
          <div className="col-span-1 md:col-span-2 xl:col-span-2">
            <StatCard title="Pendientes" value={stats?.pendingPayments || 0} icon={AlertTriangle} color="red" />
          </div>
          <div className="col-span-1 md:col-span-2 xl:col-span-2">
            <StatCard title={`Por Vencer (${alertDays}d)`} value={stats?.expiringSoon || 0} icon={CalendarClock} color="orange" />
          </div>
          <div className="col-span-1 md:col-span-2 xl:col-span-2">
            <StatCard title="Vencidas Semana" value={stats?.expiredThisWeek || 0} icon={AlertTriangle} color="red" />
          </div>
          <div className="col-span-1 md:col-span-2 xl:col-span-2">
            <StatCard title="Suscripciones Activas" value={stats?.activeSubscriptions || 0} icon={Activity} color="blue" />
          </div>
          <div className="col-span-1 md:col-span-2 xl:col-span-2">
            <StatCard title="Check-ins Hoy" value={stats?.todayCheckIns || 0} icon={Clock} color="emerald" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
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

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <Card padding="lg" rounded="3xl" className="xl:col-span-5">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-orange-500" />
                Alertas de Vencimiento
              </h3>
              <Link
                to="/members?expiring=true"
                className="text-[10px] font-black uppercase tracking-widest text-orange-600 hover:text-orange-500"
              >
                Ver miembros
              </Link>
            </div>
            <div className="space-y-3 max-h-72 overflow-y-auto">
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
                  className={`flex items-center justify-between p-4 rounded-2xl border ${classes.itemBorder}`}
                >
                  <div>
                    <p className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tight">
                      {item.full_name}
                    </p>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
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
                <p className="text-center text-zinc-400 font-bold uppercase tracking-widest text-[10px] py-8">
                  Sin vencimientos en los próximos {alertDays} días
                </p>
              )}
            </div>
          </Card>

          <Card padding="lg" rounded="3xl" className="xl:col-span-7">
            <h3 className="text-sm font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-8">Flujo de Ingresos</h3>
            <Suspense fallback={<Skeleton className="h-72 w-full rounded-2xl" />}>
              <RevenueChart data={stats?.revenueHistory || []} />
            </Suspense>
          </Card>
        </div>
      </div>
    );
  }

  // Trainer view
  return (
    <div className="space-y-6">
      <PageHeader
        title={<>Control de <span className="text-orange-500">entrenamiento</span></>}
        subtitle="Resumen de tu actividad con los miembros asignados"
        badge={stats?.activeNow ? `${stats.activeNow} en el gym ahora` : undefined}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Mis Miembros" value={stats?.assignedMembers || 0} icon={Users} color="blue" />
        <StatCard title="Activos Ahora" value={stats?.activeNow || 0} icon={Activity} color="orange" />
        <StatCard title="Sesiones Hoy" value={stats?.todayWorkouts || 0} icon={Clock} color="emerald" />
        <StatCard title="Rutinas Creadas" value={stats?.routinesCreated || 0} icon={TrendingUp} color="blue" />
      </div>

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
      <Card padding="lg" rounded="3xl">
        <h3 className="text-sm font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-6">
          Actividad reciente
        </h3>
        <div className="space-y-4">
          {stats?.recentActivities?.map((activity: TrainerActivity, i: number) => (
            <Link
              key={i}
              to={`/members/${activity.user_id}/history`}
              className="flex items-center justify-between py-4 border-b border-zinc-100 dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 -mx-2 px-2 rounded-xl transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-black text-zinc-900 dark:text-white tracking-tight">{activity.full_name}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Entrenando: <span className="font-bold text-zinc-700 dark:text-zinc-300">{activity.routine_name}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center text-xs font-bold text-zinc-500 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-1.5 rounded-lg">
                <Clock className="h-3.5 w-3.5 mr-1.5 text-orange-500" />
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

      <Card padding="lg" rounded="3xl">
        <h3 className="text-sm font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-6">
          Atención requerida
        </h3>
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
