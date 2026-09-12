import React, { lazy, Suspense, useState } from 'react';
import {
  Minus,
  Plus,
  Scale,
  TrendingDown,
  TrendingUp,
  Activity,
  Ruler,
  Calendar,
  Sparkles,
  Trash2,
  Edit2,
  Flame,
  Target,
} from 'lucide-react';
import { format } from 'date-fns';
import { dateLocale as es } from '../../lib/dateLocale';
import { Button, Spinner } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useMemberStatsOptional } from '../../context/MemberStatsContext';
import { useToastOptional } from '../../context/ToastContext';
import { apiFetch, parseJsonResponse } from '../../lib/api';
import type { Measurement, UserProfile, WorkoutSession } from '../../hooks/queries/useProfileQuery';

const ProfileWeightChart = lazy(() => import('../../components/ProfileWeightChart'));

interface ChartPoint {
  date: string;
  weight: number;
  bodyFat?: number | null;
}

interface ProfileProgresoTabProps {
  progressLoading: boolean;
  profile: UserProfile;
  measurements: Measurement[];
  workouts: WorkoutSession[];
  chartData: ChartPoint[];
  latestWeight: number | null;
  weightDelta: number | null;
  bmi: number | null;
  workoutsThisMonth: number;
  historyOpen: boolean;
  onHistoryOpenChange: (open: boolean) => void;
  onAddMeasurement: () => void;
  onEditMeasurement?: (m: Measurement) => void;
  onDeleteMeasurement?: (id: number) => Promise<void>;
}

