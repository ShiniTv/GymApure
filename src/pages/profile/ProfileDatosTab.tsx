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
      <Card padding="md" rounded="xl" className="border-border bg-surface">
        <div className="md:grid md:grid-cols-[minmax(12rem,15rem)_minmax(0,1fr)] md:items-start md:gap-4">
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
                  <div className="bg-surface-raised flex h-12 w-12 items-center justify-center rounded-xl sm:h-14 sm:w-14 md:h-20 md:w-20 md:rounded-2xl">
                    <User className="text-text-muted h-6 w-6 md:h-8 md:w-8" />
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
                  onChange={onAvatarChange}
                  disabled={avatarUploading || avatarRemoving}
                />
              </div>
              <div className="min-w-0 md:w-full">
                <p className="text-text truncate text-[15px] font-semibold md:text-base md:whitespace-normal">
                  {profile.full_name}
                </p>
                <p className="text-text-muted text-small mt-0.5 truncate md:text-xs md:whitespace-normal">
                  {profile.email}
                </p>
                {profile.cedula && (
                  <p className="text-text-muted text-small md:text-small mt-0.5">
                    {profile.cedula}
                  </p>
                )}
                {avatarUploading && (
                  <p className="text-brand text-small mt-1 font-medium">Subiendo foto…</p>
                )}
                {avatarUrl && !avatarUploading && (
                  <div className="mt-1 flex flex-wrap items-center gap-2 md:mt-2">
                    <button
                      type="button"
                      onClick={onRequestRemoveAvatar}
                      disabled={avatarRemoving}
                      className="text-text-muted text-small hover:text-danger font-semibold transition-colors disabled:opacity-50 sm:text-xs dark:hover:text-red-400"
                    >
                      Quitar foto
                    </button>
                  </div>
                )}
              </div>
            </div>

            {isTrainer && trainerProfile && (
              <div className="mt-3.5 space-y-1 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 md:mt-4">
                <p className="text-text text-xs font-bold">Perfil profesional</p>
                <p className="text-text-secondary text-small">
                  Nivel: <strong>{LEVEL_LABELS[trainerProfile.level]}</strong>
                </p>
                <p className="text-text-secondary text-small">
                  Turno: <strong>{SHIFT_LABELS[trainerProfile.shift]}</strong>
                </p>
                {trainerProfile.specialty && (
                  <p className="text-text-secondary text-small">
                    Especialidad: <strong>{trainerProfile.specialty}</strong>
                  </p>
                )}
                <p className="text-text-muted text-small pt-1">
                  Para cambiar nivel, turno o especialidad, contacta al administrador (sección
                  Entrenadores).
                </p>
              </div>
            )}
          </div>

          <form onSubmit={onSave} className="min-w-0 space-y-2.5 md:space-y-3">
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
            <div className="max-w-xl">
              <Label>Objetivo</Label>
              <Textarea
                value={form.goal}
                onChange={(e) => {
                  setForm({ ...form, goal: e.target.value });
                }}
                rows={2}
                className="min-h-[4rem] resize-none rounded-xl px-3 py-2.5 text-sm md:min-h-[4.5rem]"
                placeholder="Ej: bajar grasa, ganar músculo…"
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              disabled={saving || !isProfileDirty}
              size="sm"
              className={cn(
                'mt-0.5 h-10 min-h-10 w-full sm:w-auto sm:px-4',
                isProfileDirty ? 'ring-2 ring-amber-500/25' : 'opacity-45'
              )}
              aria-label="Guardar perfil"
            >
              <Save className="h-4 w-4" />
              <span className="hidden sm:inline">{saving ? 'Guardando…' : 'Guardar perfil'}</span>
              <span className="sm:hidden">{saving ? '…' : 'Guardar'}</span>
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
