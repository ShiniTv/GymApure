import { lazy, Suspense, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch, parseJsonResponse } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useAdminStats } from '../context/AdminStatsContext';
import { useMemberStatsOptional } from '../context/MemberStatsContext';
import { expiryBannerClasses, formatExpiryLabel, formatExpiryCountdown, getExpirySeverity, shouldShowExpiryAlert } from '../lib/expiryUtils';
import {
  Users,
  DollarSign,
  Activity,
  TrendingUp,
  Clock,
  AlertTriangle,
  Dumbbell,
  CreditCard,
  UserCircle,
  CalendarClock,
  Settings2,
  Fingerprint,
} from 'lucide-react';
import { QuickAction } from '../components/admin/QuickAction';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { StatCard, Spinner, Card, PageHeader, Badge } from '../components/ui';

const RevenueChart = lazy(() => import('../components/RevenueChart'));

interface MemberDashboard {
  subscription: {
    membership_name: string;
    days_remaining: number;
    end_date: string;
    duration_days: number;
  } | null;
  progressPercent: number;
  primaryRoutine: {
    id: number;
    name: string;
    difficulty: string;
    assigned_at: string;
    exercise_count: number;
  } | null;
  assignedRoutinesCount: number;
  pendingPayments: number;
  lastWorkout: { routine_name: string; start_time: string } | null;
  expiryAlertDays?: number;
  workoutsThisMonth?: number;
}

interface TrainerActivity {
  full_name: string;
  routine_name: string;
  start_time: string;
}

