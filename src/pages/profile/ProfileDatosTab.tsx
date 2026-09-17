import React, { FormEvent } from 'react';
import { Phone, Scale, Target } from 'lucide-react';
import { Label } from '../../components/ui';
import { LEVEL_LABELS, SHIFT_LABELS } from '../../lib/trainingShift';
import { cn } from '../../lib/utils';
import type { UserProfile } from '../../hooks/queries/useProfileQuery';
import type { ProfileFormState } from './types';
import {
  SURFACE,
  RADIUS_CARD,
  CARD_PADDING,
  SECTION_GAP_LG,
  sectionHeader,
} from './ProfileDesignSystem';

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
    <form onSubmit={onSave} className={cn('w-full', SECTION_GAP_LG)}>
      {/* Perfil de Entrenador */}
      {isTrainer && trainerProfile && (
        <div
          className={cn(
            'space-y-2.5',
            CARD_PADDING,
            'border-border/80 bg-surface rounded-xl border'
          )}
        >
          <div className="flex items-center gap-2">
            <svg
              className="text-brand h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 3v18M16 3v18" />
            </svg>
            <h3 className="text-text text-sm font-semibold tracking-[-0.01em]">
              Perfil Profesional de Entrenador
            </h3>
          </div>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div className="bg-surface-raised/40 border-border/60 rounded-lg border p-2.5">
              <dt className="text-text-muted text-small font-semibold tracking-wider uppercase">
                Nivel
              </dt>
              <dd className="text-text mt-0.5 text-sm font-semibold">
                {LEVEL_LABELS[trainerProfile.level]}
              </dd>
            </div>
            <div className="bg-surface-raised/40 border-border/60 rounded-lg border p-2.5">
              <dt className="text-text-muted text-small font-semibold tracking-wider uppercase">
                Turno
              </dt>
              <dd className="text-text mt-0.5 text-sm font-semibold">
                {SHIFT_LABELS[trainerProfile.shift]}
              </dd>
            </div>
            {trainerProfile.specialty && (
              <div className="bg-surface-raised/40 border-border/60 col-span-2 rounded-lg border p-2.5 sm:col-span-1">
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

      {/* Sección 1: Información de Contacto y Personal */}
      <div
        className={cn(
          'space-y-4',
          CARD_PADDING,
          'border',
          'border-border/80',
          'bg-surface',
          'rounded-xl'
        )}
      >
        {sectionHeader(
          'Contacto e Identidad',
          'Datos para notificaciones, recuperación de cuenta y emergencias',
          Phone
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="profile-phone" className="text-text text-sm font-medium">
              Teléfono de contacto
            </Label>
            <input
              id="profile-phone"
              type="tel"
              inputMode="tel"
              placeholder="ej: 0414-1234567"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="border-border/60 bg-surface placeholder:text-text-muted focus:border-brand focus:ring-brand/20 w-full rounded-[var(--radius-card)] border px-3 py-2 text-sm font-medium transition-colors focus:ring-2 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile-dob" className="text-text text-sm font-medium">
              Fecha de nacimiento
            </Label>
            <input
              id="profile-dob"
              type="date"
              value={form.dob}
              onChange={(e) => setForm({ ...form, dob: e.target.value })}
              className="border-border/60 bg-surface focus:border-brand focus:ring-brand/20 w-full rounded-[var(--radius-card)] border px-3 py-2 text-sm font-medium transition-colors focus:ring-2 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Sección 2: Parámetros Antropométricos Base */}
      <div
        className={cn(
          'space-y-4',
          CARD_PADDING,
          'border',
          'border-border/80',
          'bg-surface',
          'rounded-xl'
        )}
      >
        {sectionHeader(
          'Parámetros Físicos Iniciales',
          'Utilizados para cálculos de IMC, tasa metabólica y estimación de calorías',
          Scale
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="profile-height" className="text-text text-sm font-medium">
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
              className="border-border/60 bg-surface placeholder:text-text-muted focus:border-brand focus:ring-brand/20 w-full rounded-[var(--radius-card)] border px-3 py-2 text-sm font-semibold tabular-nums transition-colors focus:ring-2 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile-initial-weight" className="text-text text-sm font-medium">
              Peso inicial de referencia (kg)
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
              className="border-border/60 bg-surface placeholder:text-text-muted focus:border-brand focus:ring-brand/20 w-full rounded-[var(--radius-card)] border px-3 py-2 text-sm font-semibold tabular-nums transition-colors focus:ring-2 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Sección 3: Objetivo y Enfoque Fitness */}
      <div
        className={cn(
          'space-y-4',
          CARD_PADDING,
          'border',
          'border-border/80',
          'bg-surface',
          'rounded-xl'
        )}
      >
        {sectionHeader(
          'Objetivo Principal',
          'Describe tu meta actual (pérdida de grasa, hipertrofia, acondicionamiento, etc.)',
          Target
        )}
        <div className="space-y-1.5">
          <Label htmlFor="profile-goal" className="text-text text-sm font-medium">
            Tu objetivo
          </Label>
          <textarea
            id="profile-goal"
            rows={3}
            placeholder="ej: Ganar masa muscular y mejorar mi resistencia cardiovascular…"
            value={form.goal}
            onChange={(e) => setForm({ ...form, goal: e.target.value })}
            className="border-border/60 bg-surface placeholder:text-text-muted focus:border-brand focus:ring-brand/20 min-h-[80px] w-full resize-y rounded-[var(--radius-card)] border px-3 py-2 text-sm font-medium transition-colors focus:ring-2 focus:outline-none"
          />
        </div>
      </div>

      {/* Barra de Guardado */}
      <div
        className={cn(
          SURFACE,
          RADIUS_CARD,
          'p-4',
          'flex',
          'flex-col',
          'gap-3',
          'sm:flex-row',
          'sm:items-center',
          'sm:justify-between'
        )}
      >
        <div className="flex items-center gap-3">
          {isProfileDirty ? (
            <span className="text-warning inline-flex items-center gap-2 text-sm font-medium">
              <span className="relative flex h-2 w-2">
                <span className="bg-warning absolute inset-0 animate-pulse rounded-full" />
                <span className="bg-warning absolute inset-0 rounded-full" />
              </span>
              Cambios pendientes
            </span>
          ) : (
            <span className="text-text-muted text-sm font-medium">Todo guardado</span>
          )}
        </div>

        <button
          type="submit"
          disabled={saving || !isProfileDirty}
          className={cn(
            'inline-flex',
            'items-center',
            'justify-center',
            'gap-2',
            'rounded-[var(--radius-card)]',
            'px-4',
            'py-2',
            'text-sm',
            'font-semibold',
            'shadow-sm',
            'transition-colors',
            'focus:outline-none',
            'focus:ring-2',
            'focus:ring-brand/40',
            'disabled:opacity-50',
            'disabled:cursor-not-allowed',
            saving || !isProfileDirty
              ? 'bg-surface-raised text-text-muted'
              : 'bg-brand text-brand-contrast hover:bg-brand-hover'
          )}
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          <span>{saving ? 'Guardando…' : 'Guardar perfil'}</span>
        </button>
      </div>
    </form>
  );
}
