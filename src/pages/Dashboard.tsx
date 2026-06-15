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
  CreditCard,
  UserCircle,
  CalendarClock,
  Mail,
  MessageSquare,
  Settings2,
  Save,
  Smartphone,
  Bell
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
  expiryAlertDays?: number;
}

interface ExpirySettingsForm {
  expiry_alert_days: number;
  email_notifications_enabled: boolean;
  sms_notifications_enabled: boolean;
  whatsapp_notifications_enabled: boolean;
  notify_members_email: boolean;
  notify_members_sms: boolean;
  notify_members_whatsapp: boolean;
  notify_admin_email: boolean;
  notify_payment_events: boolean;
  notify_admin_new_payment: boolean;
  notify_routine_assigned: boolean;
  providers?: {
    email: boolean;
    sms: boolean;
    whatsapp: boolean;
    whatsappProvider?: 'meta' | 'twilio' | null;
    whatsappProviderLabel?: string | null;
  };
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
  const [expirySettings, setExpirySettings] = useState<ExpirySettingsForm | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');
  const [settingsMessageTone, setSettingsMessageTone] = useState<'success' | 'info' | 'error'>('info');
  const [testTarget, setTestTarget] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'admin' && user.email && !testTarget) {
      setTestTarget(user.email);
    }
  }, [user, testTarget]);

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
        if (data?.expirySettings) {
          setExpirySettings(data.expirySettings);
        }
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

        {sub && sub.days_remaining <= alertDays && (
          <div className={`rounded-2xl border px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            sub.days_remaining <= 3
              ? 'border-red-500/30 bg-red-500/10'
              : 'border-orange-500/30 bg-orange-500/10'
          }`}>
            <p className={`text-sm font-bold ${
              sub.days_remaining <= 3 ? 'text-red-700 dark:text-red-400' : 'text-orange-700 dark:text-orange-400'
            }`}>
              {sub.days_remaining === 0
                ? 'Tu membresía vence hoy. Renueva para seguir entrenando.'
                : sub.days_remaining === 1
                ? 'Tu membresía vence mañana. Renueva pronto.'
                : `Tu membresía vence en ${sub.days_remaining} días.`}
            </p>
            <Link
              to="/payments"
              className={`text-xs font-black uppercase tracking-widest hover:underline ${
                sub.days_remaining <= 3 ? 'text-red-800 dark:text-red-300' : 'text-orange-800 dark:text-orange-300'
              }`}
            >
              Renovar
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

    const saveExpirySettings = async () => {
      if (!expirySettings) return;
      setSettingsSaving(true);
      setSettingsMessage('');
      try {
        const res = await apiFetch('/api/settings/expiry', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(expirySettings),
        });
        const data = await parseJsonResponse(res);
        if (!res.ok) throw new Error((data as { error?: string }).error || 'Error al guardar');
        setExpirySettings(data as ExpirySettingsForm);
        setSettingsMessage('Configuración guardada');
        const statsRes = await apiFetch('/api/stats/admin');
        const statsData = await parseJsonResponse(statsRes);
        setStats(statsData);
      } catch (err) {
        setSettingsMessage(err instanceof Error ? err.message : 'Error al guardar');
      } finally {
        setSettingsSaving(false);
      }
    };

    const runExpiryJobNow = async () => {
      setSettingsSaving(true);
      setSettingsMessage('');
      try {
        const res = await apiFetch('/api/settings/expiry/run', { method: 'POST' });
        const data = await parseJsonResponse<{ result?: { emailsSent: number; smsSent: number; whatsappSent: number; markedExpired: number } }>(res);
        if (!res.ok) throw new Error((data as { error?: string }).error || 'Error');
        const r = data.result;
        setSettingsMessage(
          `Job ejecutado: ${r?.emailsSent ?? 0} emails, ${r?.whatsappSent ?? 0} WhatsApp, ${r?.smsSent ?? 0} SMS, ${r?.markedExpired ?? 0} vencidas`
        );
      } catch (err) {
        setSettingsMessage(err instanceof Error ? err.message : 'Error al ejecutar');
      } finally {
        setSettingsSaving(false);
      }
    };

    const sendTestNotification = async (channel: 'email' | 'whatsapp' | 'sms') => {
      if (!testTarget.trim()) {
        setSettingsMessageTone('error');
        setSettingsMessage('Ingresa un email o teléfono para la prueba');
        return;
      }
      setSettingsSaving(true);
      setSettingsMessage('');
      try {
        const res = await apiFetch('/api/settings/notifications/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channel, target: testTarget.trim() }),
        });
        const data = await parseJsonResponse<{
          message?: string;
          success?: boolean;
          configured?: boolean;
          mock?: boolean;
        }>(res);
        if (!res.ok) throw new Error((data as { error?: string }).error || 'Error');
        if (data.success) {
          setSettingsMessageTone('success');
          setSettingsMessage(data.message ?? 'Mensaje enviado correctamente');
        } else if (data.mock) {
          setSettingsMessageTone('info');
          setSettingsMessage(data.message ?? 'Prueba simulada — configura credenciales en .env');
        } else {
          setSettingsMessageTone('error');
          setSettingsMessage(data.message ?? 'No se pudo enviar — revisa credenciales en .env');
        }
      } catch (err) {
        setSettingsMessageTone('error');
        setSettingsMessage(err instanceof Error ? err.message : 'Error en prueba');
      } finally {
        setSettingsSaving(false);
      }
    };

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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          <StatCard title="Ingresos" value={`$${stats?.totalRevenue || 0}`} icon={DollarSign} color="emerald" />
          <StatCard title="Pendientes" value={stats?.pendingPayments || 0} icon={AlertTriangle} color="red" />
          <StatCard title={`Por Vencer (${alertDays}d)`} value={stats?.expiringSoon || 0} icon={CalendarClock} color="orange" />
          <StatCard title="Vencidas Semana" value={stats?.expiredThisWeek || 0} icon={AlertTriangle} color="red" />
          <StatCard title="Suscripciones Activas" value={stats?.activeSubscriptions || 0} icon={Activity} color="blue" />
          <StatCard title="Check-ins Hoy" value={stats?.todayCheckIns || 0} icon={Clock} color="emerald" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-3xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-orange-500" />
                Alertas de Vencimiento
              </h3>
              <Link
                to="/members"
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
              }) => (
                <div
                  key={item.user_id}
                  className={`flex items-center justify-between p-4 rounded-2xl border ${
                    item.days_remaining <= 3
                      ? 'border-red-500/20 bg-red-500/5'
                      : 'border-orange-500/20 bg-orange-500/5'
                  }`}
                >
                  <div>
                    <p className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tight">
                      {item.full_name}
                    </p>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                      {item.membership_name} · vence {format(new Date(item.end_date), 'dd MMM', { locale: es })}
                    </p>
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg ${
                    item.days_remaining <= 3
                      ? 'bg-red-500/10 text-red-600 dark:text-red-500'
                      : 'bg-orange-500/10 text-orange-600 dark:text-orange-500'
                  }`}>
                    {item.days_remaining === 0 ? 'Hoy' : `${item.days_remaining}d`}
                  </span>
                </div>
              ))}
              {(!stats?.expiringList || stats.expiringList.length === 0) && (
                <p className="text-center text-zinc-400 font-bold uppercase tracking-widest text-[10px] py-8">
                  Sin vencimientos en los próximos {alertDays} días
                </p>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-3xl p-8">
            <h3 className="text-sm font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-8">Flujo de Ingresos</h3>
            <div className="h-72">
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

        {expirySettings && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-3xl p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h3 className="text-sm font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-orange-500" />
                Notificaciones (Email / WhatsApp)
              </h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={runExpiryJobNow}
                  disabled={settingsSaving}
                  className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-orange-500 transition-colors disabled:opacity-50"
                >
                  Ejecutar ahora
                </button>
                <button
                  type="button"
                  onClick={saveExpirySettings}
                  disabled={settingsSaving}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-orange-600 hover:bg-orange-500 text-white transition-colors disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  Guardar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
                  Días de anticipación
                </label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={expirySettings.expiry_alert_days}
                  onChange={(e) =>
                    setExpirySettings({
                      ...expirySettings,
                      expiry_alert_days: Math.min(90, Math.max(1, parseInt(e.target.value, 10) || 1)),
                    })
                  }
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 font-bold"
                />
              </div>

              {[
                { key: 'email_notifications_enabled' as const, label: 'Email activo', icon: Mail },
                { key: 'whatsapp_notifications_enabled' as const, label: 'WhatsApp activo', icon: Smartphone },
                { key: 'sms_notifications_enabled' as const, label: 'SMS activo', icon: MessageSquare },
                { key: 'notify_members_email' as const, label: 'Email a miembros', icon: Mail },
                { key: 'notify_members_whatsapp' as const, label: 'WhatsApp a miembros', icon: Smartphone },
                { key: 'notify_members_sms' as const, label: 'SMS a miembros', icon: MessageSquare },
                { key: 'notify_admin_email' as const, label: 'Resumen admin', icon: Mail },
                { key: 'notify_payment_events' as const, label: 'Pagos (aprobado/rechazado)', icon: Bell },
                { key: 'notify_admin_new_payment' as const, label: 'Aviso pago nuevo', icon: Bell },
                { key: 'notify_routine_assigned' as const, label: 'Rutina asignada', icon: Bell },
              ].map(({ key, label, icon: Icon }) => (
                <label
                  key={key}
                  className="flex items-center gap-3 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={expirySettings[key]}
                    onChange={(e) =>
                      setExpirySettings({ ...expirySettings, [key]: e.target.checked })
                    }
                    className="h-4 w-4 rounded accent-orange-500"
                  />
                  <Icon className="h-4 w-4 text-zinc-400" />
                  <span className="text-xs font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-300">
                    {label}
                  </span>
                </label>
              ))}
            </div>

            {expirySettings.providers && (
              <div className="flex flex-wrap gap-3 mt-6">
                {[
                  { label: 'SMTP', ok: expirySettings.providers.email, detail: null },
                  {
                    label: 'WhatsApp',
                    ok: expirySettings.providers.whatsapp,
                    detail: expirySettings.providers.whatsappProviderLabel,
                  },
                  { label: 'SMS', ok: expirySettings.providers.sms, detail: null },
                ].map(({ label, ok, detail }) => (
                  <span
                    key={label}
                    className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg ${
                      ok ? 'bg-emerald-500/10 text-emerald-600' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {label}
                    {detail ? ` (${detail})` : ''}: {ok ? 'Configurado' : 'Mock / sin credenciales'}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">Enviar prueba</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="email@ejemplo.com o +58412..."
                  value={testTarget}
                  onChange={(e) => setTestTarget(e.target.value)}
                  className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-sm font-bold"
                />
                <button
                  type="button"
                  disabled={settingsSaving}
                  onClick={() => sendTestNotification('email')}
                  className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 disabled:opacity-50"
                >
                  Probar email
                </button>
                <button
                  type="button"
                  disabled={settingsSaving}
                  onClick={() => sendTestNotification('whatsapp')}
                  className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-600 text-white disabled:opacity-50"
                >
                  Probar WhatsApp
                </button>
              </div>
            </div>

            <p className="text-[10px] text-zinc-400 mt-6">
              Cron automático cada hora (EXPIRY_CRON_INTERVAL_MS). WhatsApp: Meta Cloud API (WHATSAPP_ACCESS_TOKEN) o Twilio (TWILIO_WHATSAPP_FROM); usa WHATSAPP_PROVIDER=meta|twilio para forzar uno. Sin credenciales, los mensajes aparecen en la consola del servidor.
            </p>
            {settingsMessage && (
              <p
                className={`text-xs font-bold mt-3 ${
                  settingsMessageTone === 'success'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : settingsMessageTone === 'info'
                      ? 'text-sky-600 dark:text-sky-400'
                      : 'text-orange-600 dark:text-orange-400'
                }`}
              >
                {settingsMessage}
              </p>
            )}
          </div>
        )}
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
