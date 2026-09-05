import { ChangeEvent, FormEvent } from 'react';
import { Camera, Save, User } from 'lucide-react';
import { resolveAvatarUrl } from '../../lib/api';
import { Button, Card, Input, Label, Textarea } from '../../components/ui';
import { cn } from '../../lib/utils';
import { LEVEL_LABELS, SHIFT_LABELS } from '../../lib/trainingShift';
import type { UserProfile } from '../../hooks/queries/useProfileQuery';
import type { ProfileFormState } from './types';

interface TrainerProfileLike {
  level: keyof typeof LEVEL_LABELS;
  shift: keyof typeof SHIFT_LABELS;
  specialty?: string | null;
}

interface ProfileDatosTabProps {
  profile: UserProfile;
  form: ProfileFormState;
  setForm: (form: ProfileFormState) => void;
  isProfileDirty: boolean;
  saving: boolean;
  isTrainer: boolean;
  trainerProfile: TrainerProfileLike | null | undefined;
  avatarUploading: boolean;
  avatarRemoving: boolean;
  onAvatarChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onRequestRemoveAvatar: () => void;
  onSave: (e: FormEvent) => void;
}

export function ProfileDatosTab({
  profile,
  form,
  setForm,
  isProfileDirty,
  saving,
  isTrainer,
  trainerProfile,
  avatarUploading,
  avatarRemoving,
  onAvatarChange,
  onRequestRemoveAvatar,
  onSave,
}: ProfileDatosTabProps) {
  const avatarUrl = resolveAvatarUrl(profile.profile_image);

  return (
    <div className="w-full">
      <Card padding="sm" className="border-border/80">
        <div className="md:grid md:grid-cols-[minmax(11rem,14rem)_minmax(0,1fr)] md:items-start md:gap-4">
          <div className="mb-3 md:mb-0">
            <div className="flex items-center gap-3 md:flex-col md:items-start md:gap-2.5">
              <div className="relative shrink-0">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={profile.full_name}
                    className="ring-border h-11 w-11 rounded-[var(--radius-card)] object-cover ring-1 sm:h-12 sm:w-12"
                  />
                ) : (
                  <div className="bg-surface-raised flex h-11 w-11 items-center justify-center rounded-[var(--radius-card)] sm:h-12 sm:w-12">
                    <User className="text-text-muted h-5 w-5" />
                  </div>
                )}
                <label
                  htmlFor="avatar-upload"
                  className="brand-solid brand-solid-hover absolute -right-1 -bottom-1 inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-[var(--radius-button)] transition-colors"
                  title="Cambiar foto"
                  aria-label="Cambiar foto de perfil"
                >
                  <Camera className="h-3 w-3" />
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={onAvatarChange}
                  disabled={avatarUploading || avatarRemoving}
                />
              </div>
              <div className="min-w-0 md:w-full">
                <p className="text-text truncate text-sm font-semibold tracking-[-0.011em]">
                  {profile.full_name}
                </p>
                <p className="text-text-muted text-small mt-0.5 truncate">{profile.email}</p>
                {profile.cedula ? (
                  <p className="text-text-muted text-small mt-0.5">{profile.cedula}</p>
                ) : null}
                {avatarUploading ? (
                  <p className="text-brand text-small mt-1 font-medium">Subiendo foto…</p>
                ) : null}
                {avatarUrl && !avatarUploading ? (
                  <button
                    type="button"
                    onClick={onRequestRemoveAvatar}
                    disabled={avatarRemoving}
                    className="text-text-muted text-small hover:text-danger mt-1.5 font-semibold transition-colors disabled:opacity-50"
                  >
                    Quitar foto
                  </button>
                ) : null}
              </div>
            </div>

            {isTrainer && trainerProfile ? (
              <div className="border-border/70 bg-surface-raised mt-3 space-y-1 rounded-[var(--radius-card)] border px-3 py-2.5">
                <p className="text-text text-small font-semibold tracking-[-0.01em]">
                  Perfil profesional
                </p>
                <p className="text-text-secondary text-small">
                  Nivel: <strong>{LEVEL_LABELS[trainerProfile.level]}</strong>
                </p>
                <p className="text-text-secondary text-small">
                  Turno: <strong>{SHIFT_LABELS[trainerProfile.shift]}</strong>
                </p>
                {trainerProfile.specialty ? (
                  <p className="text-text-secondary text-small">
                    Especialidad: <strong>{trainerProfile.specialty}</strong>
                  </p>
                ) : null}
                <p className="text-text-muted text-small pt-1 leading-snug">
                  Para cambiar nivel, turno o especialidad, contacta al administrador (sección
                  Entrenadores).
                </p>
              </div>
            ) : null}
          </div>

          <form onSubmit={onSave} className="form-stack min-w-0">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
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
              <div className="space-y-1.5">
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
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
              <div className="space-y-1.5">
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
            <div className="max-w-xl space-y-1.5">
              <Label>Objetivo</Label>
              <Textarea
                value={form.goal}
                onChange={(e) => {
                  setForm({ ...form, goal: e.target.value });
                }}
                rows={2}
                className="min-h-[4rem] resize-none"
                placeholder="Ej: bajar grasa, ganar músculo…"
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              disabled={saving || !isProfileDirty}
              size="md"
              className={cn(
                'w-full sm:w-auto',
                isProfileDirty ? 'ring-2 ring-amber-500/25' : 'opacity-45'
              )}
              aria-label="Guardar perfil"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Guardando…' : 'Guardar'}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
