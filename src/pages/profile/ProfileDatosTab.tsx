import React, { ChangeEvent, FormEvent } from 'react';
import { Save, Phone, Scale, Target, Shield } from 'lucide-react';
import { Button, Input, Label, Textarea } from '../../components/ui';
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
  form,
  setForm,
  isProfileDirty,
  saving,
  isTrainer,
  trainerProfile,
  onSave,
}: ProfileDatosTabProps) {
  return (
    <form onSubmit={onSave} className="w-full space-y-4">
      {/* Resumen de Perfil de Entrenador si aplica */}
      {isTrainer && trainerProfile && (
        <div className="border-brand/30 from-brand/5 via-surface to-surface rounded-2xl border bg-gradient-to-r p-4 shadow-2xs">
          <div className="text-brand flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <h2 className="text-sm font-bold">Perfil Profesional de Entrenador</h2>
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
            <div className="bg-surface-raised/80 border-border/50 rounded-xl border p-2.5">
              <span className="text-text-muted">Nivel:</span>
              <p className="text-text mt-0.5 font-bold">{LEVEL_LABELS[trainerProfile.level]}</p>
            </div>
            <div className="bg-surface-raised/80 border-border/50 rounded-xl border p-2.5">
              <span className="text-text-muted">Turno:</span>
              <p className="text-text mt-0.5 font-bold">{SHIFT_LABELS[trainerProfile.shift]}</p>
            </div>
            {trainerProfile.specialty && (
              <div className="bg-surface-raised/80 border-border/50 col-span-2 rounded-xl border p-2.5 sm:col-span-1">
                <span className="text-text-muted">Especialidad:</span>
                <p className="text-text mt-0.5 truncate font-bold">{trainerProfile.specialty}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sección 1: Información de Contacto y Personal */}
      <div className="border-border/70 bg-surface rounded-2xl border p-4 shadow-2xs">
        <h2 className="text-text flex items-center gap-2 text-sm font-bold tracking-tight">
          <Phone className="text-brand h-4 w-4" />
          <span>Contacto e Identidad</span>
        </h2>
        <p className="text-text-muted mt-0.5 text-xs">
          Datos para notificaciones, recuperación de cuenta y emergencias
        </p>

        <div className="mt-3.5 grid gap-3.5 sm:grid-cols-2">
          <div>
            <Label className="text-text text-xs font-semibold">Teléfono de contacto</Label>
            <Input
              type="tel"
              inputMode="tel"
              placeholder="ej: 0414-1234567"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-text text-xs font-semibold">Fecha de nacimiento</Label>
            <Input
              type="date"
              value={form.dob}
              onChange={(e) => setForm({ ...form, dob: e.target.value })}
              className="mt-1 font-medium"
            />
          </div>
        </div>
      </div>

      {/* Sección 2: Parámetros Antropométricos Base */}
      <div className="border-border/70 bg-surface rounded-2xl border p-4 shadow-2xs">
        <h2 className="text-text flex items-center gap-2 text-sm font-bold tracking-tight">
          <Scale className="text-brand h-4 w-4" />
          <span>Parámetros Físicos Iniciales</span>
        </h2>
        <p className="text-text-muted mt-0.5 text-xs">
          Utilizados para cálculos de IMC, tasa metabólica y estimación de calorías
        </p>

        <div className="mt-3.5 grid gap-3.5 sm:grid-cols-2">
          <div>
            <Label className="text-text text-xs font-semibold">Estatura / Altura (cm)</Label>
            <Input
              type="number"
              step="1"
              min="100"
              max="250"
              placeholder="ej: 175"
              value={form.height}
              onChange={(e) => setForm({ ...form, height: e.target.value })}
              className="mt-1 font-semibold tabular-nums"
            />
          </div>

          <div>
            <Label className="text-text text-xs font-semibold">
              Peso inicial de referencia (kg)
            </Label>
            <Input
              type="number"
              step="0.1"
              min="20"
              max="350"
              placeholder="ej: 75.0"
              value={form.initial_weight}
              onChange={(e) => setForm({ ...form, initial_weight: e.target.value })}
              className="mt-1 font-semibold tabular-nums"
            />
          </div>
        </div>
      </div>

      {/* Sección 3: Objetivo y Enfoque Fitness */}
      <div className="border-border/70 bg-surface rounded-2xl border p-4 shadow-2xs">
        <h2 className="text-text flex items-center gap-2 text-sm font-bold tracking-tight">
          <Target className="text-brand h-4 w-4" />
          <span>Objetivo Principal</span>
        </h2>
        <p className="text-text-muted mt-0.5 text-xs">
          Describe tu meta actual (pérdida de grasa, hipertrofia, acondicionamiento, etc.)
        </p>

        <div className="mt-3">
          <Textarea
            rows={2}
            placeholder="ej: Ganar masa muscular y mejorar mi resistencia cardiovascular…"
            value={form.goal}
            onChange={(e) => setForm({ ...form, goal: e.target.value })}
            className="w-full resize-none"
          />
        </div>
      </div>

      {/* Barra Flotante / Inferior de Guardado */}
      <div className="border-border/70 bg-surface flex items-center justify-between rounded-2xl border p-3.5 shadow-xs">
        <div>
          {isProfileDirty ? (
            <span className="text-warning inline-flex items-center gap-1.5 text-xs font-semibold">
              <span className="bg-warning h-2 w-2 animate-pulse rounded-full" />
              Hay cambios pendientes de guardar
            </span>
          ) : (
            <span className="text-text-muted text-xs font-medium">Todos los cambios guardados</span>
          )}
        </div>

        <Button type="submit" disabled={saving || !isProfileDirty} className="gap-1.5 shadow-sm">
          <Save className="h-4 w-4" />
          <span>{saving ? 'Guardando…' : 'Guardar perfil'}</span>
        </Button>
      </div>
    </form>
  );
}
