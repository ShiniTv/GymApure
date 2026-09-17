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
import { T, CARD_PADDING, SECTION_GAP_LG, GRID_2COL, cn } from './ProfileDesignSystem';

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
    <form className={cn('w-full', SECTION_GAP_LG)} onSubmit={(e) => void handleSave(e, false)}>
      {/* TDEE Card - only show if calculated */}
      {healthProfile?.tdee_kcal != null && (
        <div
          className={cn(
            'space-y-3 border-emerald-500/30 bg-emerald-500/5',
            CARD_PADDING,
            'border',
            'border-border/80',
            'bg-surface',
            'rounded-xl'
          )}
        >
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <Flame className="h-5 w-5" />
            <h3 className="text-text font-semibold tracking-[-0.01em]">
              Gasto Energético Estimado (TDEE)
            </h3>
          </div>
          <div className={GRID_2COL}>
            <div className="bg-surface border-border/50 rounded-xl border p-3">
              <p className="text-text-muted text-sm">Metabolismo Basal (BMR)</p>
              <p className={cn(T.statValue, 'mt-1 text-xl')}>
                {healthProfile.bmr_kcal ? `${healthProfile.bmr_kcal} kcal` : '—'}
              </p>
            </div>
            <div className="bg-surface border-border/50 rounded-xl border p-3">
              <p className="text-text-muted text-sm">Mantenimiento (TDEE)</p>
              <p
                className={cn(
                  T.statValue,
                  'mt-1 text-xl',
                  'text-emerald-600 dark:text-emerald-400'
                )}
              >
                {healthProfile.tdee_kcal} kcal/día
              </p>
            </div>
            <div className="bg-surface border-border/50 rounded-xl border p-3">
              <p className="text-text-muted text-sm">Nivel de actividad</p>
              <p className="text-text mt-1 font-semibold capitalize">
                {activityLevel || 'Moderado'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sección 1: Condiciones de Salud */}
      <div
        className={cn(
          'space-y-3',
          CARD_PADDING,
          'border',
          'border-border/80',
          'bg-surface',
          'rounded-xl'
        )}
      >
        <div className="flex items-center gap-2">
          <div className="bg-brand/10 rounded-xl p-2">
            <Heart className="text-brand h-5 w-5" />
          </div>
          <div>
            <h3 className="text-text text-lg font-semibold tracking-[-0.01em]">
              Condiciones Médicas y Antecedentes
            </h3>
            <p className="text-text-muted text-sm">
              Selecciona si tienes alguna condición para que tu entrenador adapte los ejercicios
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5">
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
                'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all',
                conditionFlags.includes(flag.id)
                  ? 'bg-brand text-brand-contrast shadow-sm'
                  : 'bg-surface-raised border-border/50 text-text hover:border-brand/40 hover:bg-surface-raised/80 border'
              )}
            >
              {flag.label}
              {conditionFlags.includes(flag.id) && (
                <span className="bg-brand-contrast/50 h-1.5 w-1.5 rounded-full" />
              )}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          <Label htmlFor="conditions-notes" className="text-text block text-sm font-medium">
            Detalles de condiciones o recomendaciones médicas
          </Label>
          <textarea
            id="conditions-notes"
            rows={3}
            placeholder="ej: Cirugía de rodilla hace 2 años, evitar sentadilla profunda con impacto…"
            value={conditionsNotes}
            onChange={(e) => setConditionsNotes(e.target.value)}
            className="border-border/60 bg-surface placeholder:text-text-muted focus:border-brand focus:ring-brand/20 min-h-[80px] w-full resize-y rounded-[var(--radius-card)] border px-3 py-2 text-sm font-medium transition-colors focus:ring-2 focus:outline-none"
          />
        </div>
      </div>

      {/* Sección 2: Limitaciones, Lesiones y Alergias */}
      <div
        className={cn(
          'space-y-3',
          CARD_PADDING,
          'border',
          'border-border/80',
          'bg-surface',
          'rounded-xl'
        )}
      >
        <div className="flex items-center gap-2">
          <div className="bg-brand/10 rounded-xl p-2">
            <ShieldAlert className="text-brand h-5 w-5" />
          </div>
          <div>
            <h3 className="text-text text-lg font-semibold tracking-[-0.01em]">
              Lesiones, Alergias y Medicamentos
            </h3>
            <p className="text-text-muted text-sm">
              Información relevante para tu seguridad durante el entrenamiento
            </p>
          </div>
        </div>
        <div className={GRID_2COL}>
          <div className="space-y-2">
            <Label htmlFor="limitations-notes" className="text-text text-sm font-medium">
              Lesiones o limitaciones físicas
            </Label>
            <textarea
              id="limitations-notes"
              rows={3}
              placeholder="ej: Molestia en hombro derecho al hacer press militar…"
              value={limitationsNotes}
              onChange={(e) => setLimitationsNotes(e.target.value)}
              className="border-border/60 bg-surface placeholder:text-text-muted focus:border-brand focus:ring-brand/20 min-h-[80px] w-full resize-y rounded-[var(--radius-card)] border px-3 py-2 text-sm font-medium transition-colors focus:ring-2 focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="allergies-notes" className="text-text text-sm font-medium">
              Alergias o medicamentos habituales
            </Label>
            <textarea
              id="allergies-notes"
              rows={3}
              placeholder="ej: Alergia a la penicilina, tomo antihipertensivo en las mañanas…"
              value={allergiesNotes}
              onChange={(e) => setAllergiesNotes(e.target.value)}
              className="border-border/60 bg-surface placeholder:text-text-muted focus:border-brand focus:ring-brand/20 min-h-[80px] w-full resize-y rounded-[var(--radius-card)] border px-3 py-2 text-sm font-medium transition-colors focus:ring-2 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Sección 3: Parámetros Biometría y Metabolismo */}
      <div
        className={cn(
          'space-y-3',
          CARD_PADDING,
          'border',
          'border-border/80',
          'bg-surface',
          'rounded-xl'
        )}
      >
        <div className="flex items-center gap-2">
          <div className="bg-brand/10 rounded-xl p-2">
            <Zap className="text-brand h-5 w-5" />
          </div>
          <div>
            <h3 className="text-text text-lg font-semibold tracking-[-0.01em]">
              Cálculo Metabólico (Opcional)
            </h3>
            <p className="text-text-muted text-sm">
              Permite estimar tu gasto calórico diario para planes nutricionales
            </p>
          </div>
        </div>
        <div className={GRID_2COL}>
          <div className="space-y-2">
            <Label htmlFor="bio-sex" className="text-text text-sm font-medium">
              Sexo biológico
            </Label>
            <select
              id="bio-sex"
              value={sex}
              onChange={(e) => setSex(e.target.value as 'male' | 'female')}
              className="border-border/60 bg-surface focus:border-brand focus:ring-brand/20 w-full rounded-[var(--radius-card)] border px-3 py-2 text-sm font-medium transition-colors focus:ring-2 focus:outline-none"
            >
              <option value="">Seleccionar…</option>
              <option value="male">Masculino</option>
              <option value="female">Femenino</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio-activity-level" className="text-text text-sm font-medium">
              Nivel de actividad física
            </Label>
            <select
              id="bio-activity-level"
              value={activityLevel}
              onChange={(e) => setActivityLevel(e.target.value)}
              className="border-border/60 bg-surface focus:border-brand focus:ring-brand/20 w-full rounded-[var(--radius-card)] border px-3 py-2 text-sm font-medium transition-colors focus:ring-2 focus:outline-none"
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
      <div
        className={cn(
          'space-y-3',
          CARD_PADDING,
          'border',
          'border-border/80',
          'bg-surface',
          'rounded-xl'
        )}
      >
        <Label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={healthConsent}
            onChange={(e) => setHealthConsent(e.target.checked)}
            className="border-border text-brand focus:ring-brand mt-0.5 h-4 w-4 rounded"
          />
          <span className="text-text-muted text-sm leading-relaxed font-normal">
            Confirmo que la información de salud suministrada es veraz y autorizo a los entrenadores
            del gimnasio a utilizarla para adaptar mi prescripción de ejercicios de forma segura.
          </span>
        </Label>

        <div className="border-border/50 mt-3 flex flex-wrap items-center justify-end gap-3 border-t pt-3">
          <Button
            type="button"
            variant="secondary"
            disabled={updateMutation.isPending}
            onClick={(e) => void handleSave(e, true)}
          >
            <Flame className="h-4 w-4" />
            <span>Guardar y recalcular TDEE</span>
          </Button>

          <Button type="submit" disabled={updateMutation.isPending} className="gap-2 shadow-sm">
            <Save className="h-4 w-4" />
            <span>{updateMutation.isPending ? 'Guardando…' : 'Guardar ficha de salud'}</span>
          </Button>
        </div>
      </div>
    </form>
  );
}
