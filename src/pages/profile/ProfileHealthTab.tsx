import React, { FormEvent, useEffect, useState } from 'react';
import { Heart, ShieldAlert, Save, Flame, Zap, Loader2 } from 'lucide-react';
import { Button, Label } from '../../components/ui';
import { useToastOptional } from '../../context/ToastContext';
import {
  useHealthProfileQuery,
  useUpdateHealthProfileMutation,
} from '../../hooks/queries/useHealthProfileQuery';
import type { UserProfile, Measurement } from '../../hooks/queries/useProfileQuery';
import { HEALTH_CONDITION_FLAGS } from '../../lib/healthConditions';
import { ACTIVITY_LEVELS, type ActivityLevel } from '../../lib/metabolicRate';
import { cn } from './ProfileDesignSystem';

interface ProfileHealthTabProps {
  userId: number;
  profile?: UserProfile;
  measurements?: Measurement[];
  onSwitchToDatos?: () => void;
}

export function ProfileHealthTab({ userId }: ProfileHealthTabProps) {
  const toast = useToastOptional();
  const { data: healthProfile, isLoading } = useHealthProfileQuery(userId);
  const updateMutation = useUpdateHealthProfileMutation(userId);

  const [conditionFlags, setConditionFlags] = useState<string[]>([]);
  const [conditionsNotes, setConditionsNotes] = useState('');
  const [limitationsNotes, setLimitationsNotes] = useState('');
  const [allergiesNotes, setAllergiesNotes] = useState('');
  const [medicationsNotes, setMedicationsNotes] = useState('');
  const [sex, setSex] = useState<'male' | 'female' | ''>('');
  const [activityLevel, setActivityLevel] = useState<string>('');
  const [healthConsent, setHealthConsent] = useState(false);

  useEffect(() => {
    if (!healthProfile) return;
    setConditionFlags(healthProfile.condition_flags ?? []);
    setConditionsNotes(healthProfile.conditions_notes ?? '');
    setLimitationsNotes(healthProfile.limitations_notes ?? '');
    setAllergiesNotes(healthProfile.allergies_notes ?? '');
    setMedicationsNotes(healthProfile.medications_notes ?? '');
    setSex(healthProfile.sex ?? '');
    setActivityLevel(healthProfile.activity_level ?? '');
    setHealthConsent(Boolean(healthProfile.consent_current));
  }, [healthProfile]);

  const handleSave = async (e: FormEvent, computeMetabolic: boolean) => {
    e.preventDefault();
    if (!healthConsent && !healthProfile?.consent_current) {
      toast?.error('Debes aceptar el consentimiento de información de salud');
      return;
    }
    try {
      await updateMutation.mutateAsync({
        condition_flags: conditionFlags,
        conditions_notes: conditionsNotes.trim() || null,
        limitations_notes: limitationsNotes.trim() || null,
        allergies_notes: allergiesNotes.trim() || null,
        medications_notes: medicationsNotes.trim() || null,
        sex: sex || null,
        activity_level: activityLevel ? (activityLevel as ActivityLevel) : null,
        health_consent: healthConsent || Boolean(healthProfile?.consent_current),
        compute_metabolic: computeMetabolic,
      });
      toast?.success(
        computeMetabolic ? 'Ficha de salud y metabolismo actualizados' : 'Ficha de salud guardada'
      );
    } catch (err) {
      toast?.error(err instanceof Error ? err.message : 'Error al guardar');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="text-brand h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <form className="w-full space-y-3" onSubmit={(e) => void handleSave(e, false)}>
      {/* TDEE Card - Bento de salud */}
      {healthProfile?.tdee_kcal != null && (
        <div className="border-success/30 bg-success/5 space-y-2.5 rounded-xl border p-3.5 shadow-2xs">
          <div className="text-success flex items-center gap-1.5">
            <Flame className="h-4 w-4" />
            <h3 className="text-text text-xs font-bold tracking-tight tracking-wider uppercase">
              Gasto Energético Estimado
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-surface border-border/60 rounded-xl border p-2.5 text-center">
              <span className="text-text-muted text-small block font-semibold tracking-wider uppercase">
                Basal (BMR)
              </span>
              <span className="text-text mt-0.5 block text-sm font-bold tabular-nums">
                {healthProfile.bmr_kcal ? `${healthProfile.bmr_kcal} kcal` : '—'}
              </span>
            </div>
            <div className="bg-surface border-border/60 rounded-xl border p-2.5 text-center">
              <span className="text-text-muted text-small block font-semibold tracking-wider uppercase">
                TDEE Diario
              </span>
              <span className="text-success mt-0.5 block text-sm font-bold tabular-nums">
                {healthProfile.tdee_kcal} kcal
              </span>
            </div>
            <div className="bg-surface border-border/60 rounded-xl border p-2.5 text-center">
              <span className="text-text-muted text-small block font-semibold tracking-wider uppercase">
                Actividad
              </span>
              <span className="text-text mt-0.5 block truncate text-xs font-semibold capitalize">
                {activityLevel || 'Moderado'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Sección 1: Condiciones Médicas y Antecedentes */}
      <div className="border-border/80 bg-surface space-y-3 rounded-xl border p-3.5 shadow-2xs sm:p-4">
        <div className="flex items-center gap-2">
          <div className="bg-brand/10 rounded-lg p-1.5">
            <Heart className="text-brand h-4 w-4" />
          </div>
          <div>
            <h3 className="text-text text-sm font-semibold tracking-[-0.01em]">
              Condiciones Médicas
            </h3>
          </div>
        </div>

        {/* Chips de selección compactos */}
        <div className="flex flex-wrap gap-1.5">
          {HEALTH_CONDITION_FLAGS.map((flag) => (
            <button
              key={flag.id}
              type="button"
              onClick={() =>
                setConditionFlags((prev) =>
                  prev.includes(flag.id) ? prev.filter((f) => f !== flag.id) : [...prev, flag.id]
                )
              }
              className={cn(
                'inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all',
                conditionFlags.includes(flag.id)
                  ? 'bg-brand text-brand-contrast font-semibold shadow-2xs'
                  : 'bg-surface-raised/60 border-border/60 text-text hover:border-brand/40 border'
              )}
            >
              {flag.label}
              {conditionFlags.includes(flag.id) && (
                <span className="bg-brand-contrast/80 h-1.5 w-1.5 rounded-full" />
              )}
            </button>
          ))}
        </div>

        <div className="space-y-1 pt-1">
          <Label
            htmlFor="conditions-notes"
            className="text-text-secondary text-small block font-semibold tracking-wider uppercase"
          >
            Detalles de condiciones o recomendaciones
          </Label>
          <textarea
            id="conditions-notes"
            rows={2}
            placeholder="ej: Cirugía previa, dolor lumbar recurrente, evitar impacto…"
            value={conditionsNotes}
            onChange={(e) => setConditionsNotes(e.target.value)}
            className="border-border/70 bg-surface placeholder:text-text-muted focus:border-brand focus:ring-brand/20 min-h-[52px] w-full resize-y rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors focus:ring-2 focus:outline-none"
          />
        </div>
      </div>

      {/* Sección 2: Limitaciones, Lesiones y Alergias */}
      <div className="border-border/80 bg-surface space-y-3 rounded-xl border p-3.5 shadow-2xs sm:p-4">
        <div className="flex items-center gap-2">
          <div className="bg-brand/10 rounded-lg p-1.5">
            <ShieldAlert className="text-brand h-4 w-4" />
          </div>
          <h3 className="text-text text-sm font-semibold tracking-[-0.01em]">
            Lesiones, Alergias y Medicamentos
          </h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label
              htmlFor="limitations-notes"
              className="text-text-secondary text-small block font-semibold tracking-wider uppercase"
            >
              Limitaciones físicas
            </Label>
            <textarea
              id="limitations-notes"
              rows={2}
              placeholder="ej: Molestia en hombro al hacer press…"
              value={limitationsNotes}
              onChange={(e) => setLimitationsNotes(e.target.value)}
              className="border-border/70 bg-surface placeholder:text-text-muted focus:border-brand focus:ring-brand/20 min-h-[52px] w-full resize-y rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors focus:ring-2 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <Label
              htmlFor="allergies-notes"
              className="text-text-secondary text-small block font-semibold tracking-wider uppercase"
            >
              Alergias / Medicación
            </Label>
            <textarea
              id="allergies-notes"
              rows={2}
              placeholder="ej: Alergia a medicamentos o tomas diarias…"
              value={allergiesNotes}
              onChange={(e) => setAllergiesNotes(e.target.value)}
              className="border-border/70 bg-surface placeholder:text-text-muted focus:border-brand focus:ring-brand/20 min-h-[52px] w-full resize-y rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors focus:ring-2 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Sección 3: Parámetros Biometría y Metabolismo */}
      <div className="border-border/80 bg-surface space-y-3 rounded-xl border p-3.5 shadow-2xs sm:p-4">
        <div className="flex items-center gap-2">
          <div className="bg-brand/10 rounded-lg p-1.5">
            <Zap className="text-brand h-4 w-4" />
          </div>
          <h3 className="text-text text-sm font-semibold tracking-[-0.01em]">
            Cálculo Metabólico (Opcional)
          </h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label
              htmlFor="bio-sex"
              className="text-text-secondary text-small block font-semibold tracking-wider uppercase"
            >
              Sexo biológico
            </Label>
            <select
              id="bio-sex"
              value={sex}
              onChange={(e) => setSex(e.target.value as 'male' | 'female')}
              className="border-border/70 bg-surface focus:border-brand focus:ring-brand/20 w-full rounded-xl border px-3 py-2 text-xs font-medium transition-colors focus:ring-2 focus:outline-none"
            >
              <option value="">Seleccionar…</option>
              <option value="male">Masculino</option>
              <option value="female">Femenino</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label
              htmlFor="bio-activity-level"
              className="text-text-secondary text-small block font-semibold tracking-wider uppercase"
            >
              Nivel de actividad física
            </Label>
            <select
              id="bio-activity-level"
              value={activityLevel}
              onChange={(e) => setActivityLevel(e.target.value)}
              className="border-border/70 bg-surface focus:border-brand focus:ring-brand/20 w-full rounded-xl border px-3 py-2 text-xs font-medium transition-colors focus:ring-2 focus:outline-none"
            >
              <option value="">Seleccionar nivel…</option>
              {ACTIVITY_LEVELS.map((lvl) => (
                <option key={lvl.id} value={lvl.id}>
                  {lvl.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Consentimiento y Guardado */}
      <div className="border-border/80 bg-surface space-y-3 rounded-xl border p-3.5 shadow-2xs">
        <Label className="flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={healthConsent}
            onChange={(e) => setHealthConsent(e.target.checked)}
            className="border-border text-brand focus:ring-brand mt-0.5 h-3.5 w-3.5 rounded"
          />
          <span className="text-text-muted text-xs leading-relaxed font-normal">
            Confirmo que los datos de salud suministrados son correctos y autorizo a los
            entrenadores a consultarlos para adaptar mi rutina.
          </span>
        </Label>

        <div className="border-border/50 flex flex-wrap items-center justify-end gap-2 border-t pt-2.5">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={updateMutation.isPending}
            onClick={(e) => void handleSave(e, true)}
            className="gap-1.5 font-semibold"
          >
            <Flame className="h-3.5 w-3.5" />
            <span>Recalcular TDEE</span>
          </Button>

          <Button
            type="submit"
            size="sm"
            disabled={updateMutation.isPending}
            className="gap-1.5 font-semibold shadow-2xs"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{updateMutation.isPending ? 'Guardando…' : 'Guardar ficha'}</span>
          </Button>
        </div>
      </div>
    </form>
  );
}
