import React, { FormEvent } from 'react';
import { Phone, Scale, Target, Shield, Save } from 'lucide-react';
import { Button, Label } from '../../components/ui';
import { LEVEL_LABELS, SHIFT_LABELS } from '../../lib/trainingShift';
import type { UserProfile } from '../../hooks/queries/useProfileQuery';
import type { ProfileFormState } from './types';

interface TrainerProfileLike {
  level: keyof typeof LEVEL_LABELS;
  shift: keyof typeof SHIFT_LABELS;
  specialty?: string | null;
}

interface ProfileDatosTabProps {
  profile?: UserProfile;
  form: ProfileFormState;
  setForm: (form: ProfileFormState) => void;
  isProfileDirty: boolean;
  saving: boolean;
  isTrainer: boolean;
  trainerProfile: TrainerProfileLike | null | undefined;
  avatarUploading?: boolean;
  avatarRemoving?: boolean;
  onAvatarChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRequestRemoveAvatar?: () => void;
  onSave: (e: FormEvent) => void;
}

export function ProfileDatosTab({
  form,
  setForm,
  isProfileDirty,
  saving,
  isTrainer,
  trainerProfile,
  onSave,
}: ProfileDatosTabProps) {
  return (
    <form onSubmit={onSave} className="w-full space-y-3">
      {/* Perfil de Entrenador (si aplica) */}
      {isTrainer && trainerProfile && (
        <div className="border-border/80 bg-surface rounded-xl border p-3.5 shadow-2xs">
          <div className="mb-2.5 flex items-center gap-2">
            <div className="bg-brand/10 rounded-lg p-1.5">
              <Shield className="text-brand h-4 w-4" />
            </div>
            <h3 className="text-text text-sm font-semibold tracking-[-0.01em]">
              Perfil Profesional de Entrenador
            </h3>
          </div>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div className="bg-surface-raised/40 border-border/60 rounded-xl border p-2.5">
              <dt className="text-text-muted text-small font-semibold tracking-wider uppercase">
                Nivel
              </dt>
              <dd className="text-text mt-0.5 text-sm font-semibold">
                {LEVEL_LABELS[trainerProfile.level]}
              </dd>
            </div>
            <div className="bg-surface-raised/40 border-border/60 rounded-xl border p-2.5">
              <dt className="text-text-muted text-small font-semibold tracking-wider uppercase">
                Turno
              </dt>
              <dd className="text-text mt-0.5 text-sm font-semibold">
                {SHIFT_LABELS[trainerProfile.shift]}
              </dd>
            </div>
            {trainerProfile.specialty && (
              <div className="bg-surface-raised/40 border-border/60 col-span-2 rounded-xl border p-2.5 sm:col-span-1">
                <dt className="text-text-muted text-small font-semibold tracking-wider uppercase">
                  Especialidad
                </dt>
                <dd className="text-text mt-0.5 truncate text-sm font-semibold">
                  {trainerProfile.specialty}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Sección 1: Información de Contacto e Identidad */}
      <div className="border-border/80 bg-surface rounded-xl border p-3.5 shadow-2xs sm:p-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="bg-brand/10 rounded-lg p-1.5">
            <Phone className="text-brand h-4 w-4" />
          </div>
          <h3 className="text-text text-sm font-semibold tracking-[-0.01em]">
            Contacto e Identidad
          </h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label
              htmlFor="profile-phone"
              className="text-text-secondary text-small block font-semibold tracking-wider uppercase"
            >
              Teléfono de contacto
            </Label>
            <input
              id="profile-phone"
              type="tel"
              inputMode="tel"
              placeholder="ej: 0414-1234567"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="border-border/70 bg-surface placeholder:text-text-muted focus:border-brand focus:ring-brand/20 w-full rounded-xl border px-3 py-2 text-sm font-medium transition-colors focus:ring-2 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <Label
              htmlFor="profile-dob"
              className="text-text-secondary text-small block font-semibold tracking-wider uppercase"
            >
              Fecha de nacimiento
            </Label>
            <input
              id="profile-dob"
              type="date"
              value={form.dob}
              onChange={(e) => setForm({ ...form, dob: e.target.value })}
              className="border-border/70 bg-surface focus:border-brand focus:ring-brand/20 w-full rounded-xl border px-3 py-2 text-sm font-medium transition-colors focus:ring-2 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Sección 2: Parámetros Antropométricos y Objetivo */}
      <div className="border-border/80 bg-surface rounded-xl border p-3.5 shadow-2xs sm:p-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="bg-brand/10 rounded-lg p-1.5">
            <Scale className="text-brand h-4 w-4" />
          </div>
          <h3 className="text-text text-sm font-semibold tracking-[-0.01em]">
            Parámetros Físicos y Meta
          </h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label
              htmlFor="profile-height"
              className="text-text-secondary text-small block font-semibold tracking-wider uppercase"
            >
              Estatura / Altura (cm)
            </Label>
            <input
              id="profile-height"
              type="number"
              step="1"
              min="100"
              max="250"
              placeholder="ej: 175"
              value={form.height}
              onChange={(e) => setForm({ ...form, height: e.target.value })}
              className="border-border/70 bg-surface placeholder:text-text-muted focus:border-brand focus:ring-brand/20 w-full rounded-xl border px-3 py-2 text-sm font-semibold tabular-nums transition-colors focus:ring-2 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <Label
              htmlFor="profile-initial-weight"
              className="text-text-secondary text-small block font-semibold tracking-wider uppercase"
            >
              Peso inicial (kg)
            </Label>
            <input
              id="profile-initial-weight"
              type="number"
              step="0.1"
              min="20"
              max="350"
              placeholder="ej: 75.0"
              value={form.initial_weight}
              onChange={(e) => setForm({ ...form, initial_weight: e.target.value })}
              className="border-border/70 bg-surface placeholder:text-text-muted focus:border-brand focus:ring-brand/20 w-full rounded-xl border px-3 py-2 text-sm font-semibold tabular-nums transition-colors focus:ring-2 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-3 space-y-1">
          <div className="mb-1 flex items-center gap-1.5">
            <Target className="text-brand h-3.5 w-3.5" />
            <Label
              htmlFor="profile-goal"
              className="text-text-secondary text-small block font-semibold tracking-wider uppercase"
            >
              Objetivo Fitness
            </Label>
          </div>
          <textarea
            id="profile-goal"
            rows={2}
            placeholder="ej: Ganar masa muscular, mejorar resistencia y composición corporal…"
            value={form.goal}
            onChange={(e) => setForm({ ...form, goal: e.target.value })}
            className="border-border/70 bg-surface placeholder:text-text-muted focus:border-brand focus:ring-brand/20 min-h-[56px] w-full resize-y rounded-xl border px-3 py-2 text-sm font-medium transition-colors focus:ring-2 focus:outline-none"
          />
        </div>
      </div>

      {/* Barra de Guardado */}
      <div className="border-border/80 bg-surface flex items-center justify-between gap-3 rounded-xl border p-3 shadow-2xs sm:p-3.5">
        <div>
          {isProfileDirty ? (
            <span className="text-warning inline-flex items-center gap-1.5 text-xs font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="bg-warning absolute inset-0 animate-pulse rounded-full" />
                <span className="bg-warning absolute inset-0 rounded-full" />
              </span>
              Cambios pendientes por guardar
            </span>
          ) : (
            <span className="text-text-muted text-xs font-medium">Información actualizada</span>
          )}
        </div>

        <Button
          type="submit"
          size="sm"
          disabled={saving || !isProfileDirty}
          className="gap-2 font-semibold shadow-2xs"
        >
          <Save className="h-4 w-4" />
          <span>{saving ? 'Guardando…' : 'Guardar'}</span>
        </Button>
      </div>
    </form>
  );
}