interface TrainerDashboardStats {
  assignedMembers: number;
  activeNow: number;
  todayWorkouts: number;
  routinesCreated: number;
  recentActivities: TrainerActivity[];
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
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner />
      </div>
    );
  }

  if (user?.role === 'member') {
    const sub = memberStats?.subscription;
    const routine = memberStats?.primaryRoutine;
    const pending = memberStats?.pendingPayments ?? 0;
    const alertDays = memberStats?.expiryAlertDays ?? 7;

    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-black text-zinc-900 dark:text-white italic tracking-tighter uppercase">
          Bienvenido, <span className="text-orange-500">{user.name}</span>
        </h1>

        {pending > 0 && (
          <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-sm font-bold text-yellow-700 dark:text-yellow-400">
              Tienes {pending} pago(s) pendiente(s) de revisión por el administrador.
            </p>
            <Link
              to="/payments"
              className="text-xs font-black uppercase tracking-widest text-yellow-800 dark:text-yellow-300 hover:underline"
            >
              Ver pagos
            </Link>
          </div>
        )}

        {sub && shouldShowExpiryAlert(sub.days_remaining, alertDays) && (() => {
          const severity = getExpirySeverity(sub.days_remaining, alertDays);
          const classes = expiryBannerClasses(severity);
          const suffix =
            sub.days_remaining === 0
              ? ' Renueva para seguir entrenando.'
              : sub.days_remaining === 1
              ? ' Renueva pronto.'
              : '';
          return (
          <div className={`rounded-2xl border px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${classes.container}`}>
            <p className={`text-sm font-bold ${classes.text}`}>
              {formatExpiryCountdown(sub.days_remaining) + suffix}
            </p>
            <Link
              to="/payments"
              className={`text-xs font-black uppercase tracking-widest hover:underline ${classes.link}`}
            >
              Renovar
            </Link>
          </div>
          );
        })()}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl p-6">
            <h3 className="text-sm font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-6">
              Estado de Membresía
            </h3>
            {sub ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Plan actual</p>
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-500 italic tracking-tighter uppercase">
                      {sub.membership_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Días restantes</p>
                    <p className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter uppercase">
                      {sub.days_remaining} días
                    </p>
                  </div>
                </div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-4">
                  Vence: {format(new Date(sub.end_date), 'dd MMM yyyy', { locale: es })}
                </p>
                <div className="mt-6 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-3">
                  <div
                    className="bg-emerald-500 h-3 rounded-full shadow-lg shadow-emerald-500/20 transition-all"
                    style={{ width: `${memberStats?.progressPercent ?? 0}%` }}
                  />
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <p className="text-sm font-bold text-zinc-500">No tienes una membresía activa.</p>
                <Link
                  to="/payments"
                  className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-widest text-orange-600 hover:text-orange-500"
                >
                  <CreditCard className="h-4 w-4" />
                  Reportar pago
                </Link>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl p-6">
            <h3 className="text-sm font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-6">
              Tu rutina
            </h3>
            {routine ? (
              <>
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-orange-500/10 rounded-2xl">
                    <Dumbbell className="h-6 w-6 text-orange-600 dark:text-orange-500" />
                  </div>
                  <div>
                    <p className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter italic leading-none">
                      {routine.name}
                    </p>
                    <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                      {routine.exercise_count} ejercicios · {routine.difficulty}
                    </p>
                    <p className="text-[10px] text-zinc-400 mt-1">
                      Asignada {format(new Date(routine.assigned_at), 'dd MMM yyyy', { locale: es })}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/workout/${routine.id}`)}
                  className="mt-8 w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl text-xs font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 shadow-lg"
                >
                  Empezar entrenamiento
                </button>
                {(memberStats?.assignedRoutinesCount ?? 0) > 1 && (
                  <Link
                    to="/routines"
                    className="mt-3 block text-center text-[10px] font-black uppercase tracking-widest text-orange-600 hover:text-orange-500"
                  >
                    Ver todas ({memberStats?.assignedRoutinesCount})
                  </Link>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <p className="text-sm font-bold text-zinc-500">Aún no tienes rutinas asignadas.</p>
                <p className="text-xs text-zinc-400">Tu entrenador te asignará un plan pronto.</p>
              </div>
            )}
          </div>
        </div>

        {memberStats?.lastWorkout && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
            <h3 className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-3">Último entrenamiento</h3>
            <p className="font-black text-zinc-800 dark:text-zinc-200 uppercase">{memberStats.lastWorkout.routine_name}</p>
            <p className="text-[10px] text-zinc-400 mt-1">
              {format(new Date(memberStats.lastWorkout.start_time), "dd MMM yyyy · HH:mm", { locale: es })}
            </p>
            <Link
              to="/history"
              className="inline-block mt-4 text-[10px] font-black uppercase tracking-widest text-orange-600 hover:text-orange-500"
            >
              Ver historial
            </Link>
          </div>
        )}

        <Link
          to="/profile"
          className="block bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 hover:border-orange-500/40 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-1">Mi progreso</h3>
              <p className="text-sm font-bold text-zinc-600 dark:text-zinc-300">
                Actualiza tu perfil, registra mediciones y revisa tu evolución
              </p>
            </div>
            <div className="p-3 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-500 group-hover:bg-orange-500/20 transition-colors">
              <UserCircle className="h-6 w-6" />
            </div>
          </div>
        </Link>
      </div>
    );
  }

  if (user?.role === 'admin') {
    const alertDays = stats?.expiryAlertDays ?? 7;

    return (
      <div className="space-y-6">
        <PageHeader
          title={<>ADMINISTRACIÓN <span className="text-orange-500">GENERAL</span></>}
          badge="RESUMEN CONTABLE"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          <StatCard title="Ingresos" value={`$${stats?.totalRevenue || 0}`} icon={DollarSign} color="emerald" />
          <StatCard title="Pendientes" value={stats?.pendingPayments || 0} icon={AlertTriangle} color="red" />
          <StatCard title={`Por Vencer (${alertDays}d)`} value={stats?.expiringSoon || 0} icon={CalendarClock} color="orange" />
          <StatCard title="Vencidas Semana" value={stats?.expiredThisWeek || 0} icon={AlertTriangle} color="red" />
          <StatCard title="Suscripciones Activas" value={stats?.activeSubscriptions || 0} icon={Activity} color="blue" />
          <StatCard title="Check-ins Hoy" value={stats?.todayCheckIns || 0} icon={Clock} color="emerald" />
        </div>

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
          <Card padding="lg" rounded="3xl">
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

          <Card padding="lg" rounded="3xl">
            <h3 className="text-sm font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-8">Flujo de Ingresos</h3>
            <Suspense fallback={<div className="h-72 flex items-center justify-center"><Spinner /></div>}>
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-black text-zinc-900 dark:text-white italic tracking-tighter uppercase whitespace-pre-line leading-tight">
          CONTROL DE <span className="text-orange-500">ENTRENAMIENTO</span>
        </h1>
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-500 bg-white dark:bg-zinc-900 px-4 py-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Capacidad Actual: {stats?.activeNow || 0}/100
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Mis Miembros" value={stats?.assignedMembers || 0} icon={Users} color="blue" />
        <StatCard title="Activos Ahora" value={stats?.activeNow || 0} icon={Activity} color="orange" />
        <StatCard title="Sesiones Hoy" value={stats?.todayWorkouts || 0} icon={Clock} color="emerald" />
        <StatCard title="Rutinas Creadas" value={stats?.routinesCreated || 0} icon={TrendingUp} color="blue" />
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-3xl p-8">
        <h3 className="text-sm font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-8">Últimas Actividades de Usuarios</h3>
        <div className="space-y-4">
          {stats?.recentActivities?.map((activity: TrainerActivity, i: number) => (
            <div key={i} className="flex items-center justify-between py-4 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tight">{activity.full_name}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 leading-none mt-1">EMPEZÓ RUTINA: {activity.routine_name}</p>
                </div>
              </div>
              <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-1.5 rounded-lg">
                <Clock className="h-3.5 w-3.5 mr-1.5 text-orange-500" />
                {new Date(activity.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
          {(!stats?.recentActivities || stats.recentActivities.length === 0) && (
            <p className="text-center text-zinc-400 font-bold uppercase tracking-widest text-[10px] py-8">No hay actividad reciente</p>
          )}
        </div>
      </div>
    </div>
  );
}
