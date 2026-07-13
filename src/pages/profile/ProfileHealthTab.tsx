import { FormEvent, useEffect, useMemo, useState } from 'react';
import { HeartPulse, Activity, Info } from 'lucide-react';
import { format } from 'date-fns';
import { dateLocale as es } from '../../lib/dateLocale';
import { Button, Card, Label, Textarea } from '../../components/ui';
import { useToastOptional } from '../../context/ToastContext';
import {
  useHealthProfileQuery,
  useUpdateHealthProfileMutation,
} from '../../hooks/queries/useHealthProfileQuery';
import type { UserProfile, Measurement } from '../../hooks/queries/useProfileQuery';
import { HEALTH_CONDITION_FLAGS } from '../../lib/healthConditions';
import { ACTIVITY_LEVELS, getAgeFromDob, type ActivityLevel } from '../../lib/metabolicRate';
import { cn } from '../../lib/utils';

interface ProfileHealthTabProps {
  userId: number;
  profile: UserProfile;
  measurements: Measurement[];
  onSwitchToDatos: () => void;
}

export function ProfileHealthTab({
  userId,
  profile,
  measurements,
  onSwitchToDatos,
}: ProfileHealthTabProps) {
  const toast = useToastOptional();
  const { data: healthProfile, isPending } = useHealthProfileQuery(userId);
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
    setHealthConsent(Boolean(healthProfile.health_consent_at));
  }, [healthProfile]);

  const latestWeight = useMemo(() => {
    const withWeight = measurements.filter((m) => m.weight != null);
    if (withWeight.length > 0) return withWeight[0].weight;
    return profile.initial_weight;
  }, [measurements, profile.initial_weight]);

  const age = useMemo(() => {
    if (!profile.dob) return null;
    try {
      return getAgeFromDob(profile.dob);
    } catch {
      return null;
    }
  }, [profile.dob]);

  const missingAnthropometrics = !profile.dob || !profile.height || !latestWeight;

  const toggleFlag = (id: string) => {
    setConditionFlags((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  };

  const handleSave = async (e: FormEvent, computeMetabolic: boolean) => {
    e.preventDefault();
    if (!healthConsent && !healthProfile?.health_consent_at) {
      toast?.error('Debes aceptar el aviso de información de salud');
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
        health_consent: healthConsent || Boolean(healthProfile?.health_consent_at),
        compute_metabolic: computeMetabolic,
      });
      toast?.success(
        computeMetabolic ? 'Perfil de salud y metabolismo guardados' : 'Perfil de salud guardado'
      );
    } catch (err) {
      toast?.error(err instanceof Error ? err.message : 'Error al guardar');
    }
  };

  if (isPending && !healthProfile) {
    return (
      <Card padding="sm" rounded="xl">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando perfil de salud…</p>
      </Card>
    );
  }

  return (
    <form className="panel-form space-y-4" onSubmit={(e) => void handleSave(e, false)}>
      <Card padding="sm" rounded="xl">
        <h2 className="section-title mb-2 flex items-center gap-1.5">
          <HeartPulse className="text-brand h-3.5 w-3.5" />
          Antecedentes de salud
        </h2>
        <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
          Esta información la verá tu entrenador para adaptar rutinas y recomendaciones. No
          sustituye una evaluación médica.
        </p>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {HEALTH_CONDITION_FLAGS.map((flag) => (
            <label
              key={flag.id}
              className={cn(
                'flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-xs transition-colors',
                conditionFlags.includes(flag.id)
                  ? 'border-brand/40 bg-brand/5 text-zinc-900 dark:text-zinc-100'
                  : 'border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300'
              )}
            >
              <input
                type="checkbox"
                className="mt-0.5"
                checked={conditionFlags.includes(flag.id)}
                onChange={() => toggleFlag(flag.id)}
              />
              <span>{flag.label}</span>
            </label>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <Label>Patologías o padecimientos (detalle)</Label>
            <Textarea
              rows={3}
              value={conditionsNotes}
              onChange={(e) => setConditionsNotes(e.target.value)}
              placeholder="Ej.: hipertensión controlada, asma leve, etc."
            />
          </div>
          <div>
            <Label>Limitaciones físicas para entrenar</Label>
            <Textarea
              rows={3}
              value={limitationsNotes}
              onChange={(e) => setLimitationsNotes(e.target.value)}
              placeholder="Ej.: no impacto en rodilla derecha, evitar carga axial…"
            />
          </div>
          <div>
            <Label>Alergias alimentarias</Label>
            <Textarea
              rows={2}
              value={allergiesNotes}
              onChange={(e) => setAllergiesNotes(e.target.value)}
              placeholder="Ej.: mariscos, lactosa…"
            />
          </div>
          <div>
            <Label>Medicación relevante (opcional)</Label>
            <Textarea
              rows={2}
              value={medicationsNotes}
              onChange={(e) => setMedicationsNotes(e.target.value)}
              placeholder="Ej.: medicación para tiroides, antiinflamatorios…"
            />
          </div>
        </div>

        <label className="mt-4 flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-300">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={healthConsent}
            onChange={(e) => setHealthConsent(e.target.checked)}
          />
          <span>
            Declaro que la información es veraz y entiendo que es autodeclarada; no reemplaza el
            criterio de un profesional de la salud.
          </span>
        </label>
      </Card>

      <Card padding="sm" rounded="xl">
        <h2 className="section-title mb-2 flex items-center gap-1.5">
          <Activity className="text-brand h-3.5 w-3.5" />
          Metabolismo estimado (TMB / GET)
        </h2>
        <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
          <strong>TMB</strong> = calorías en reposo. <strong>GET</strong> = calorías con tu nivel de
          actividad diaria (fórmula Mifflin-St Jeor).
        </p>

        {missingAnthropometrics && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Completa fecha de nacimiento, altura y peso en{' '}
              <button type="button" className="font-semibold underline" onClick={onSwitchToDatos}>
                Datos
              </button>{' '}
              para calcular TMB y GET.
            </p>
          </div>
        )}

        {!missingAnthropometrics && (
          <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
            Datos usados: {latestWeight} kg · {profile.height} cm · {age} años
          </p>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label>Sexo biológico (para la fórmula)</Label>
            <select
              className="input-field w-full"
              value={sex}
              onChange={(e) => setSex(e.target.value as 'male' | 'female' | '')}
            >
              <option value="">Seleccionar…</option>
              <option value="male">Hombre</option>
              <option value="female">Mujer</option>
            </select>
          </div>
          <div>
            <Label>Nivel de actividad</Label>
            <select
              className="input-field w-full"
              value={activityLevel}
              onChange={(e) => setActivityLevel(e.target.value)}
            >
              <option value="">Seleccionar…</option>
              {ACTIVITY_LEVELS.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {healthProfile?.bmr_kcal != null && healthProfile.tdee_kcal != null && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 dark:border-zinc-700 dark:bg-zinc-800/50">
              <p className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase">TMB</p>
              <p className="text-xl font-bold text-zinc-900 dark:text-white">
                {healthProfile.bmr_kcal}{' '}
                <span className="text-sm font-medium text-zinc-500">kcal/día</span>
              </p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-3">
              <p className="text-[10px] font-semibold tracking-wide text-emerald-700 uppercase dark:text-emerald-400">
                GET
              </p>
              <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                {healthProfile.tdee_kcal} <span className="text-sm font-medium">kcal/día</span>
              </p>
            </div>
          </div>
        )}

        {healthProfile?.metabolic_computed_at && (
          <p className="mt-2 text-[10px] text-zinc-400">
            Último cálculo:{' '}
            {format(new Date(healthProfile.metabolic_computed_at), 'dd MMM yyyy · HH:mm', {
              locale: es,
            })}
            {healthProfile.weight_used_kg != null &&
              ` · Peso usado: ${healthProfile.weight_used_kg} kg`}
          </p>
        )}
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" disabled={updateMutation.isPending}>
          Guardar salud
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={updateMutation.isPending || missingAnthropometrics || !sex || !activityLevel}
          onClick={(e) => void handleSave(e, true)}
        >
          Calcular y guardar TMB/GET
        </Button>
      </div>
    </form>
  );
}
