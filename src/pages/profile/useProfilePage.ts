import { useState, useEffect, useMemo, FormEvent, ChangeEvent } from 'react';
import { useSearchParams } from 'react-router';
import { format } from 'date-fns';
import { dateLocale as es } from '../../lib/dateLocale';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useMemberStatsOptional } from '../../context/MemberStatsContext';
import { useToastOptional } from '../../context/ToastContext';
import { usePageTitle } from '../../hooks/usePageTitle';
import {
  useProfileQuery,
  useProfileMeasurementsQuery,
  useProfileWorkoutHistoryQuery,
  useUpdateProfileMutation,
  useUploadAvatarMutation,
  useRemoveAvatarMutation,
  useChangePasswordMutation,
  useAddMeasurementMutation,
  useUpdateMeasurementMutation,
  useDeleteMeasurementMutation,
  type Measurement,
} from '../../hooks/queries/useProfileQuery';
import { useTrainerMeQuery } from '../../hooks/queries/useTrainersQuery';
import type { MemberBadgeData } from '../../components/member/MemberBadgeCard';
import type {
  MeasurementFormState,
  PasswordFormState,
  ProfileFormState,
  ProfileTab,
} from './types';
import type { MeasurementFormPayload } from './MeasurementModal';
import { heightCmForForm, heightCmNumber } from './utils';

const emptyMeasurementForm = (): MeasurementFormState => ({
  date: new Date().toISOString().split('T')[0],
  weight: '',
  body_fat_percentage: '',
  waist: '',
  arm: '',
  leg: '',
});

