import { useState, useEffect, useMemo, FormEvent, ChangeEvent, lazy, Suspense } from 'react';
import { apiFetch, parseJsonResponse, resolveAvatarUrl } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useMemberStatsOptional } from '../context/MemberStatsContext';
import {
  User,
  Scale,
  Camera,
  Trash2,
  Save,
  Plus,
  TrendingDown,
  TrendingUp,
  Minus,
  Lock,
  CreditCard,
  AlertTriangle,
  Palette,
  Sun,
  Moon,
  IdCard,
  Bell,
  ScanLine,
  ChevronDown,
  MessageCircle,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Button,
  Card,
  Modal,
  PageHeader,
  Label,
  Input,
  Spinner,
  Textarea,
  PasswordInput,
  passwordStrength,
  SegmentedControl,
  EmptyState,
  PageState,
  BackToDashboardLink,
  Accordion,
  AccordionItem,
} from '../components/ui';
import { PushNotificationsToggle } from '../components/PushNotificationsToggle';
import { cn } from '../lib/utils';
import { usePageTitle } from '../hooks/usePageTitle';
import { useToastOptional } from '../context/ToastContext';
import {
  expiryBannerClasses,
  formatExpiryCountdown,
  getExpirySeverity,
  MEMBER_UI_ALERT_DAYS,
  shouldShowExpiryAlert,
} from '../lib/expiryUtils';

const ProfileWeightChart = lazy(() => import('../components/ProfileWeightChart'));
import { format } from 'date-fns';
import { dateLocale as es } from '../lib/dateLocale';
import {
  useProfileQuery,
  useProfileMeasurementsQuery,
  useProfileWorkoutHistoryQuery,
  useInvalidateProfile,
  type UserProfile,
  type Measurement,
} from '../hooks/queries/useProfileQuery';
import { StatMini } from './profile/StatMini';
import ThemePalettePicker from '../components/ThemePalettePicker';
import { MemberBadgeModal } from '../components/member/MemberBadgeModal';
import { MemberBadgeCard, type MemberBadgeData } from '../components/member/MemberBadgeCard';
import { MemberBadgeScanView } from '../components/member/MemberBadgeScanView';
import { useTrainerMeQuery } from '../hooks/queries/useTrainersQuery';
import { ProfileHealthTab } from './profile/ProfileHealthTab';
import { LEVEL_LABELS, SHIFT_LABELS } from '../lib/trainingShift';

/** Demo/legacy rows sometimes store meters (e.g. 1.75); UI expects cm. */
function heightCmForForm(height: number | null | undefined): string {
  if (height == null || Number.isNaN(height)) return '';
  if (height > 0 && height < 3) return String(Math.round(height * 1000) / 10);
  return String(height);
}

function heightCmNumber(height: number | null | undefined): number | null {
  if (height == null || Number.isNaN(height)) return null;
  if (height > 0 && height < 3) return Math.round(height * 1000) / 10;
  return height;
}