export function ProfileProgresoTab({
  progressLoading,
  measurements,
  chartData,
  latestWeight,
  weightDelta,
  bmi,
  workoutsThisMonth,
  onAddMeasurement,
  onEditMeasurement,
  onDeleteMeasurement,
}: ProfileProgresoTabProps) {
  const { user } = useAuth();
  const toast = useToastOptional();
  const memberStats = useMemberStatsOptional();
  const [weeklyGoal, setWeeklyGoal] = useState(memberStats?.stats?.weeklyTrainingGoal ?? 5);
  const [savingGoal, setSavingGoal] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const workoutsThisWeek = memberStats?.stats?.workoutsThisWeek ?? 0;

  const saveWeeklyGoal = async () => {
    if (!user?.id) return;
    const goal = Math.min(7, Math.max(1, weeklyGoal));
    setSavingGoal(true);
    try {
      const res = await apiFetch(`/api/users/${user.id}/weekly-training-goal`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekly_training_goal: goal }),
      });
      const data = await parseJsonResponse<{ weekly_training_goal: number }>(res);
      setWeeklyGoal(data.weekly_training_goal);
      await memberStats?.refresh();
      toast?.success('Meta semanal actualizada');
    } catch (err) {
      toast?.error(err instanceof Error ? err.message : 'Error al guardar meta');
    } finally {
      setSavingGoal(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!onDeleteMeasurement) return;
    setDeletingId(id);
    try {
      await onDeleteMeasurement(id);
      toast?.success('Medición eliminada');
    } catch (err) {
      toast?.error(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setDeletingId(null);
    }
  };

  // Última medición y valores clave
  const latest = measurements[0] ?? null;
  const oldest = measurements[measurements.length - 1] ?? null;

  const waistDelta =
    latest?.waist != null && oldest?.waist != null && measurements.length > 1
      ? Math.round((latest.waist - oldest.waist) * 10) / 10
      : null;

  const armDelta =
    latest?.arm != null && oldest?.arm != null && measurements.length > 1
      ? Math.round((latest.arm - oldest.arm) * 10) / 10
      : null;

  const legDelta =
    latest?.leg != null && oldest?.leg != null && measurements.length > 1
      ? Math.round((latest.leg - oldest.leg) * 10) / 10
      : null;

  if (progressLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Barra de Meta Semanal y Consistencia */}
      <div className="border-border/70 bg-surface overflow-hidden rounded-2xl border p-4 shadow-2xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Target className="text-brand h-4 w-4" />
              <h2 className="text-text text-sm font-bold tracking-tight">Meta de entrenamiento</h2>
            </div>
            <p className="text-text-muted mt-0.5 text-xs">
              Has completado{' '}
              <strong className="text-text font-bold">
                {workoutsThisWeek} de {weeklyGoal}
              </strong>{' '}
              días esta semana
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="border-border bg-surface-raised text-text hover:bg-surface-raised/80 inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors"
              onClick={() => setWeeklyGoal((g) => Math.max(1, g - 1))}
              aria-label="Reducir meta"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="text-text min-w-[2.2rem] text-center text-base font-bold tabular-nums">
              {weeklyGoal}d
            </span>
            <button
              type="button"
              className="border-border bg-surface-raised text-text hover:bg-surface-raised/80 inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors"
              onClick={() => setWeeklyGoal((g) => Math.min(7, g + 1))}
              aria-label="Aumentar meta"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <Button
              size="sm"
              variant="secondary"
              disabled={savingGoal || weeklyGoal === (memberStats?.stats?.weeklyTrainingGoal ?? 5)}
              onClick={() => void saveWeeklyGoal()}
              className="ml-1 text-xs"
            >
              {savingGoal ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </div>

        {/* Barra visual de cumplimiento semanal */}
        <div className="mt-3">
          <div className="bg-surface-raised h-2.5 w-full overflow-hidden rounded-full">
            <div
              className="from-brand to-brand/80 h-full rounded-full bg-gradient-to-r transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.round((workoutsThisWeek / weeklyGoal) * 100))}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Grid de Métricas Principales de Composición */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {/* Peso Actual */}
        <div className="border-border/70 bg-surface rounded-2xl border p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-text-muted text-xs font-semibold">Peso actual</span>
            <Scale className="text-brand h-3.5 w-3.5" />
          </div>
          <p className="text-text mt-1 text-xl font-bold tabular-nums">
            {latestWeight != null ? `${latestWeight} kg` : '—'}
          </p>
          {weightDelta != null && (
            <p
              className={`mt-1 inline-flex items-center gap-0.5 text-xs font-semibold ${
                weightDelta < 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : weightDelta > 0
                    ? 'text-brand'
                    : 'text-text-muted'
              }`}
            >
              {weightDelta < 0 ? (
                <TrendingDown className="h-3 w-3" />
              ) : weightDelta > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : null}
              {weightDelta > 0 ? `+${weightDelta}` : weightDelta} kg vs inicial
            </p>
          )}
        </div>

        {/* IMC */}
        <div className="border-border/70 bg-surface rounded-2xl border p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-text-muted text-xs font-semibold">IMC</span>
            <Activity className="text-brand h-3.5 w-3.5" />
          </div>
          <p className="text-text mt-1 text-xl font-bold tabular-nums">{bmi ?? '—'}</p>
          <p className="text-text-muted mt-1 text-xs font-medium">
            {bmi != null
              ? bmi < 18.5
                ? 'Bajo peso'
                : bmi < 25
                  ? 'Normal'
                  : bmi < 30
                    ? 'Sobrepeso'
                    : 'Obesidad'
              : 'Pendiente altura'}
          </p>
        </div>

        {/* Grasa Corporal */}
        <div className="border-border/70 bg-surface rounded-2xl border p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-text-muted text-xs font-semibold">Grasa corporal</span>
            <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <p className="text-text mt-1 text-xl font-bold tabular-nums">
            {latest?.body_fat_percentage != null ? `${latest.body_fat_percentage}%` : '—'}
          </p>
          <p className="text-text-muted mt-1 text-xs font-medium">
            {measurements.length} registro{measurements.length === 1 ? '' : 's'}
          </p>
        </div>

        {/* Entrenamientos del Mes */}
        <div className="border-border/70 bg-surface rounded-2xl border p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-text-muted text-xs font-semibold">Entrenos mes</span>
            <Flame className="text-brand h-3.5 w-3.5" />
          </div>
          <p className="text-text mt-1 text-xl font-bold tabular-nums">{workoutsThisMonth}</p>
          <p className="text-text-muted mt-1 text-xs font-medium">Sesiones activas</p>
        </div>
      </div>

      {/* Gráfica de Evolución */}
      <div className="border-border/70 bg-surface rounded-2xl border p-4 shadow-2xs">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-text text-sm font-bold">Evolución de peso corporal</h2>
            <p className="text-text-muted text-xs">Tendencia en el tiempo y composición</p>
          </div>

          <Button size="sm" onClick={onAddMeasurement} className="gap-1.5 shadow-xs">
            <Plus className="h-3.5 w-3.5" />
            <span>Registrar medición</span>
          </Button>
        </div>

        <Suspense
          fallback={
            <div className="flex h-48 items-center justify-center">
              <Spinner />
            </div>
          }
        >
          <ProfileWeightChart data={chartData} />
        </Suspense>
      </div>

      {/* Resumen de Perímetros Corporales (si existen datos) */}
      {(latest?.waist != null || latest?.arm != null || latest?.leg != null) && (
        <div className="border-border/70 bg-surface rounded-2xl border p-4 shadow-2xs">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ruler className="text-brand h-4 w-4" />
              <h2 className="text-text text-sm font-bold">Perímetros Corporales</h2>
            </div>
            <span className="text-text-muted text-xs font-medium">Última medición</span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-surface-raised border-border/50 rounded-xl border p-3 text-center">
              <p className="text-text-muted text-xs font-medium">Cintura</p>
              <p className="text-text mt-1 text-base font-bold tabular-nums">
                {latest?.waist != null ? `${latest.waist} cm` : '—'}
              </p>
              {waistDelta != null && (
                <p className="text-text-muted mt-0.5 text-[11px] font-semibold">
                  {waistDelta > 0 ? `+${waistDelta}` : waistDelta} cm
                </p>
              )}
            </div>

            <div className="bg-surface-raised border-border/50 rounded-xl border p-3 text-center">
              <p className="text-text-muted text-xs font-medium">Brazo</p>
              <p className="text-text mt-1 text-base font-bold tabular-nums">
                {latest?.arm != null ? `${latest.arm} cm` : '—'}
              </p>
              {armDelta != null && (
                <p className="text-text-muted mt-0.5 text-[11px] font-semibold">
                  {armDelta > 0 ? `+${armDelta}` : armDelta} cm
                </p>
              )}
            </div>

            <div className="bg-surface-raised border-border/50 rounded-xl border p-3 text-center">
              <p className="text-text-muted text-xs font-medium">Pierna / Muslo</p>
              <p className="text-text mt-1 text-base font-bold tabular-nums">
                {latest?.leg != null ? `${latest.leg} cm` : '—'}
              </p>
              {legDelta != null && (
                <p className="text-text-muted mt-0.5 text-[11px] font-semibold">
                  {legDelta > 0 ? `+${legDelta}` : legDelta} cm
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Historial / Timeline de Mediciones */}
      <div className="border-border/70 bg-surface rounded-2xl border p-4 shadow-2xs">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="text-brand h-4 w-4" />
            <h2 className="text-text text-sm font-bold">Historial de mediciones</h2>
          </div>
          <span className="text-text-muted text-xs">
            {measurements.length} registro{measurements.length === 1 ? '' : 's'}
          </span>
        </div>

        {measurements.length > 0 ? (
          <div className="space-y-2">
            {measurements.map((m, idx) => {
              const prev = measurements[idx + 1];
              const delta =
                m.weight != null && prev?.weight != null
                  ? Math.round((m.weight - prev.weight) * 10) / 10
                  : null;

              const perimeters = [
                m.waist != null ? `Cintura: ${m.waist}cm` : null,
                m.arm != null ? `Brazo: ${m.arm}cm` : null,
                m.leg != null ? `Pierna: ${m.leg}cm` : null,
              ].filter(Boolean);

              return (
                <div
                  key={m.id}
                  className="border-border/60 bg-surface-raised/40 hover:bg-surface-raised/70 flex flex-col gap-2 rounded-xl border p-3 transition-colors sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-text text-xs font-semibold">
                        {format(new Date(m.date), 'dd MMMM yyyy', { locale: es })}
                      </span>
                      {idx === 0 && (
                        <span className="bg-brand/10 text-brand rounded-md px-1.5 py-0.5 text-[10px] font-bold">
                          Última
                        </span>
                      )}
                    </div>

                    {perimeters.length > 0 && (
                      <p className="text-text-muted mt-1 text-xs">{perimeters.join(' · ')}</p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                    <div className="text-right">
                      <p className="text-text text-sm font-bold tabular-nums">
                        {m.weight != null ? `${m.weight} kg` : '—'}
                        {delta != null && (
                          <span
                            className={`ml-1.5 text-xs font-semibold ${
                              delta < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-brand'
                            }`}
                          >
                            {delta > 0 ? `+${delta}` : delta}
                          </span>
                        )}
                      </p>
                      {m.body_fat_percentage != null && (
                        <p className="text-text-muted text-[11px]">
                          {m.body_fat_percentage}% grasa
                        </p>
                      )}
                    </div>

                    <div className="border-border/50 flex items-center gap-1 border-l pl-2">
                      {onEditMeasurement && (
                        <button
                          type="button"
                          onClick={() => onEditMeasurement(m)}
                          className="text-text-muted hover:bg-surface hover:text-text flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
                          title="Editar medición"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      )}

                      {onDeleteMeasurement && (
                        <button
                          type="button"
                          onClick={() => void handleDelete(m.id)}
                          disabled={deletingId === m.id}
                          className="text-text-muted hover:bg-danger/10 hover:text-danger flex h-7 w-7 items-center justify-center rounded-lg transition-colors disabled:opacity-50"
                          title="Eliminar medición"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="border-border/70 rounded-xl border border-dashed p-6 text-center">
            <Scale className="text-text-muted mx-auto h-8 w-8" />
            <p className="text-text mt-2 text-sm font-bold">Sin mediciones registradas</p>
            <p className="text-text-muted mt-0.5 text-xs">
              Registra tu primera medición de peso y medidas corporales.
            </p>
            <Button size="sm" onClick={onAddMeasurement} className="mt-3.5">
              <Plus className="h-3.5 w-3.5" />
              Registrar ahora
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