export function useProfilePage() {
  const { user, logoutLocal } = useAuth();
  usePageTitle('Perfil');
  const { theme, setTheme } = useTheme();
  const memberStats = useMemberStatsOptional();
  const isMember = user?.role === 'member';
  const isTrainer = user?.role === 'trainer';
  const { data: trainerProfile } = useTrainerMeQuery(isTrainer && !!user);
  const { data: profile, isPending: profileLoading } = useProfileQuery(user?.id);
  const { data: measurements = [], isPending: measLoading } = useProfileMeasurementsQuery(user?.id);
  const { data: workouts = [], isPending: histLoading } = useProfileWorkoutHistoryQuery(
    user?.id,
    isMember
  );
  const updateProfileMutation = useUpdateProfileMutation(user?.id);
  const uploadAvatarMutation = useUploadAvatarMutation(user?.id);
  const removeAvatarMutation = useRemoveAvatarMutation(user?.id);
  const changePasswordMutation = useChangePasswordMutation();
  const addMeasurementMutation = useAddMeasurementMutation(user?.id);
  const updateMeasurementMutation = useUpdateMeasurementMutation(user?.id);
  const deleteMeasurementMutation = useDeleteMeasurementMutation(user?.id);

  const loading = profileLoading;
  const progressLoading = measLoading || (isMember && histLoading);
  const [searchParams, setSearchParams] = useSearchParams();
  const [profileTab, setProfileTab] = useState<ProfileTab>('datos');
  const toast = useToastOptional();
  const [showRemoveAvatarModal, setShowRemoveAvatarModal] = useState(false);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [showScanView, setShowScanView] = useState(false);
  const [isAddingMeasurement, setIsAddingMeasurement] = useState(false);
  const [editingMeasurement, setEditingMeasurement] = useState<Measurement | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const [passwordForm, setPasswordForm] = useState<PasswordFormState>({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [passwordError, setPasswordError] = useState('');

  const [form, setForm] = useState<ProfileFormState>({
    phone: '',
    initial_weight: '',
    height: '',
    goal: '',
    dob: '',
  });

  const [measurementForm, setMeasurementForm] =
    useState<MeasurementFormState>(emptyMeasurementForm);

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

  const latestMeasurement = measurements[0] ?? null;
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
    const primary: { value: ProfileTab; label: string }[] = [{ value: 'datos', label: 'Datos' }];
    if (isMember && profile?.cedula) {
      primary.push({ value: 'carne', label: 'Carnet QR' });
    }
    const secondary: { value: ProfileTab; label: string }[] = [];
    if (isMember) {
      secondary.push({ value: 'progreso', label: 'Progreso & Medidas' });
      secondary.push({ value: 'salud', label: 'Salud' });
    }
    secondary.push(
      { value: 'seguridad', label: 'Seguridad' },
      { value: 'apariencia', label: 'Apariencia' }
    );
    return [...primary, ...secondary];
  }, [isMember, profile?.cedula]);

  useEffect(() => {
    const raw = searchParams.get('tab');
    if (!raw) return;
    const allowed = profileTabOptions.map((o) => o.value);
    if (allowed.includes(raw as ProfileTab)) {
      setProfileTab(raw as ProfileTab);
    }
  }, [searchParams, profileTabOptions]);

  const changeProfileTab = (next: ProfileTab) => {
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

      await updateProfileMutation.mutateAsync(body);
      toast?.success('Perfil actualizado correctamente');
    } catch (err) {
      toast?.error(err instanceof Error ? err.message : 'Error al guardar');
    }
  };

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    try {
      await uploadAvatarMutation.mutateAsync(file);
      toast?.success('Foto de perfil actualizada');
    } catch (err) {
      toast?.error(err instanceof Error ? err.message : 'Error al subir foto');
    } finally {
      e.target.value = '';
    }
  };

  const handleAvatarRemove = async () => {
    if (!user) return;
    try {
      await removeAvatarMutation.mutateAsync();
      setShowRemoveAvatarModal(false);
      toast?.success('Foto eliminada');
    } catch (err) {
      toast?.error(err instanceof Error ? err.message : 'Error al quitar foto');
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    try {
      await changePasswordMutation.mutateAsync(passwordForm);
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      logoutLocal('Contraseña actualizada. Inicia sesión de nuevo.');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Error al cambiar contraseña');
    }
  };

  const handleSaveMeasurementPayload = async (payload: MeasurementFormPayload) => {
    if (!user) return;
    try {
      if (editingMeasurement) {
        await updateMeasurementMutation.mutateAsync({
          measurementId: editingMeasurement.id,
          body: payload,
        });
        toast?.success('Medición actualizada correctamente');
      } else {
        await addMeasurementMutation.mutateAsync(payload);
        toast?.success('Medición guardada');
      }
      setIsAddingMeasurement(false);
      setEditingMeasurement(null);
    } catch (err) {
      toast?.error(err instanceof Error ? err.message : 'Error al registrar medición');
      throw err;
    }
  };

  const handleOpenEditMeasurement = (m: Measurement) => {
    setEditingMeasurement(m);
    setIsAddingMeasurement(true);
  };

  const handleDeleteMeasurement = async (id: number) => {
    if (!user) return;
    await deleteMeasurementMutation.mutateAsync(id);
  };

  return {
    user,
    profile,
    loading,
    isMember,
    isTrainer,
    trainerProfile,
    measurements,
    latestMeasurement,
    workouts,
    progressLoading,
    profileTab,
    setProfileTab,
    changeProfileTab,
    profileTabOptions,
    theme,
    setTheme,
    form,
    setForm,
    isProfileDirty,
    saving: updateProfileMutation.isPending,
    avatarUploading: uploadAvatarMutation.isPending,
    avatarRemoving: removeAvatarMutation.isPending,
    showRemoveAvatarModal,
    setShowRemoveAvatarModal,
    showBadgeModal,
    setShowBadgeModal,
    showScanView,
    setShowScanView,
    isAddingMeasurement,
    setIsAddingMeasurement,
    editingMeasurement,
    setEditingMeasurement,
    historyOpen,
    setHistoryOpen,
    passwordForm,
    setPasswordForm,
    passwordSaving: changePasswordMutation.isPending,
    passwordError,
    measurementForm,
    setMeasurementForm,
    chartData,
    latestWeight,
    weightDelta,
    bmi,
    heightCm: heightCmNumber(profile?.height),
    subscription,
    workoutsThisMonth,
    badgeMember,
    handleSaveProfile,
    handleAvatarChange,
    handleAvatarRemove,
    handleChangePassword,
    handleSaveMeasurementPayload,
    handleOpenEditMeasurement,
    handleDeleteMeasurement,
  };
}
