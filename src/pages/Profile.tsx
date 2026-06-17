import { useState, useEffect, useMemo, FormEvent, ChangeEvent, lazy, Suspense } from 'react';
import { apiFetch, parseJsonResponse, resolveAvatarUrl } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useMemberStatsOptional } from '../context/MemberStatsContext';
import {
  User,
  Scale,
  Target,
  Camera,
  Save,
  Plus,
  TrendingDown,
  TrendingUp,
  Minus,
  Dumbbell,
  Lock,
  CreditCard,
  AlertTriangle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, Card, Modal, PageHeader, Label, Input, Spinner, Textarea } from '../components/ui';
import {
  expiryBannerClasses,
  formatExpiryCountdown,
  getExpirySeverity,
  MEMBER_UI_ALERT_DAYS,
  shouldShowExpiryAlert,
} from '../lib/expiryUtils';

const ProfileWeightChart = lazy(() => import('../components/ProfileWeightChart'));
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface UserProfile {
  id: number;
  email: string;
  full_name: string;
  cedula: string | null;
  phone: string | null;
  initial_weight: number | null;
  height: number | null;
  goal: string | null;
  profile_image: string | null;
  dob: string | null;
}

interface Measurement {
  id: number;
  date: string;
  weight: number | null;
  body_fat_percentage: number | null;
  waist: number | null;
  arm: number | null;
  leg: number | null;
}

interface WorkoutSession {
  id: number;
  start_time: string;
  routine_name: string;
}

interface PaginatedHistory {
  items: WorkoutSession[];
}

