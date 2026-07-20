import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Activity, ChevronDown, Info } from 'lucide-react';
import { format } from 'date-fns';
import { dateLocale as es } from '../../lib/dateLocale';
import {
  Accordion,
  AccordionItem,
  Button,
  Card,
  Label,
  Select,
  Textarea,
} from '../../components/ui';
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

function heightCmNumber(height: number | null | undefined): number | null {
  if (height == null || Number.isNaN(height)) return null;
  if (height > 0 && height < 3) return Math.round(height * 1000) / 10;
  return height;
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
  const [moreOpen, setMoreOpen] = useState(false);

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
    if (healthProfile.allergies_notes || healthProfile.medications_notes) {
      setMoreOpen(true);
    }
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

  const heightCm = heightCmNumber(profile.height);
  const missingAnthropometrics = !profile.dob || heightCm == null || !latestWeight;
  const hasConsent = Boolean(healthProfile?.health_consent_at);
  const conditionLabels = HEALTH_CONDITION_FLAGS.filter((f) => conditionFlags.includes(f.id)).map(
    (f) => f.shortLabel
  );

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
      <div className="w-full">
        <Card
          padding="sm"
          rounded="xl"
          className="border-zinc-200/70 bg-white/80 dark:border-zinc-800/80 dark:bg-zinc-900/50"
        >
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando perfil de salud…</p>
        </Card>
      </div>
    );
  }

  return (
    <form className="w-full space-y-3" onSubmit={(e) => void handleSave(e, false)}>
      {(conditionLabels.length > 0 || healthProfile?.tdee_kcal != null) && (
        <div className="flex flex-wrap gap-1.5 px-0.5">
          {conditionLabels.length > 0 && (
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {conditionLabels.length} condición{conditionLabels.length === 1 ? '' : 'es'}
            </span>
          )}
          {healthProfile?.tdee_kcal != null && (
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
              GET {healthProfile.tdee_kcal} kcal
            </span>
          )}
          {healthProfile?.bmr_kcal != null && (
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              TMB {healthProfile.bmr_kcal} kcal
            </span>
          )}
        </div>
      )}

      <div className="md:grid md:grid-cols-2 md:items-start md:gap-4">
        <Card
          padding="sm"
          rounded="xl"
          className="border-zinc-200/70 bg-white/80 md:p-4 dark:border-zinc-800/80 dark:bg-zinc-900/50"
        >
          <h2 className="text-[13px] font-semibold text-zinc-900 dark:text-white">Antecedentes</h2>
          <p className="mt-0.5 text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
            Lo ve tu entrenador · no sustituye criterio médico
          </p>

          <p className="mt-3.5 mb-1.5 text-[10px] font-semibold tracking-wide text-zinc-400 uppercase">
            Condiciones
          </p>
          <div className="flex flex-wrap gap-1.5">
            {HEALTH_CONDITION_FLAGS.map((flag) => {
              const active = conditionFlags.includes(flag.id);
              return (
                <button
                  key={flag.id}
                  type="button"
                  title={flag.label}
                  onClick={() => toggleFlag(flag.id)}
                  aria-pressed={active}
                  className={cn(
                    'inline-flex h-7 items-center rounded-full border px-2.5 text-[11px] font-medium transition-colors',
                    active
                      ? 'border-brand/30 bg-brand/10 text-brand'
                      : 'border-zinc-200/80 bg-transparent text-zinc-600 hover:border-zinc-300 dark:border-zinc-700/80 dark:text-zinc-300 dark:hover:border-zinc-600'
                  )}
                >
                  {flag.shortLabel}
                </button>
              );
            })}
          </div>

          <div className="mt-4 space-y-3.5">
            <div>
              <Label>Detalle de padecimientos</Label>
              <Textarea
                rows={2}
                value={conditionsNotes}
                onChange={(e) => setConditionsNotes(e.target.value)}
                placeholder="Ej.: hipertensión controlada…"
                className="mt-1 min-h-[2.75rem] resize-none"
              />
            </div>
            <div>
              <Label>Limitaciones al entrenar</Label>
              <Textarea
                rows={2}
                value={limitationsNotes}
                onChange={(e) => setLimitationsNotes(e.target.value)}
                placeholder="Ej.: evitar impacto en rodilla…"
                className="mt-1 min-h-[2.75rem] resize-none"
              />
            </div>
          </div>

          <div className="mt-3 border-t border-zinc-100 pt-2 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              className="flex w-full items-center justify-between gap-2 py-1.5 text-left"
              aria-expanded={moreOpen}
            >
              <span className="text-[12px] font-semibold text-zinc-700 dark:text-zinc-200">
                Alergias y medicación
              </span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 shrink-0 text-zinc-400 transition-transform',
                  moreOpen && 'rotate-180'
                )}
              />
            </button>
            {moreOpen && (
              <div className="grid grid-cols-1 gap-3 pt-1 pb-1 sm:grid-cols-2">
                <div>
                  <Label>Alergias</Label>
                  <Textarea
                    rows={2}
                    value={allergiesNotes}
                    onChange={(e) => setAllergiesNotes(e.target.value)}
                    placeholder="Ej.: lactosa…"
                    className="mt-1 min-h-[2.75rem] resize-none"
                  />
                </div>
                <div>
                  <Label>Medicación</Label>
                  <Textarea
                    rows={2}
                    value={medicationsNotes}
                    onChange={(e) => setMedicationsNotes(e.target.value)}
                    placeholder="Opcional"
                    className="mt-1 min-h-[2.75rem] resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {!hasConsent && (
            <label className="mt-3 flex items-start gap-2 text-[11px] leading-snug text-zinc-600 dark:text-zinc-300">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={healthConsent}
                onChange={(e) => setHealthConsent(e.target.checked)}
              />
              <span>
                Declaro que la información es veraz y autodeclarada; no reemplaza criterio médico.
              </span>
            </label>
          )}
        </Card>

        <Accordion>
          <AccordionItem
            title="Metabolismo (TMB / GET)"
            icon={<Activity className="text-brand h-4 w-4" />}
            defaultOpen
            className="rounded-xl"
          >
            <p className="mb-3 text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
              TMB = reposo · GET = con tu actividad (Mifflin-St Jeor).
            </p>

            {missingAnthropometrics && (
              <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-2 text-[11px] text-amber-800 dark:text-amber-300">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <p>
                  Completa nacimiento, altura y peso en{' '}
                  <button
                    type="button"
                    className="font-semibold underline"
                    onClick={onSwitchToDatos}
                  >
                    Datos
                  </button>{' '}
                  para calcular.
                </p>
              </div>
            )}

            {!missingAnthropometrics && (
              <p className="mb-3 text-[11px] text-zinc-500 dark:text-zinc-400">
                {latestWeight} kg · {heightCm} cm · {age} años
              </p>
            )}

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div>
                <Label htmlFor="health-sex">Sexo biológico</Label>
                <Select
                  id="health-sex"
                  value={sex}
                  onChange={(e) => setSex(e.target.value as 'male' | 'female' | '')}
                >
                  <option value="">Seleccionar…</option>
                  <option value="male">Hombre</option>
                  <option value="female">Mujer</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="health-activity">Actividad</Label>
                <Select
                  id="health-activity"
                  value={activityLevel}
                  onChange={(e) => setActivityLevel(e.target.value)}
                >
                  <option value="">Seleccionar…</option>
                  {ACTIVITY_LEVELS.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {healthProfile?.bmr_kcal != null && healthProfile.tdee_kcal != null && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-zinc-50 px-3 py-2.5 dark:bg-zinc-800/40">
                  <p className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase">
                    TMB
                  </p>
                  <p className="text-lg font-bold text-zinc-900 dark:text-white">
                    {healthProfile.bmr_kcal}{' '}
                    <span className="text-xs font-medium text-zinc-500">kcal</span>
                  </p>
                </div>
                <div className="rounded-xl bg-emerald-500/5 px-3 py-2.5">
                  <p className="text-[10px] font-semibold tracking-wide text-emerald-700 uppercase dark:text-emerald-400">
                    GET
                  </p>
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                    {healthProfile.tdee_kcal} <span className="text-xs font-medium">kcal</span>
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
                {healthProfile.weight_used_kg != null && ` · ${healthProfile.weight_used_kg} kg`}
              </p>
            )}

            <button
              type="button"
              className="text-brand mt-3 text-[11px] font-semibold underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              disabled={
                updateMutation.isPending || missingAnthropometrics || !sex || !activityLevel
              }
              onClick={(e) => void handleSave(e, true)}
            >
              Calcular y guardar TMB/GET
            </button>
          </AccordionItem>
        </Accordion>
      </div>

      <Button
        type="submit"
        size="sm"
        className="h-10 min-h-10 w-full sm:w-auto"
        disabled={updateMutation.isPending}
      >
        Guardar salud
      </Button>
    </form>
  );
}
