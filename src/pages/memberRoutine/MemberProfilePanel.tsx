import { format } from 'date-fns';
import { ChevronDown, Minus, Plus } from 'lucide-react';
import { dateLocale as es } from '../../lib/dateLocale';
import { ACTIVITY_LEVELS } from '../../lib/metabolicRate';
import { Badge, Button } from '../../components/ui';
import type { HealthProfile } from '../../hooks/queries/useHealthProfileQuery';
import type { Measurement, MemberUser, Subscription } from './types';
import { formatMemberGoal, heightCmNumber } from './utils';

interface MemberProfilePanelProps {
  member: MemberUser;
  subscription: Subscription | null;
  latestMeasurement: Measurement | null;
  healthProfile: HealthProfile | undefined;
  showHealthAlert: boolean;
  hasHealthNotes: boolean;
  canEditWeeklyGoal: boolean;
  weeklyGoal: number;
  savingWeeklyGoal: boolean;
  weeklyGoalSaved: boolean;
  onWeeklyGoalChange: (next: number) => void;
  onSaveWeeklyGoal: () => void;
  onViewMeasurements: () => void;
  onRequestHealthMessage: () => void;
}

export function MemberProfilePanel({
  member,
  subscription,
  latestMeasurement,
  healthProfile,
  showHealthAlert,
  hasHealthNotes,
  canEditWeeklyGoal,
  weeklyGoal,
  savingWeeklyGoal,
  weeklyGoalSaved,
  onWeeklyGoalChange,
  onSaveWeeklyGoal,
  onViewMeasurements,
  onRequestHealthMessage,
}: MemberProfilePanelProps) {
  const heightCm = heightCmNumber(member.height);

  return (
    <div className="space-y-2.5">
      <div className="rounded-xl border border-zinc-200/70 px-3 py-2.5 dark:border-zinc-800/80">
        <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
          <div>
            <p className="text-[10px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              Altura
            </p>
            <p className="mt-0.5 text-sm font-semibold text-zinc-900 tabular-nums dark:text-white">
              {heightCm != null ? `${heightCm} cm` : '—'}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              {latestMeasurement?.weight != null ? 'Peso actual' : 'Peso inicial'}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-zinc-900 tabular-nums dark:text-white">
              {latestMeasurement?.weight != null
                ? `${latestMeasurement.weight} kg`
                : member.initial_weight != null
                  ? `${member.initial_weight} kg`
                  : '—'}
            </p>
            {latestMeasurement?.weight != null && (
              <button
                type="button"
                className="text-brand mt-0.5 text-[10px] font-medium hover:underline"
                onClick={onViewMeasurements}
              >
                Ver mediciones
              </button>
            )}
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className="text-[10px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              Objetivo
            </p>
            <p className="mt-0.5 text-sm font-semibold text-zinc-900 dark:text-white">
              {formatMemberGoal(member.goal) ?? '—'}
            </p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className="text-[10px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              Meta semanal
            </p>
            {canEditWeeklyGoal ? (
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center rounded-lg border border-zinc-200 dark:border-zinc-700">
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center text-zinc-500 transition-colors hover:text-zinc-900 disabled:opacity-40 sm:h-8 sm:w-8 dark:hover:text-white"
                    aria-label="Bajar meta"
                    disabled={savingWeeklyGoal || weeklyGoal <= 1}
                    onClick={() => onWeeklyGoalChange(Math.max(1, weeklyGoal - 1))}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="min-w-[2.5rem] text-center text-sm font-semibold text-zinc-900 tabular-nums dark:text-white">
                    {weeklyGoal}
                    <span className="ml-0.5 text-[11px] font-medium text-zinc-500">d</span>
                  </span>
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center text-zinc-500 transition-colors hover:text-zinc-900 disabled:opacity-40 sm:h-8 sm:w-8 dark:hover:text-white"
                    aria-label="Subir meta"
                    disabled={savingWeeklyGoal || weeklyGoal >= 7}
                    onClick={() => onWeeklyGoalChange(Math.min(7, weeklyGoal + 1))}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                {weeklyGoal !== (member.weekly_training_goal ?? 5) ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2.5 text-xs"
                    disabled={savingWeeklyGoal}
                    onClick={onSaveWeeklyGoal}
                  >
                    {savingWeeklyGoal ? '…' : 'Guardar'}
                  </Button>
                ) : weeklyGoalSaved ? (
                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    Guardado
                  </span>
                ) : null}
              </div>
            ) : (
              <p className="mt-0.5 text-sm font-semibold text-zinc-900 tabular-nums dark:text-white">
                {member.weekly_training_goal ?? 5} días
              </p>
            )}
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-zinc-100 pt-2 text-[11px] dark:border-zinc-800">
          {subscription ? (
            <>
              <span className="font-semibold text-emerald-600 dark:text-emerald-500">
                {subscription.membership_name}
              </span>
              <span className="text-zinc-400 dark:text-zinc-500">·</span>
              <span className="text-zinc-500 dark:text-zinc-400">
                {subscription.days_remaining} días
              </span>
              <span className="text-zinc-400 dark:text-zinc-500">·</span>
              <span className="text-zinc-500 dark:text-zinc-400">
                Vence {format(new Date(subscription.end_date), 'dd MMM yyyy', { locale: es })}
              </span>
            </>
          ) : (
            <span className="text-zinc-400 dark:text-zinc-500">Sin membresía activa</span>
          )}
        </div>
      </div>

      <details className="group rounded-xl border border-zinc-200/70 dark:border-zinc-800/80">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="flex min-w-0 items-center gap-2">
            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              Salud y limitaciones
            </span>
            {showHealthAlert && (
              <Badge variant="danger" className="px-1.5 py-0 text-[9px]">
                Revisar
              </Badge>
            )}
            {!showHealthAlert && !hasHealthNotes && (
              <span className="text-[10px] font-medium text-zinc-400">Sin datos</span>
            )}
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-400 transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-zinc-100 px-3 pt-2 pb-2.5 dark:border-zinc-800">
          {healthProfile &&
          (healthProfile.condition_labels.length > 0 ||
            healthProfile.conditions_notes ||
            healthProfile.limitations_notes ||
            healthProfile.allergies_notes ||
            healthProfile.medications_notes) ? (
            <div className="space-y-2 text-xs sm:text-sm">
              {healthProfile.condition_labels.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {healthProfile.condition_labels.map((flag) => (
                    <Badge key={flag.id} variant="warning" className="text-[10px]">
                      {flag.label}
                    </Badge>
                  ))}
                </div>
              )}
              {healthProfile.conditions_notes && (
                <p>
                  <span className="text-zinc-500 dark:text-zinc-400">Patologías:</span>{' '}
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {healthProfile.conditions_notes}
                  </span>
                </p>
              )}
              {healthProfile.limitations_notes && (
                <p>
                  <span className="text-zinc-500 dark:text-zinc-400">Limitaciones:</span>{' '}
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {healthProfile.limitations_notes}
                  </span>
                </p>
              )}
              {healthProfile.allergies_notes && (
                <p>
                  <span className="text-zinc-500 dark:text-zinc-400">Alergias:</span>{' '}
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {healthProfile.allergies_notes}
                  </span>
                </p>
              )}
              {healthProfile.medications_notes && (
                <p>
                  <span className="text-zinc-500 dark:text-zinc-400">Medicación:</span>{' '}
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {healthProfile.medications_notes}
                  </span>
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                El miembro aún no ha completado su perfil de salud.
              </p>
              <button
                type="button"
                className="text-brand text-[11px] font-semibold hover:underline"
                onClick={onRequestHealthMessage}
              >
                Pedir por mensaje
              </button>
            </div>
          )}
        </div>
      </details>

      <details className="group rounded-xl border border-zinc-200/70 dark:border-zinc-800/80">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
            Metabolismo estimado
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-400 transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-zinc-100 px-3 pt-2 pb-2.5 dark:border-zinc-800">
          {healthProfile?.bmr_kcal != null && healthProfile.tdee_kcal != null ? (
            <div className="space-y-1.5 text-xs sm:text-sm">
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <p>
                  <span className="text-zinc-500 dark:text-zinc-400">TMB</span>{' '}
                  <span className="font-semibold text-zinc-900 dark:text-white">
                    {healthProfile.bmr_kcal} kcal
                  </span>
                </p>
                <p>
                  <span className="text-zinc-500 dark:text-zinc-400">GET</span>{' '}
                  <span className="font-semibold text-emerald-600 dark:text-emerald-500">
                    {healthProfile.tdee_kcal} kcal
                  </span>
                </p>
              </div>
              {healthProfile.activity_level && (
                <p className="text-zinc-500 dark:text-zinc-400">
                  {ACTIVITY_LEVELS.find((l) => l.id === healthProfile.activity_level)?.label ??
                    healthProfile.activity_level}
                </p>
              )}
              {healthProfile.metabolic_computed_at && (
                <p className="text-[10px] text-zinc-400">
                  Calculado{' '}
                  {format(new Date(healthProfile.metabolic_computed_at), 'dd MMM yyyy', {
                    locale: es,
                  })}
                  {healthProfile.weight_used_kg != null && ` · ${healthProfile.weight_used_kg} kg`}
                </p>
              )}
              <p className="text-[10px] text-zinc-400">
                Estimación basada en datos declarados por el miembro.
              </p>
            </div>
          ) : (
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Sin cálculo de TMB/GET registrado.
            </p>
          )}
        </div>
      </details>
    </div>
  );
}