function StatMini({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card padding="sm" className="p-5">
      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">{label}</p>
      <p className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter italic">{value}</p>
      {sub && <p className="text-[10px] font-bold text-zinc-400 mt-1 uppercase tracking-widest">{sub}</p>}
    </Card>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const memberStats = useMemberStatsOptional();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveError, setSaveError] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [isAddingMeasurement, setIsAddingMeasurement] = useState(false);
  const [measurementError, setMeasurementError] = useState('');

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [form, setForm] = useState({
    phone: '',
    initial_weight: '',
    height: '',
    goal: '',
    dob: '',
  });

  const [measurementForm, setMeasurementForm] = useState({
    date: new Date().toISOString().split('T')[0],
    weight: '',
    body_fat_percentage: '',
    waist: '',
    arm: '',
    leg: '',
  });

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const requests: Promise<Response>[] = [
        apiFetch(`/api/users/${user.id}`),
        apiFetch(`/api/users/${user.id}/measurements`),
      ];

      if (user.role === 'member') {
        requests.push(apiFetch(`/api/users/${user.id}/history?limit=5`));
      }

      const [profileRes, measRes, histRes] = await Promise.all(requests);
      const profileData = await parseJsonResponse<UserProfile>(profileRes);
      const measData = await parseJsonResponse<Measurement[]>(measRes);
      const histData =
        user.role === 'member' && histRes
          ? await parseJsonResponse<PaginatedHistory>(histRes)
          : { items: [] };

      setProfile(profileData);
      setMeasurements(Array.isArray(measData) ? measData : []);
      setWorkouts(Array.isArray(histData.items) ? histData.items : []);
      setForm({
        phone: profileData.phone ?? '',
        initial_weight: profileData.initial_weight?.toString() ?? '',
        height: profileData.height?.toString() ?? '',
        goal: profileData.goal ?? '',
        dob: profileData.dob ? profileData.dob.split('T')[0] : '',
      });
    } catch {
      setProfile(null);
      setMeasurements([]);
      setWorkouts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const chartData = useMemo(() => {
    return [...measurements]
      .filter((m) => m.weight != null)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((m) => ({
        date: format(new Date(m.date), 'dd MMM', { locale: es }),
        weight: m.weight,
        bodyFat: m.body_fat_percentage,
      }));
  }, [measurements]);

  const latestWeight = measurements.find((m) => m.weight != null)?.weight ?? null;
  const initialWeight = profile?.initial_weight ?? null;

  const weightDelta = useMemo(() => {
    if (latestWeight == null || initialWeight == null) return null;
    return Math.round((latestWeight - initialWeight) * 10) / 10;
  }, [latestWeight, initialWeight]);

  const bmi = useMemo(() => {
    if (latestWeight == null || !profile?.height) return null;
    const h = profile.height / 100;
    return Math.round((latestWeight / (h * h)) * 10) / 10;
  }, [latestWeight, profile?.height]);

  const subscription = memberStats?.stats?.subscription ?? null;
  const workoutsThisMonth = memberStats?.stats?.workoutsThisMonth ?? 0;

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setSaveMsg('');
    setSaveError('');
    try {
      const body: Record<string, unknown> = {
        phone: form.phone.trim() || null,
        goal: form.goal.trim() || null,
        dob: form.dob || null,
      };
      if (form.initial_weight.trim()) {
        body.initial_weight = parseFloat(form.initial_weight);
      } else {
        body.initial_weight = null;
      }
      if (form.height.trim()) {
        body.height = parseFloat(form.height);
      } else {
        body.height = null;
      }

      const res = await apiFetch(`/api/users/${user.id}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const updated = await parseJsonResponse<UserProfile>(res);
      setProfile(updated);
      setSaveMsg('Perfil actualizado');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setAvatarUploading(true);
    setSaveError('');
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const res = await apiFetch(`/api/users/${user.id}/avatar`, {
        method: 'POST',
        body: fd,
      });
      const data = await parseJsonResponse<{ profile_image: string }>(res);
      setProfile((prev) => (prev ? { ...prev, profile_image: data.profile_image } : prev));
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Error al subir foto');
    } finally {
      setAvatarUploading(false);
      e.target.value = '';
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordMsg('');
    setPasswordError('');
    try {
      const res = await apiFetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordForm),
      });
      await parseJsonResponse(res);
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      setPasswordMsg('Contraseña actualizada correctamente');
      setTimeout(() => setPasswordMsg(''), 4000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Error al cambiar contraseña');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleAddMeasurement = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setMeasurementError('');
    try {
      const res = await apiFetch(`/api/users/${user.id}/measurements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: measurementForm.date,
          weight: measurementForm.weight ? parseFloat(measurementForm.weight) : null,
          body_fat_percentage: measurementForm.body_fat_percentage
            ? parseFloat(measurementForm.body_fat_percentage)
            : null,
          waist: measurementForm.waist ? parseFloat(measurementForm.waist) : null,
          arm: measurementForm.arm ? parseFloat(measurementForm.arm) : null,
          leg: measurementForm.leg ? parseFloat(measurementForm.leg) : null,
        }),
      });
      const created = await parseJsonResponse<Measurement>(res);
      setMeasurements((prev) => [created, ...prev]);
      setIsAddingMeasurement(false);
      setMeasurementForm({
        date: new Date().toISOString().split('T')[0],
        weight: '',
        body_fat_percentage: '',
        waist: '',
        arm: '',
        leg: '',
      });
    } catch (err) {
      setMeasurementError(err instanceof Error ? err.message : 'Error al registrar');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner />
      </div>
    );
  }

  if (!profile || !user) {
    return (
      <div className="text-center py-16 text-zinc-500 font-bold uppercase tracking-widest text-sm">
        No se pudo cargar el perfil
      </div>
    );
  }

  const avatarUrl = resolveAvatarUrl(profile.profile_image);

  return (
    <div className="space-y-8">
      <PageHeader
        title={<>Mi <span className="text-orange-500">Perfil</span></>}
        action={
          saveMsg ? (
            <p className="text-sm font-black uppercase tracking-widest text-emerald-600">{saveMsg}</p>
          ) : saveError ? (
            <p className="text-sm font-black uppercase tracking-widest text-red-500">{saveError}</p>
          ) : undefined
        }
      />

      {user.role === 'member' && subscription && shouldShowExpiryAlert(subscription.days_remaining, MEMBER_UI_ALERT_DAYS) && (() => {
        const severity = getExpirySeverity(subscription.days_remaining, MEMBER_UI_ALERT_DAYS);
        const classes = expiryBannerClasses(severity);
        return (
        <div className={`rounded-2xl border px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${classes.container}`}>
          <div className="flex items-start gap-3">
            <AlertTriangle className={`h-5 w-5 shrink-0 mt-0.5 ${severity === 'critical' ? 'text-red-500' : 'text-orange-500'}`} />
            <div>
              <p className={`text-sm font-bold ${classes.text}`}>
                {formatExpiryCountdown(subscription.days_remaining, `plan ${subscription.membership_name}`)}
              </p>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">
                Vence {format(new Date(subscription.end_date), 'dd MMM yyyy', { locale: es })}
              </p>
            </div>
          </div>
          <Link
            to="/payments"
            className={`inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest shrink-0 ${classes.link}`}
          >
            <CreditCard className="h-4 w-4" />
            Renovar
          </Link>
        </div>
        );
      })()}

      {user.role === 'member' && !subscription && (
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-sm font-bold text-yellow-700 dark:text-yellow-400">
            No tienes una membresía activa. Reporta tu pago para reactivar el acceso.
          </p>
          <Link
            to="/payments"
            className="text-xs font-black uppercase tracking-widest text-yellow-800 dark:text-yellow-300 hover:underline shrink-0"
          >
            Reportar pago
          </Link>
        </div>
      )}

      {/* Resumen de progreso */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatMini
          label="Peso actual"
          value={latestWeight != null ? `${latestWeight} kg` : '—'}
          sub={
            weightDelta != null
              ? `${weightDelta > 0 ? '+' : ''}${weightDelta} kg vs inicial`
              : undefined
          }
        />
        <StatMini label="IMC" value={bmi != null ? bmi.toString() : '—'} sub={profile.height ? `${profile.height} cm` : undefined} />
        <StatMini label="Mediciones" value={String(measurements.length)} />
        <StatMini label="Entrenos este mes" value={String(workoutsThisMonth)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Formulario de perfil */}
        <Card>
          <h2 className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <User className="h-4 w-4" />
            Datos personales
          </h2>

          <div className="flex items-center gap-5 mb-8">
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={profile.full_name}
                  className="h-20 w-20 rounded-2xl object-cover ring-2 ring-orange-500/30"
                />
              ) : (
                <div className="h-20 w-20 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                  <User className="h-10 w-10 text-zinc-400" />
                </div>
              )}
              <label
                htmlFor="avatar-upload"
                className="absolute -bottom-1 -right-1 p-2 bg-orange-600 hover:bg-orange-500 rounded-xl cursor-pointer text-white shadow-lg transition-colors"
                title="Cambiar foto"
              >
                <Camera className="h-3.5 w-3.5" />
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
                disabled={avatarUploading}
              />
            </div>
            <div>
              <p className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter italic">
                {profile.full_name}
              </p>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                {profile.email}
              </p>
              {profile.cedula && (
                <p className="text-[10px] font-bold text-zinc-500 mt-0.5">{profile.cedula}</p>
              )}
              {avatarUploading && (
                <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mt-2">
                  Subiendo...
                </p>
              )}
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <Label>Teléfono</Label>
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+58 412 0000000"
              />
            </div>
            <div>
              <Label>Fecha de nacimiento</Label>
              <Input
                type="date"
                value={form.dob}
                onChange={(e) => setForm({ ...form, dob: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Peso inicial (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.initial_weight}
                  onChange={(e) => setForm({ ...form, initial_weight: e.target.value })}
                />
              </div>
              <div>
                <Label>Altura (cm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.height}
                  onChange={(e) => setForm({ ...form, height: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label className="flex items-center gap-1">
                <Target className="h-3 w-3" />
                Objetivo
              </Label>
              <Textarea
                value={form.goal}
                onChange={(e) => setForm({ ...form, goal: e.target.value })}
                rows={3}
                placeholder="Ej: Ganar masa muscular, bajar grasa corporal..."
              />
            </div>
            <Button type="submit" variant="secondary" disabled={saving} className="w-full" size="lg">
              <Save className="h-4 w-4" />
              {saving ? 'Guardando...' : 'Guardar perfil'}
            </Button>
          </form>
        </Card>

        {/* Gráfica de peso */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <Scale className="h-4 w-4" />
              Evolución de peso
            </h2>
            {weightDelta != null && (
              <span
                className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg ${
                  weightDelta < 0
                    ? 'text-emerald-600 bg-emerald-500/10'
                    : weightDelta > 0
                      ? 'text-orange-600 bg-orange-500/10'
                      : 'text-zinc-500 bg-zinc-100 dark:bg-zinc-800'
                }`}
              >
                {weightDelta < 0 ? (
                  <TrendingDown className="h-3.5 w-3.5" />
                ) : weightDelta > 0 ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <Minus className="h-3.5 w-3.5" />
                )}
                {weightDelta > 0 ? '+' : ''}
                {weightDelta} kg
              </span>
            )}
          </div>

          {chartData.length >= 2 ? (
            <Suspense fallback={<div className="h-64 flex items-center justify-center"><Spinner /></div>}>
              <ProfileWeightChart data={chartData} />
            </Suspense>
          ) : chartData.length === 1 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center">
              <p className="text-4xl font-black text-orange-500 italic">{chartData[0].weight} kg</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mt-2">
                {chartData[0].date} · Registra otra medición para ver la gráfica
              </p>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center px-4">
              <Scale className="h-10 w-10 text-zinc-300 dark:text-zinc-700 mb-3" />
              <p className="text-sm font-bold text-zinc-500">Sin mediciones de peso aún</p>
              <p className="text-xs text-zinc-400 mt-1">Registra tu primera medición abajo</p>
            </div>
          )}
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Historial de mediciones
          </h2>
          <Button type="button" size="sm" onClick={() => setIsAddingMeasurement(true)}>
            <Plus className="h-3.5 w-3.5" />
            Nueva medición
          </Button>
        </div>

        {measurements.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-widest text-zinc-500 border-b border-zinc-100 dark:border-zinc-800">
                  <th className="pb-3 pr-4">Fecha</th>
                  <th className="pb-3 pr-4">Peso</th>
                  <th className="pb-3 pr-4">Grasa</th>
                  <th className="pb-3 pr-4">Cintura</th>
                  <th className="pb-3 pr-4">Brazo</th>
                  <th className="pb-3">Pierna</th>
                </tr>
              </thead>
              <tbody>
                {measurements.map((m) => (
                  <tr
                    key={m.id}
                    className="border-b border-zinc-50 dark:border-zinc-800/50 last:border-0 text-sm"
                  >
                    <td className="py-3 pr-4 font-bold text-zinc-700 dark:text-zinc-300">
                      {format(new Date(m.date), 'dd MMM yyyy', { locale: es })}
                    </td>
                    <td className="py-3 pr-4 font-black text-zinc-900 dark:text-white">
                      {m.weight != null ? `${m.weight} kg` : '—'}
                    </td>
                    <td className="py-3 pr-4 text-zinc-500">
                      {m.body_fat_percentage != null ? `${m.body_fat_percentage}%` : '—'}
                    </td>
                    <td className="py-3 pr-4 text-zinc-500">
                      {m.waist != null ? `${m.waist} cm` : '—'}
                    </td>
                    <td className="py-3 pr-4 text-zinc-500">
                      {m.arm != null ? `${m.arm} cm` : '—'}
                    </td>
                    <td className="py-3 text-zinc-500">
                      {m.leg != null ? `${m.leg} cm` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-zinc-400 text-center py-8 font-bold uppercase tracking-widest text-[10px]">
            Sin mediciones registradas
          </p>
        )}
      </Card>

      {/* Últimos entrenamientos */}
      {workouts.length > 0 && (
        <Card>
          <h2 className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Dumbbell className="h-4 w-4" />
            Actividad reciente
          </h2>
          <div className="space-y-3">
            {workouts.slice(0, 5).map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0"
              >
                <p className="font-black text-zinc-800 dark:text-zinc-200 uppercase text-sm tracking-tight">
                  {w.routine_name}
                </p>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  {format(new Date(w.start_time), 'dd MMM yyyy · HH:mm', { locale: es })}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <h2 className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-6 flex items-center gap-2">
          <Lock className="h-4 w-4" />
          Seguridad
        </h2>
        {passwordMsg && (
          <p className="text-sm font-black uppercase tracking-widest text-emerald-600 mb-4">{passwordMsg}</p>
        )}
        {passwordError && (
          <p className="text-sm font-black uppercase tracking-widest text-red-500 mb-4">{passwordError}</p>
        )}
        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <div>
            <Label>Contraseña actual</Label>
            <Input
              type="password"
              autoComplete="current-password"
              value={passwordForm.current_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
              required
            />
          </div>
          <div>
            <Label>Nueva contraseña</Label>
            <Input
              type="password"
              autoComplete="new-password"
              value={passwordForm.new_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
              minLength={8}
              required
            />
            <p className="text-[10px] text-zinc-400 mt-1">Mínimo 8 caracteres</p>
          </div>
          <div>
            <Label>Confirmar nueva contraseña</Label>
            <Input
              type="password"
              autoComplete="new-password"
              value={passwordForm.confirm_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
              required
            />
          </div>
          <Button type="submit" variant="secondary" disabled={passwordSaving}>
            <Lock className="h-4 w-4" />
            {passwordSaving ? 'Actualizando...' : 'Cambiar contraseña'}
          </Button>
        </form>
      </Card>

      <Modal
        open={isAddingMeasurement}
        onClose={() => setIsAddingMeasurement(false)}
        title="Nueva medición"
        maxWidth="xl"
        scrollable
      >
        {measurementError && (
          <p className="text-sm text-red-500 font-bold mb-4">{measurementError}</p>
        )}
        <form onSubmit={handleAddMeasurement} className="space-y-4">
          <div>
            <Label>Fecha</Label>
            <Input
              type="date"
              value={measurementForm.date}
              onChange={(e) => setMeasurementForm({ ...measurementForm, date: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Peso (kg)</Label>
              <Input
                type="number"
                step="0.1"
                value={measurementForm.weight}
                onChange={(e) => setMeasurementForm({ ...measurementForm, weight: e.target.value })}
              />
            </div>
            <div>
              <Label>Grasa (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={measurementForm.body_fat_percentage}
                onChange={(e) =>
                  setMeasurementForm({ ...measurementForm, body_fat_percentage: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Cintura (cm)</Label>
              <Input
                type="number"
                step="0.1"
                value={measurementForm.waist}
                onChange={(e) => setMeasurementForm({ ...measurementForm, waist: e.target.value })}
              />
            </div>
            <div>
              <Label>Brazo (cm)</Label>
              <Input
                type="number"
                step="0.1"
                value={measurementForm.arm}
                onChange={(e) => setMeasurementForm({ ...measurementForm, arm: e.target.value })}
              />
            </div>
          </div>
          <Button type="submit" className="w-full">
            Guardar medición
          </Button>
        </form>
      </Modal>
    </div>
  );
}
