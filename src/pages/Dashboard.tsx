import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch, parseJsonResponse } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  DollarSign, 
  Activity, 
  TrendingUp,
  Clock,
  AlertTriangle,
  Dumbbell,
  CreditCard
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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
}

function StatCard({ title, value, icon: Icon, trend, color = "emerald" }: any) {
  const colorMap: any = {
    emerald: 'text-emerald-600 dark:text-emerald-500 bg-emerald-500/10',
    blue: 'text-blue-600 dark:text-blue-500 bg-blue-500/10',
    orange: 'text-orange-600 dark:text-orange-500 bg-orange-500/10',
    red: 'text-red-600 dark:text-red-500 bg-red-500/10'
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-xl p-6 transition-all">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-500 leading-none mb-1">{title}</p>
          <p className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter italic">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorMap[color] || colorMap.emerald}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center text-sm">
          <span className="text-emerald-600 dark:text-emerald-500 font-medium flex items-center">
            <TrendingUp className="h-4 w-4 mr-1" />
            {trend}
          </span>
          <span className="text-zinc-500 ml-2 font-normal">vs last month</span>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [memberStats, setMemberStats] = useState<MemberDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    if (user.role === 'member') {
      apiFetch('/api/stats/member')
        .then((res) => parseJsonResponse<MemberDashboard>(res))
        .then((data) => {
          setMemberStats(data);
          setLoading(false);
        })
        .catch(() => {
          setMemberStats(null);
          setLoading(false);
        });
      return;
    }

    const role = user.role === 'admin' ? 'admin' : 'trainer';

    apiFetch(`/api/stats/${role}`)
      .then((res) => parseJsonResponse(res))
      .then((data: any) => {
        // Ensure sub-properties are arrays if they exist in UI loops
        if (data) {
          if (data.revenueHistory && !Array.isArray(data.revenueHistory)) data.revenueHistory = [];
          if (data.recentActivities && !Array.isArray(data.recentActivities)) data.recentActivities = [];
        }
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setStats(null);
        setLoading(false);
      });
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent"></div>
      </div>
    );
  }

  if (user?.role === 'member') {
    const sub = memberStats?.subscription;
    const routine = memberStats?.primaryRoutine;
    const pending = memberStats?.pendingPayments ?? 0;

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
      </div>
    );
  }

  if (user?.role === 'admin') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-3xl font-black text-zinc-900 dark:text-white italic tracking-tighter uppercase whitespace-pre-line leading-tight">
            ADMINISTRACIÓN <span className="text-orange-500">GENERAL</span>
          </h1>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-500 bg-white dark:bg-zinc-900 px-4 py-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            RESUMEN CONTABLE
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <StatCard title="Ingresos" value={`$${stats?.totalRevenue || 0}`} icon={DollarSign} color="emerald" />
          <StatCard title="Pendientes" value={stats?.pendingPayments || 0} icon={AlertTriangle} color="red" />
          <StatCard title="Total Usuarios" value={stats?.totalUsers || 0} icon={Users} color="blue" />
          <StatCard title="Suscripciones Activas" value={stats?.activeSubscriptions || 0} icon={Activity} color="orange" />
          <StatCard title="Check-ins Hoy" value={stats?.todayCheckIns || 0} icon={Clock} color="emerald" />
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-3xl p-8">
          <h3 className="text-sm font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-8">Flujo de Ingresos</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.revenueHistory || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-zinc-100 dark:text-zinc-800" vertical={false} />
                <XAxis dataKey="month" stroke="currentColor" className="text-zinc-400" fontSize={10} fontWeight="900" tickLine={false} axisLine={false} tickFormatter={(val) => `Mes ${val}`} />
                <YAxis stroke="currentColor" className="text-zinc-400" fontSize={10} fontWeight="900" tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                <Tooltip 
                  cursor={{ fill: 'currentColor', opacity: 0.05 }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: '900', fontSize: '12px' }}
                />
                <Bar dataKey="income" fill="#f97316" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
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
          {stats?.recentActivities?.map((activity: any, i: number) => (
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
