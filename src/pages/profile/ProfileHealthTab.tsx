import React, { FormEvent, useEffect, useState } from 'react';
import { Heart, ShieldAlert, Save, Flame, Zap } from 'lucide-react';
import { Button, Label, Select, Textarea } from '../../components/ui';
import { useToastOptional } from '../../context/ToastContext';
import {
  useHealthProfileQuery,
  useUpdateHealthProfileMutation,
} from '../../hooks/queries/useHealthProfileQuery';
import type { UserProfile, Measurement } from '../../hooks/queries/useProfileQuery';
import { HEALTH_CONDITION_FLAGS } from '../../lib/healthConditions';
import { ACTIVITY_LEVELS, type ActivityLevel } from '../../lib/metabolicRate';

interface ProfileHealthTabProps {
  userId: number;
  profile: UserProfile;
  measurements: Measurement[];
  onSwitchToDatos?: () => void;
}

export function ProfileHealthTab({ userId }: ProfileHealthTabProps) {
  const toast = useToastOptional();
  const { data: healthProfile } = useHealthProfileQuery(userId);
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

  const toggleFlag = (id: string) => {
    setConditionFlags((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  };

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

  return (
    <form className="w-full space-y-4" onSubmit={(e) => void handleSave(e, false)}>
      {/* Tarjeta de Tasa Metabólica y Calorías si están calculadas */}
      {healthProfile?.tdee_kcal != null && (
        <div className="via-surface to-surface rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/5 p-4 shadow-2xs">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <Flame className="h-4 w-4" />
            <h2 className="text-sm font-bold">Gasto Energético Estimado (TDEE)</h2>
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
            <div className="bg-surface-raised border-border/50 rounded-xl border p-2.5">
              <span className="text-text-muted">Metabolismo Basal (BMR):</span>
              <p className="text-text mt-0.5 text-sm font-bold tabular-nums">
                {healthProfile.bmr_kcal ? `${healthProfile.bmr_kcal} kcal` : '—'}
              </p>
            </div>
            <div className="bg-surface-raised border-border/50 rounded-xl border p-2.5">
              <span className="text-text-muted">Mantenimiento (TDEE):</span>
              <p className="mt-0.5 text-sm font-bold text-emerald-600 tabular-nums dark:text-emerald-400">
                {healthProfile.tdee_kcal} kcal/día
              </p>
            </div>
            <div className="bg-surface-raised border-border/50 col-span-2 rounded-xl border p-2.5 sm:col-span-1">
              <span className="text-text-muted">Nivel de actividad:</span>
              <p className="text-text mt-0.5 font-bold capitalize">{activityLevel || 'Moderado'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Sección 1: Condiciones de Salud (Chips Seleccionables) */}
      <div className="border-border/70 bg-surface rounded-2xl border p-4 shadow-2xs">
        <h2 className="text-text flex items-center gap-2 text-sm font-bold tracking-tight">
          <Heart className="text-brand h-4 w-4" />
          <span>Condiciones Médicas y Antecedentes</span>
        </h2>
        <p className="text-text-muted mt-0.5 text-xs">
          Selecciona si tienes alguna condición para que tu entrenador adapte los ejercicios
        </p>

        <div className="mt-3.5 flex flex-wrap gap-2">
          {HEALTH_CONDITION_FLAGS.map((flag) => {
            const isSelected = conditionFlags.includes(flag.id);
            return (
              <button
                key={flag.id}
                type="button"
                onClick={() => toggleFlag(flag.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-brand text-brand-contrast shadow-xs'
                    : 'bg-surface-raised border-border/70 text-text hover:border-brand/40 border'
                }`}
              >
                <span>{flag.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 space-y-1.5">
          <Label className="text-text text-xs font-semibold">
            Detalles de condiciones o recomendaciones médicas
          </Label>
          <Textarea
            rows={2}
            placeholder="ej: Cirugía de rodilla hace 2 años, evitar sentadilla profunda con impacto…"
            value={conditionsNotes}
            onChange={(e) => setConditionsNotes(e.target.value)}
            className="w-full resize-none"
          />
        </div>
      </div>

      {/* Sección 2: Limitaciones, Lesiones y Alergias */}
      <div className="border-border/70 bg-surface rounded-2xl border p-4 shadow-2xs">
        <h2 className="text-text flex items-center gap-2 text-sm font-bold tracking-tight">
          <ShieldAlert className="h-4 w-4 text-amber-500" />
          <span>Lesiones, Alergias y Medicamentos</span>
        </h2>

        <div className="mt-3.5 grid gap-3.5 sm:grid-cols-2">
          <div>
            <Label className="text-text text-xs font-semibold">
              Lesiones o limitaciones físicas
            </Label>
            <Textarea
              rows={2}
              placeholder="ej: Molestia en hombro derecho al hacer press militar…"
              value={limitationsNotes}
              onChange={(e) => setLimitationsNotes(e.target.value)}
              className="mt-1 w-full resize-none"
            />
          </div>

          <div>
            <Label className="text-text text-xs font-semibold">
              Alergias o medicamentos habituales
            </Label>
            <Textarea
              rows={2}
              placeholder="ej: Alergia a la penicilina, tomo antihipertensivo en las mañanas…"
              value={allergiesNotes}
              onChange={(e) => setAllergiesNotes(e.target.value)}
              className="mt-1 w-full resize-none"
            />
          </div>
        </div>
      </div>

      {/* Sección 3: Parámetros Biometría y Metabolismo */}
      <div className="border-border/70 bg-surface rounded-2xl border p-4 shadow-2xs">
        <h2 className="text-text flex items-center gap-2 text-sm font-bold tracking-tight">
          <Zap className="text-brand h-4 w-4" />
          <span>Cálculo Metabólico (Opcional)</span>
        </h2>
        <p className="text-text-muted mt-0.5 text-xs">
          Permite estimar tu gasto calórico diario para planes nutricionales
        </p>

        <div className="mt-3.5 grid gap-3.5 sm:grid-cols-2">
          <div>
            <Label className="text-text text-xs font-semibold">Sexo biológico</Label>
            <Select
              value={sex}
              onChange={(e) => setSex(e.target.value as 'male' | 'female')}
              className="mt-1"
            >
              <option value="">Seleccionar…</option>
              <option value="male">Masculino</option>
              <option value="female">Femenino</option>
            </Select>
          </div>

          <div>
            <Label className="text-text text-xs font-semibold">Nivel de actividad física</Label>
            <Select
              value={activityLevel}
              onChange={(e) => setActivityLevel(e.target.value)}
              className="mt-1"
            >
              <option value="">Seleccionar nivel…</option>
              {ACTIVITY_LEVELS.map((lvl) => (
                <option key={lvl.id} value={lvl.id}>
                  {lvl.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {/* Consentimiento y Guardado */}
      <div className="border-border/70 bg-surface rounded-2xl border p-4 shadow-xs">
        <label className="flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={healthConsent}
            onChange={(e) => setHealthConsent(e.target.checked)}
            className="border-border text-brand focus:ring-brand mt-1 h-4 w-4 rounded"
          />
          <span className="text-text-muted text-xs leading-relaxed">
            Confirmo que la información de salud suministrada es veraz y autorizo a los entrenadores
            del gimnasio a utilizarla para adaptar mi prescripción de ejercicios de forma segura.
          </span>
        </label>

        <div className="border-border/60 mt-4 flex flex-wrap items-center justify-end gap-2.5 border-t pt-3">
          <Button
            type="button"
            variant="secondary"
            disabled={updateMutation.isPending}
            onClick={(e) => void handleSave(e, true)}
            className="text-xs"
          >
            <Flame className="text-brand h-3.5 w-3.5" />
            <span>Guardar y recalcular TDEE</span>
          </Button>

          <Button
            type="submit"
            disabled={updateMutation.isPending}
            className="gap-1.5 text-xs font-semibold shadow-sm"
          >
            <Save className="h-4 w-4" />
            <span>{updateMutation.isPending ? 'Guardando…' : 'Guardar ficha de salud'}</span>
          </Button>
        </div>
      </div>
    </form>
  );
}