export default function Profile() {
  const { user, logoutLocal } = useAuth();
  usePageTitle('Perfil');
  const { theme, setTheme } = useTheme();
  const memberStats = useMemberStatsOptional();
  const invalidateProfile = useInvalidateProfile();
  const isMember = user?.role === 'member';
  const isTrainer = user?.role === 'trainer';
  const { data: trainerProfile } = useTrainerMeQuery(isTrainer && !!user);
  const { data: profile, isPending: profileLoading } = useProfileQuery(user?.id);
  const { data: measurements = [], isPending: measLoading } = useProfileMeasurementsQuery(user?.id);
  const { data: workouts = [], isPending: histLoading } = useProfileWorkoutHistoryQuery(
    user?.id,
    isMember
  );
  const loading = profileLoading;
  const progressLoading = measLoading || (isMember && histLoading);
  const [searchParams, setSearchParams] = useSearchParams();
  const [profileTab, setProfileTab] = useState<
    'datos' | 'salud' | 'progreso' | 'seguridad' | 'apariencia' | 'carne'
  >('datos');
  const [saving, setSaving] = useState(false);
  const toast = useToastOptional();
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarRemoving, setAvatarRemoving] = useState(false);
  const [showRemoveAvatarModal, setShowRemoveAvatarModal] = useState(false);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [showScanView, setShowScanView] = useState(false);
  const [isAddingMeasurement, setIsAddingMeasurement] = useState(false);
  const [measurementError, setMeasurementError] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
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

  useEffect(() => {
    if (!profile) return;
    setForm({
      phone: profile.phone ?? '',
      initial_weight: profile.initial_weight?.toString() ?? '',
      height: heightCmForForm(profile.height),
      goal: profile.goal ?? '',
      dob: profile.dob ? profile.dob.split('T')[0] : '',
    });
  }, [profile]);

  const chartData = useMemo(() => {
    return [...measurements]
      .filter((m): m is typeof m & { weight: number } => m.weight != null)
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
    const hCm = heightCmNumber(profile.height);
    if (hCm == null || hCm <= 0) return null;
    const h = hCm / 100;
    return Math.round((latestWeight / (h * h)) * 10) / 10;
  }, [latestWeight, profile?.height]);

  const isProfileDirty = useMemo(() => {
    if (!profile) return false;
    const saved = {
      phone: (profile.phone ?? '').trim(),
      initial_weight: profile.initial_weight?.toString() ?? '',
      height: heightCmForForm(profile.height),
      goal: (profile.goal ?? '').trim(),
      dob: profile.dob ? profile.dob.split('T')[0] : '',
    };
    const current = {
      phone: form.phone.trim(),
      initial_weight: form.initial_weight.trim(),
      height: form.height.trim(),
      goal: form.goal.trim(),
      dob: form.dob,
    };
    return JSON.stringify(saved) !== JSON.stringify(current);
  }, [form, profile]);

  const subscription = memberStats?.stats?.subscription ?? null;
  const workoutsThisMonth = memberStats?.stats?.workoutsThisMonth ?? 0;

  const badgeMember = useMemo((): MemberBadgeData | null => {
    if (!profile?.cedula || !user) return null;
    return {
      id: profile.id,
      full_name: profile.full_name,
      cedula: profile.cedula,
      profile_image: profile.profile_image,
      membership_name: subscription?.membership_name ?? null,
      training_shift: profile.training_shift ?? null,
      role: user.role,
      created_at: profile.created_at ?? null,
      subscription_end: subscription?.end_date ?? null,
    };
  }, [profile, user, subscription]);

  const profileTabOptions = useMemo(() => {
    const options: { value: typeof profileTab; label: string }[] = [
      { value: 'datos', label: 'Datos' },
    ];
    if (isMember && profile?.cedula) {
      options.push({ value: 'carne', label: 'Carné' });
    }
    if (isMember) {
      options.push({ value: 'salud', label: 'Salud' });
      options.push({ value: 'progreso', label: 'Progreso' });
    }
    options.push(
      { value: 'apariencia', label: 'Apariencia' },
      { value: 'seguridad', label: 'Seguridad' }
    );
    return options;
  }, [isMember, profile?.cedula]);

  useEffect(() => {
    const raw = searchParams.get('tab');
    if (!raw) return;
    const allowed = profileTabOptions.map((o) => o.value);
    if (allowed.includes(raw as typeof profileTab)) {
      setProfileTab(raw as typeof profileTab);
    }
  }, [searchParams, profileTabOptions]);

  const changeProfileTab = (next: typeof profileTab) => {
    setProfileTab(next);
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (next === 'datos') {
          params.delete('tab');
        } else {
          params.set('tab', next);
        }
        return params;
      },
      { replace: true }
    );
  };

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
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
      if (user) invalidateProfile(user.id);
      void updated;
      toast?.success('Perfil actualizado');
    } catch (err) {
      toast?.error(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const res = await apiFetch(`/api/users/${user.id}/avatar`, {
        method: 'POST',
        body: fd,
      });
      const data = await parseJsonResponse<{ profile_image: string }>(res);
      if (user) invalidateProfile(user.id);
      void data;
      toast?.success('Foto actualizada');
    } catch (err) {
      toast?.error(err instanceof Error ? err.message : 'Error al subir foto');
    } finally {
      setAvatarUploading(false);
      e.target.value = '';
    }
  };

  const handleAvatarRemove = async () => {
    if (!user) return;
    setAvatarRemoving(true);
    try {
      const res = await apiFetch(`/api/users/${user.id}/avatar`, { method: 'DELETE' });
      await parseJsonResponse<{ profile_image: null }>(res);
      invalidateProfile(user.id);
      setShowRemoveAvatarModal(false);
      toast?.success('Foto eliminada');
    } catch (err) {
      toast?.error(err instanceof Error ? err.message : 'Error al quitar foto');
    } finally {
      setAvatarRemoving(false);
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordError('');
    try {
      const res = await apiFetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordForm),
      });
      await parseJsonResponse(res);
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      logoutLocal('Contraseña actualizada. Inicia sesión de nuevo.');
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
      if (user) invalidateProfile(user.id);
      void created;
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
      <PageState>
        <Spinner />
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">Cargando perfil…</p>
      </PageState>
    );
  }

  if (!profile || !user) {
    return (
      <div className="py-16 text-center text-sm text-zinc-500 dark:text-zinc-400">
        No se pudo cargar el perfil
      </div>
    );
  }

  const avatarUrl = resolveAvatarUrl(profile.profile_image);

  return (
    <div className="page-stack-tight mx-auto w-full max-w-4xl">
      <PageHeader
        compact
        title={
          <>
            Mi <span className="text-brand">perfil</span>
          </>
        }
        subtitle={user.role === 'member' ? 'Tu cuenta' : 'Tu cuenta y apariencia'}
        action={
          (isProfileDirty && profileTab === 'datos') || user.role !== 'member' ? (
            <div className="flex shrink-0 items-center gap-2">
              {isProfileDirty && profileTab === 'datos' && (
                <span className="text-[10px] font-semibold text-amber-600 sm:text-xs dark:text-amber-400">
                  Sin guardar
                </span>
              )}
              {user.role !== 'member' && <BackToDashboardLink iconOnly className="sm:hidden" />}
              {user.role !== 'member' && (
                <span className="hidden sm:inline-flex">
                  <BackToDashboardLink />
                </span>
              )}
            </div>
          ) : undefined
        }
      />

      {user.role === 'member' &&
        subscription &&
        shouldShowExpiryAlert(subscription.days_remaining, MEMBER_UI_ALERT_DAYS) &&
        (() => {
          const severity = getExpirySeverity(subscription.days_remaining, MEMBER_UI_ALERT_DAYS);
          const classes = expiryBannerClasses(severity);
          return (
            <div
              className={`flex flex-col justify-between gap-2 rounded-xl border px-3 py-2.5 sm:flex-row sm:items-center ${classes.container}`}
            >
              <div className="flex min-w-0 items-start gap-2">
                <AlertTriangle
                  className={`mt-0.5 h-4 w-4 shrink-0 ${severity === 'critical' ? 'text-red-500' : 'text-warning'}`}
                />
                <div className="min-w-0">
                  <p className={`text-xs leading-snug font-semibold sm:text-sm ${classes.text}`}>
                    {formatExpiryCountdown(
                      subscription.days_remaining,
                      `plan ${subscription.membership_name}`
                    )}
                  </p>
                  <p className="mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                    Vence {format(new Date(subscription.end_date), 'dd MMM yyyy', { locale: es })}
                  </p>
                </div>
              </div>
              <Link
                to="/payments"
                className={`inline-flex shrink-0 items-center gap-2 text-xs font-semibold ${classes.link}`}
              >
                <CreditCard className="h-4 w-4" />
                Renovar
              </Link>
            </div>
          );
        })()}

      {user.role === 'member' && !subscription && (
        <div className="flex flex-col justify-between gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-2.5 sm:flex-row sm:items-center">
          <p className="text-xs leading-snug font-semibold text-yellow-700 sm:text-sm dark:text-yellow-400">
            No tienes una membresía activa. Reporta tu pago para reactivar el acceso.
          </p>
          <Link
            to="/payments"
            className="shrink-0 text-xs font-semibold text-yellow-800 hover:underline dark:text-yellow-300"
          >
            Reportar pago
          </Link>
        </div>
      )}

      <div className="pb-0.5 md:pb-1">
        <SegmentedControl
          variant="compact"
          layout="wrap"
          fullWidth
          className="w-full"
          value={profileTab}
          onChange={changeProfileTab}
          options={profileTabOptions}
        />
      </div>

      {profileTab === 'datos' && (
        <div className="w-full">
          <Card
            padding="sm"
            rounded="xl"
            className={cn(
              'border-zinc-200/70 bg-white/80 md:p-5 dark:border-zinc-800/80 dark:bg-zinc-900/50'
            )}
          >
            <div className="md:grid md:grid-cols-[minmax(13rem,17rem)_minmax(0,1fr)] md:items-start md:gap-6 lg:gap-8">
              <div className="mb-3.5 md:mb-0">
                <div className="flex items-center gap-3 md:flex-col md:items-start md:gap-3">
                  <div className="relative shrink-0">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={profile.full_name}
                        className="ring-brand/25 h-12 w-12 rounded-xl object-cover ring-2 sm:h-14 sm:w-14 md:h-20 md:w-20 md:rounded-2xl"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 sm:h-14 sm:w-14 md:h-20 md:w-20 md:rounded-2xl dark:bg-zinc-800">
                        <User className="h-6 w-6 text-zinc-400 md:h-8 md:w-8 dark:text-zinc-300" />
                      </div>
                    )}
                    <label
                      htmlFor="avatar-upload"
                      className="brand-solid brand-solid-hover absolute -right-1 -bottom-1 inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg shadow-md transition-colors md:h-7 md:w-7"
                      title="Cambiar foto"
                      aria-label="Cambiar foto de perfil"
                    >
                      <Camera className="h-3 w-3 md:h-3.5 md:w-3.5" />
                    </label>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleAvatarChange}
                      disabled={avatarUploading || avatarRemoving}
                    />
                  </div>
                  <div className="min-w-0 md:w-full">
                    <p className="truncate text-[15px] font-semibold text-zinc-900 md:text-base md:whitespace-normal dark:text-white">
                      {profile.full_name}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-zinc-500 md:text-xs md:whitespace-normal dark:text-zinc-400">
                      {profile.email}
                    </p>
                    {profile.cedula && (
                      <p className="mt-0.5 text-[10px] text-zinc-400 md:text-[11px] dark:text-zinc-500">
                        {profile.cedula}
                      </p>
                    )}
                    {avatarUploading && (
                      <p className="text-brand mt-1 text-[10px] font-medium">Subiendo foto…</p>
                    )}
                    {avatarUrl && !avatarUploading && (
                      <div className="mt-1 flex flex-wrap items-center gap-2 md:mt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowRemoveAvatarModal(true);
                          }}
                          disabled={avatarRemoving}
                          className="text-[10px] font-semibold text-zinc-500 transition-colors hover:text-red-500 disabled:opacity-50 sm:text-xs dark:text-zinc-400 dark:hover:text-red-400"
                        >
                          Quitar foto
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {isTrainer && trainerProfile && (
                  <div className="mt-3.5 space-y-1 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 md:mt-4">
                    <p className="text-xs font-bold text-zinc-900 dark:text-white">
                      Perfil profesional
                    </p>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                      Nivel: <strong>{LEVEL_LABELS[trainerProfile.level]}</strong>
                    </p>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                      Turno: <strong>{SHIFT_LABELS[trainerProfile.shift]}</strong>
                    </p>
                    {trainerProfile.specialty && (
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                        Especialidad: <strong>{trainerProfile.specialty}</strong>
                      </p>
                    )}
                    <p className="pt-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                      Para cambiar nivel, turno o especialidad, contacta al administrador (sección
                      Entrenadores).
                    </p>
                  </div>
                )}
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-2.5 md:space-y-3">
                <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
                  <div>
                    <Label>Teléfono</Label>
                    <Input
                      type="tel"
                      inputMode="tel"
                      value={form.phone}
                      onChange={(e) => {
                        setForm({ ...form, phone: e.target.value });
                      }}
                      placeholder="+58 412 0000000"
                    />
                  </div>
                  <div>
                    <Label>Fecha de nacimiento</Label>
                    <Input
                      type="date"
                      value={form.dob}
                      onChange={(e) => {
                        setForm({ ...form, dob: e.target.value });
                      }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div>
                    <Label>Peso inicial (kg)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      inputMode="decimal"
                      value={form.initial_weight}
                      onChange={(e) => {
                        setForm({ ...form, initial_weight: e.target.value });
                      }}
                      placeholder="70"
                    />
                  </div>
                  <div>
                    <Label>Altura (cm)</Label>
                    <Input
                      type="number"
                      step="1"
                      inputMode="decimal"
                      value={form.height}
                      onChange={(e) => {
                        setForm({ ...form, height: e.target.value });
                      }}
                      placeholder="170"
                    />
                  </div>
                </div>
                <div>
                  <Label>Objetivo</Label>
                  <Textarea
                    value={form.goal}
                    onChange={(e) => {
                      setForm({ ...form, goal: e.target.value });
                    }}
                    rows={2}
                    className="min-h-[4rem] resize-none rounded-xl px-3 py-2.5 text-sm md:min-h-[5rem]"
                    placeholder="Ej: bajar grasa, ganar músculo…"
                  />
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={saving || !isProfileDirty}
                  size="sm"
                  className={cn(
                    'h-10 min-h-10 w-full sm:w-auto sm:px-4',
                    isProfileDirty ? 'ring-2 ring-amber-500/25' : 'opacity-45'
                  )}
                  aria-label="Guardar perfil"
                >
                  <Save className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {saving ? 'Guardando…' : 'Guardar perfil'}
                  </span>
                  <span className="sm:hidden">{saving ? '…' : 'Guardar'}</span>
                </Button>
              </form>
            </div>
          </Card>
        </div>
      )}

      {profileTab === 'salud' && isMember && (
        <ProfileHealthTab
          userId={user.id}
          profile={profile}
          measurements={measurements}
          onSwitchToDatos={() => setProfileTab('datos')}
        />
      )}

      {profileTab === 'progreso' && isMember && (
        <div className="w-full space-y-3">
          {progressLoading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                <StatMini
                  label="Peso actual"
                  value={latestWeight != null ? `${latestWeight} kg` : '—'}
                  sub={
                    weightDelta != null
                      ? `${weightDelta > 0 ? '+' : ''}${weightDelta} kg vs inicial`
                      : undefined
                  }
                />
                <StatMini
                  label="IMC"
                  value={bmi != null ? bmi.toString() : '—'}
                  sub={
                    heightCmNumber(profile.height) != null
                      ? `${heightCmNumber(profile.height)} cm`
                      : undefined
                  }
                />
                <StatMini label="Mediciones" value={String(measurements.length)} />
                <StatMini label="Entrenos este mes" value={String(workoutsThisMonth)} />
              </div>

              <Card
                padding="sm"
                rounded="xl"
                className="border-zinc-200/70 bg-white/80 dark:border-zinc-800/80 dark:bg-zinc-900/50"
              >
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  <h2 className="text-[13px] font-semibold text-zinc-900 dark:text-white">
                    Evolución de peso
                  </h2>
                  <div className="flex shrink-0 items-center gap-2">
                    {weightDelta != null && (
                      <span
                        className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                          weightDelta < 0
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : weightDelta > 0
                              ? 'text-brand bg-brand/10'
                              : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
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
                    {chartData.length > 0 && (
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 min-h-8 px-2.5"
                        onClick={() => {
                          setIsAddingMeasurement(true);
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Medición</span>
                      </Button>
                    )}
                  </div>
                </div>

                {chartData.length >= 2 ? (
                  <Suspense
                    fallback={
                      <div className="flex h-56 items-center justify-center">
                        <Spinner />
                      </div>
                    }
                  >
                    <ProfileWeightChart data={chartData} />
                  </Suspense>
                ) : chartData.length === 1 ? (
                  <div className="flex h-40 flex-col items-center justify-center text-center sm:h-48">
                    <p className="text-brand text-3xl font-bold">{chartData[0].weight} kg</p>
                    <p className="mt-1.5 text-[11px] text-zinc-400 dark:text-zinc-500">
                      {chartData[0].date} · Añade otra medición para la gráfica
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center px-2 pt-4 pb-5 text-center">
                    <Scale className="text-brand/50 mb-2.5 h-7 w-7" aria-hidden />
                    <p className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-100">
                      Sin mediciones de peso
                    </p>
                    <p className="mt-1 max-w-[14rem] text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
                      Registra tu peso para ver la evolución.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      className="mt-4 h-9 min-h-9"
                      onClick={() => {
                        setIsAddingMeasurement(true);
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Registrar peso
                    </Button>
                  </div>
                )}
              </Card>

              {measurements.length > 0 && (
                <Card
                  padding="sm"
                  rounded="xl"
                  className="border-zinc-200/70 bg-white/80 dark:border-zinc-800/80 dark:bg-zinc-900/50"
                >
                  <button
                    type="button"
                    onClick={() => setHistoryOpen((v) => !v)}
                    className="flex w-full items-center justify-between gap-2 text-left"
                    aria-expanded={historyOpen}
                  >
                    <h2 className="text-[13px] font-semibold text-zinc-900 dark:text-white">
                      Historial
                      <span className="ml-1.5 font-normal text-zinc-400 dark:text-zinc-500">
                        · {measurements.length}
                      </span>
                    </h2>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 shrink-0 text-zinc-400 transition-transform',
                        historyOpen && 'rotate-180'
                      )}
                    />
                  </button>

                  {historyOpen && (
                    <>
                      <div className="mt-2.5 space-y-1.5 lg:hidden">
                        {measurements.map((m) => (
                          <div key={m.id} className="rounded-xl px-2.5 py-2 dark:bg-zinc-950/40">
                            <div className="flex items-baseline justify-between gap-2">
                              <p className="text-[12px] font-semibold text-zinc-900 dark:text-white">
                                {format(new Date(m.date), 'dd MMM yyyy', { locale: es })}
                              </p>
                              <p className="text-[12px] font-semibold text-zinc-800 tabular-nums dark:text-zinc-200">
                                {m.weight != null ? `${m.weight} kg` : '—'}
                              </p>
                            </div>
                            <p className="mt-0.5 text-[10px] text-zinc-400 dark:text-zinc-500">
                              Grasa{' '}
                              {m.body_fat_percentage != null ? `${m.body_fat_percentage}%` : '—'}
                              {' · '}
                              Cintura {m.waist != null ? `${m.waist}` : '—'}
                              {' · '}
                              Brazo {m.arm != null ? `${m.arm}` : '—'}
                              {' · '}
                              Pierna {m.leg != null ? `${m.leg}` : '—'}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="-mx-1 mt-2.5 hidden overflow-x-auto px-1 lg:block">
                        <table className="w-full min-w-[28rem] text-left">
                          <thead>
                            <tr className="border-b border-zinc-100 text-[10px] font-semibold text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                              <th className="pr-3 pb-2">Fecha</th>
                              <th className="pr-3 pb-2">Peso</th>
                              <th className="pr-3 pb-2">Grasa</th>
                              <th className="pr-3 pb-2">Cintura</th>
                              <th className="pr-3 pb-2">Brazo</th>
                              <th className="pb-2">Pierna</th>
                            </tr>
                          </thead>
                          <tbody>
                            {measurements.map((m) => (
                              <tr
                                key={m.id}
                                className="border-b border-zinc-50 text-xs last:border-0 sm:text-sm dark:border-zinc-800/50"
                              >
                                <td className="py-2 pr-3 font-medium whitespace-nowrap text-zinc-700 dark:text-zinc-300">
                                  {format(new Date(m.date), 'dd MMM yyyy', { locale: es })}
                                </td>
                                <td className="py-2 pr-3 font-semibold text-zinc-900 dark:text-white">
                                  {m.weight != null ? `${m.weight} kg` : '—'}
                                </td>
                                <td className="py-2 pr-3 text-zinc-500 dark:text-zinc-400">
                                  {m.body_fat_percentage != null
                                    ? `${m.body_fat_percentage}%`
                                    : '—'}
                                </td>
                                <td className="py-2 pr-3 text-zinc-500 dark:text-zinc-400">
                                  {m.waist != null ? `${m.waist} cm` : '—'}
                                </td>
                                <td className="py-2 pr-3 text-zinc-500 dark:text-zinc-400">
                                  {m.arm != null ? `${m.arm} cm` : '—'}
                                </td>
                                <td className="py-2 text-zinc-500 dark:text-zinc-400">
                                  {m.leg != null ? `${m.leg} cm` : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </Card>
              )}

              {workouts.length > 0 && (
                <Card
                  padding="sm"
                  rounded="xl"
                  className="border-zinc-200/70 bg-white/80 dark:border-zinc-800/80 dark:bg-zinc-900/50"
                >
                  <h2 className="mb-2 text-[13px] font-semibold text-zinc-900 dark:text-white">
                    Actividad reciente
                  </h2>
                  <div className="space-y-0.5">
                    {workouts.slice(0, 5).map((w) => (
                      <div
                        key={w.id}
                        className="flex items-center justify-between gap-2 border-b border-zinc-100/80 py-2 last:border-0 dark:border-zinc-800/80"
                      >
                        <p className="truncate text-xs font-medium text-zinc-800 sm:text-sm dark:text-zinc-200">
                          {w.routine_name}
                        </p>
                        <p className="shrink-0 text-[10px] text-zinc-400 tabular-nums sm:text-xs dark:text-zinc-500">
                          {format(new Date(w.start_time), 'dd MMM · HH:mm', { locale: es })}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {profileTab === 'carne' && isMember && (
        <div className="mx-auto w-full max-w-sm pt-1 md:max-w-2xl">
          {badgeMember ? (
            <div className="flex flex-col items-center gap-4 md:grid md:grid-cols-[minmax(0,1fr)_minmax(12rem,16rem)] md:items-center md:gap-8">
              <div className="flex w-full flex-col items-center gap-3 md:items-start">
                <div className="w-full text-center md:text-left">
                  <h2 className="text-[13px] font-semibold text-zinc-900 md:text-sm dark:text-white">
                    Carné digital
                  </h2>
                  <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                    Muéstralo en recepción · sube el brillo
                  </p>
                </div>

                <div className="-mb-8 origin-top scale-[0.82] sm:-mb-6 sm:scale-90 md:mb-0 md:scale-100">
                  <MemberBadgeCard
                    member={badgeMember}
                    side="front"
                    className="shadow-[0_10px_28px_-12px_rgba(0,0,0,0.35)] dark:shadow-[0_12px_32px_-10px_rgba(0,0,0,0.65)]"
                  />
                </div>
              </div>

              <div className="flex w-full flex-col items-center gap-2.5 md:items-stretch">
                <Button className="h-11 min-h-11 w-full" onClick={() => setShowScanView(true)}>
                  <ScanLine className="h-4 w-4" />
                  Mostrar QR
                </Button>
                <button
                  type="button"
                  onClick={() => setShowBadgeModal(true)}
                  className="text-[11px] font-medium text-zinc-500 underline-offset-2 hover:text-zinc-700 hover:underline md:text-center dark:text-zinc-400 dark:hover:text-zinc-200"
                >
                  Ver carné completo / Imprimir
                </button>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={IdCard}
              title="Carné no disponible"
              description="Falta tu cédula en el perfil. Pide a recepción que la complete."
              action={
                <Link
                  to="/messages"
                  className="brand-solid brand-solid-hover inline-flex min-h-[var(--touch-min)] items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold tracking-wide shadow-md shadow-zinc-900/10"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Escribir a recepción
                </Link>
              }
            />
          )}
        </div>
      )}

      {profileTab === 'apariencia' && (
        <div className="w-full">
          <Card
            padding="sm"
            rounded="xl"
            className="border-zinc-200/70 bg-white/80 md:p-5 dark:border-zinc-800/80 dark:bg-zinc-900/50"
          >
            <h2 className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-zinc-900 md:text-sm dark:text-white">
              <Palette className="text-brand h-3.5 w-3.5" />
              Apariencia
            </h2>

            <div className="md:grid md:grid-cols-2 md:gap-6 lg:gap-8">
              <div>
                <p className="mb-2 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                  Color de acento
                </p>
                <ThemePalettePicker />
              </div>

              <div className="mt-4 border-t border-zinc-100 pt-3 md:mt-0 md:border-t-0 md:border-l md:pt-0 md:pl-6 lg:pl-8 dark:border-zinc-800">
                <p className="mb-2 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                  Fondo · también en la barra superior
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={theme === 'light' ? 'primary' : 'secondary'}
                    onClick={() => setTheme('light')}
                    className="flex-1"
                  >
                    <Sun className="h-4 w-4" />
                    Claro
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={theme === 'dark' ? 'primary' : 'secondary'}
                    onClick={() => setTheme('dark')}
                    className="flex-1"
                  >
                    <Moon className="h-4 w-4" />
                    Oscuro
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {profileTab === 'seguridad' && (
        <div className="grid w-full gap-3 md:grid-cols-2 md:items-start md:gap-4">
          <div className="space-y-3">
            <Card
              padding="sm"
              rounded="xl"
              className="border-zinc-200/70 bg-white/80 md:p-4 dark:border-zinc-800/80 dark:bg-zinc-900/50"
            >
              <h2 className="mb-1 flex items-center gap-1.5 text-[13px] font-semibold text-zinc-900 dark:text-white">
                <Bell className="text-brand h-3.5 w-3.5" />
                Notificaciones
              </h2>
              <p className="mb-3 text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
                Pagos, mensajes y novedades en este dispositivo.
              </p>
              <PushNotificationsToggle />
            </Card>

            {user.role !== 'member' && (
              <Card
                padding="sm"
                rounded="xl"
                className="border-zinc-200/70 bg-white/80 md:p-4 dark:border-zinc-800/80 dark:bg-zinc-900/50"
              >
                <h2 className="mb-1 text-[13px] font-semibold text-zinc-900 dark:text-white">
                  Verificación en dos pasos
                </h2>
                <p className="mb-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                  Protege tu cuenta de staff con MFA (TOTP).
                </p>
                <Link
                  to="/security"
                  className="text-brand inline-flex items-center gap-1 text-sm font-semibold hover:underline"
                >
                  Configurar MFA →
                </Link>
              </Card>
            )}
          </div>

          <Accordion>
            <AccordionItem
              title="Cambiar contraseña"
              icon={<Lock className="text-brand h-4 w-4" />}
              className="rounded-xl"
              defaultOpen
            >
              {passwordError && (
                <p className="mb-3 text-xs font-medium text-red-500">{passwordError}</p>
              )}
              <form onSubmit={handleChangePassword} className="space-y-3">
                <div>
                  <Label htmlFor="current_password">Contraseña actual</Label>
                  <PasswordInput
                    id="current_password"
                    autoComplete="current-password"
                    value={passwordForm.current_password}
                    onChange={(e) => {
                      setPasswordForm({ ...passwordForm, current_password: e.target.value });
                    }}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="new_password">Nueva contraseña</Label>
                  <PasswordInput
                    id="new_password"
                    autoComplete="new-password"
                    value={passwordForm.new_password}
                    onChange={(e) => {
                      setPasswordForm({ ...passwordForm, new_password: e.target.value });
                    }}
                    minLength={8}
                    required
                  />
                  {passwordForm.new_password &&
                    (() => {
                      const strength = passwordStrength(passwordForm.new_password);
                      return (
                        <div className="mt-2 space-y-1">
                          <div className="flex gap-1">
                            {[1, 2, 3].map((level) => (
                              <div
                                key={level}
                                className={cn(
                                  'h-1 flex-1 rounded-full transition-colors',
                                  strength.score >= level
                                    ? level === 1
                                      ? 'bg-red-500'
                                      : level === 2
                                        ? 'bg-yellow-500'
                                        : 'bg-emerald-500'
                                    : 'bg-zinc-200 dark:bg-zinc-700'
                                )}
                              />
                            ))}
                          </div>
                          <p className="text-xs font-medium text-zinc-400 dark:text-zinc-300">
                            Fortaleza: {strength.label}
                          </p>
                        </div>
                      );
                    })()}
                </div>
                <div>
                  <Label htmlFor="confirm_password">Confirmar nueva contraseña</Label>
                  <PasswordInput
                    id="confirm_password"
                    autoComplete="new-password"
                    value={passwordForm.confirm_password}
                    onChange={(e) => {
                      setPasswordForm({ ...passwordForm, confirm_password: e.target.value });
                    }}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={passwordSaving}
                  size="sm"
                  className="h-10 min-h-10 w-full sm:w-auto"
                >
                  <Lock className="h-4 w-4" />
                  {passwordSaving ? 'Actualizando…' : 'Actualizar contraseña'}
                </Button>
              </form>
            </AccordionItem>
          </Accordion>
        </div>
      )}

      <Modal
        open={showRemoveAvatarModal}
        onClose={() => !avatarRemoving && setShowRemoveAvatarModal(false)}
        title="Quitar foto de perfil"
        maxWidth="sm"
      >
        <p className="mb-5 text-sm text-zinc-500 dark:text-zinc-400">
          ¿Quitar tu foto de perfil? Volverás al avatar por defecto.
        </p>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setShowRemoveAvatarModal(false);
            }}
            disabled={avatarRemoving}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => void handleAvatarRemove()}
            loading={avatarRemoving}
          >
            <Trash2 className="h-4 w-4" />
            Quitar foto
          </Button>
        </div>
      </Modal>

      <MemberBadgeModal
        open={showBadgeModal}
        onClose={() => {
          setShowBadgeModal(false);
        }}
        member={badgeMember}
      />

      {badgeMember && (
        <MemberBadgeScanView
          open={showScanView}
          onClose={() => setShowScanView(false)}
          member={badgeMember}
        />
      )}

      <Modal
        open={isAddingMeasurement}
        onClose={() => {
          setIsAddingMeasurement(false);
        }}
        title="Registrar peso"
        maxWidth="sm"
      >
        {measurementError && (
          <p className="mb-3 text-sm font-medium text-red-500">{measurementError}</p>
        )}
        <form onSubmit={handleAddMeasurement} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Fecha</Label>
              <Input
                type="date"
                value={measurementForm.date}
                onChange={(e) => {
                  setMeasurementForm({ ...measurementForm, date: e.target.value });
                }}
                required
              />
            </div>
            <div>
              <Label>Peso (kg)</Label>
              <Input
                type="number"
                step="0.1"
                value={measurementForm.weight}
                onChange={(e) => {
                  setMeasurementForm({ ...measurementForm, weight: e.target.value });
                }}
                placeholder="Ej. 72.5"
                autoFocus
              />
            </div>
          </div>
          <details className="group rounded-lg border border-zinc-200 dark:border-zinc-700">
            <summary className="cursor-pointer list-none px-3 py-2 text-[11px] font-medium text-zinc-500 marker:content-none dark:text-zinc-400 [&::-webkit-details-marker]:hidden">
              Más medidas (opcional)
            </summary>
            <div className="grid grid-cols-2 gap-3 border-t border-zinc-100 px-3 pt-2 pb-3 dark:border-zinc-800">
              <div>
                <Label>Grasa (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={measurementForm.body_fat_percentage}
                  onChange={(e) => {
                    setMeasurementForm({
                      ...measurementForm,
                      body_fat_percentage: e.target.value,
                    });
                  }}
                />
              </div>
              <div>
                <Label>Cintura (cm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={measurementForm.waist}
                  onChange={(e) => {
                    setMeasurementForm({ ...measurementForm, waist: e.target.value });
                  }}
                />
              </div>
              <div>
                <Label>Brazo (cm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={measurementForm.arm}
                  onChange={(e) => {
                    setMeasurementForm({ ...measurementForm, arm: e.target.value });
                  }}
                />
              </div>
              <div>
                <Label>Pierna (cm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={measurementForm.leg}
                  onChange={(e) => {
                    setMeasurementForm({ ...measurementForm, leg: e.target.value });
                  }}
                />
              </div>
            </div>
          </details>
          <Button type="submit" className="w-full">
            Guardar
          </Button>
        </form>
      </Modal>
    </div>
  );
}
