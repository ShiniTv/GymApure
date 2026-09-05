import { lazy, Suspense, useState } from 'react';
import { ChevronDown, Minus, Plus, Scale, TrendingDown, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { dateLocale as es } from '../../lib/dateLocale';
import { Button, Card, Spinner } from '../../components/ui';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { useMemberStatsOptional } from '../../context/MemberStatsContext';
import { apiFetch, parseJsonResponse } from '../../lib/api';
import type { Measurement, UserProfile, WorkoutSession } from '../../hooks/queries/useProfileQuery';
import { StatMini } from './StatMini';
import { heightCmNumber } from './utils';

const ProfileWeightChart = lazy(() => import('../../components/ProfileWeightChart'));

interface ChartPoint {
  date: string;
  weight: number;
  bodyFat: number | null;
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
}

export function ProfileProgresoTab({
  progressLoading,
  profile,
  measurements,
  workouts,
  chartData,
  latestWeight,
  weightDelta,
  bmi,
  workoutsThisMonth,
  historyOpen,
  onHistoryOpenChange,
  onAddMeasurement,
}: ProfileProgresoTabProps) {
  const { user } = useAuth();
  const memberStats = useMemberStatsOptional();
  const [weeklyGoal, setWeeklyGoal] = useState(memberStats?.stats?.weeklyTrainingGoal ?? 5);
  const [savingGoal, setSavingGoal] = useState(false);

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
    } finally {
      setSavingGoal(false);
    }
  };

  if (progressLoading) {
    return (
      <div className="w-full space-y-3">
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      <Card padding="sm" rounded="xl" className="border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-text-secondary text-xs font-semibold tracking-wide uppercase">
              Meta semanal
            </p>
            <p className="text-text mt-0.5 text-sm">Días que quieres entrenar por semana</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="border-border inline-flex h-9 w-9 items-center justify-center rounded-lg border"
              onClick={() => setWeeklyGoal((g) => Math.max(1, g - 1))}
              aria-label="Reducir meta"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="text-text min-w-[2rem] text-center text-lg font-bold tabular-nums">
              {weeklyGoal}
            </span>
            <button
              type="button"
              className="border-border inline-flex h-9 w-9 items-center justify-center rounded-lg border"
              onClick={() => setWeeklyGoal((g) => Math.min(7, g + 1))}
              aria-label="Aumentar meta"
            >
              <Plus className="h-4 w-4" />
            </button>
            <Button
              size="sm"
              variant="secondary"
              disabled={savingGoal || weeklyGoal === (memberStats?.stats?.weeklyTrainingGoal ?? 5)}
              onClick={() => void saveWeeklyGoal()}
            >
              {savingGoal ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <StatMini
          label="Peso actual"
          value={latestWeight != null ? `${latestWeight} kg` : '—'}
          sub={
            weightDelta != null
              ? `${weightDelta > 0 ? '+' : ''}${weightDelta} kg vs inicial`
              : undefined
          }
        />
        <StatMini
          label="IMC"
          value={bmi != null ? bmi.toString() : '—'}
          sub={
            heightCmNumber(profile.height) != null
              ? `${heightCmNumber(profile.height)} cm`
              : undefined
          }
        />
        <StatMini label="Mediciones" value={String(measurements.length)} />
        <StatMini label="Entrenos este mes" value={String(workoutsThisMonth)} />
      </div>

      <Card padding="sm" rounded="xl" className="border-border bg-surface">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <h2 className="text-text text-sm font-semibold">Evolución de peso</h2>
          <div className="flex shrink-0 items-center gap-2">
            {weightDelta != null && (
              <span
                className={`text-small flex items-center gap-1 rounded-md px-2 py-0.5 font-semibold ${
                  weightDelta < 0
                    ? 'bg-emerald-500/10 text-emerald-600'
                    : weightDelta > 0
                      ? 'text-brand bg-brand/10'
                      : 'bg-surface-raised text-text-muted'
                }`}
              >
                {weightDelta < 0 ? (
                  <TrendingDown className="h-3.5 w-3.5" />
                ) : weightDelta > 0 ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <Minus className="h-3.5 w-3.5" />
                )}
                {weightDelta > 0 ? '+' : ''}
                {weightDelta} kg
              </span>
            )}
            {chartData.length > 0 && (
              <Button
                type="button"
                size="sm"
                className="h-8 min-h-8 px-2.5"
                onClick={onAddMeasurement}
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Medición</span>
              </Button>
            )}
          </div>
        </div>

        {chartData.length >= 2 ? (
          <Suspense
            fallback={
              <div className="flex h-56 items-center justify-center">
                <Spinner />
              </div>
            }
          >
            <ProfileWeightChart data={chartData} />
          </Suspense>
        ) : chartData.length === 1 ? (
          <div className="flex h-40 flex-col items-center justify-center text-center sm:h-48">
            <p className="text-brand text-3xl font-bold">{chartData[0].weight} kg</p>
            <p className="text-text-muted text-small mt-1.5">
              {chartData[0].date} · Añade otra medición para la gráfica
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center px-2 pt-4 pb-5 text-center">
            <Scale className="text-brand/50 mb-2.5 h-7 w-7" aria-hidden />
            <p className="text-text text-sm font-semibold">Sin mediciones de peso</p>
            <p className="text-text-muted text-small mt-1 max-w-[14rem] leading-snug">
              Registra tu peso para ver la evolución.
            </p>
            <Button type="button" size="sm" className="mt-4" onClick={onAddMeasurement}>
              <Plus className="h-3.5 w-3.5" />
              Registrar peso
            </Button>
          </div>
        )}
      </Card>

      {measurements.length > 0 && (
        <Card padding="sm" rounded="xl" className="border-border bg-surface">
          <button
            type="button"
            onClick={() => onHistoryOpenChange(!historyOpen)}
            className="flex w-full items-center justify-between gap-2 text-left"
            aria-expanded={historyOpen}
          >
            <h2 className="text-text text-sm font-semibold">
              Historial
              <span className="text-text-muted ml-1.5 font-normal">· {measurements.length}</span>
            </h2>
            <ChevronDown
              className={cn(
                'text-text-muted h-4 w-4 shrink-0 transition-transform',
                historyOpen && 'rotate-180'
              )}
            />
          </button>

          {historyOpen && (
            <>
              <div className="mt-2.5 space-y-1.5 lg:hidden">
                {measurements.map((m) => (
                  <div key={m.id} className="bg-surface-raised rounded-xl px-2.5 py-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-text text-small font-semibold">
                        {format(new Date(m.date), 'dd MMM yyyy', { locale: es })}
                      </p>
                      <p className="text-text text-small font-semibold tabular-nums">
                        {m.weight != null ? `${m.weight} kg` : '—'}
                      </p>
                    </div>
                    <p className="text-text-muted text-small mt-0.5">
                      Grasa {m.body_fat_percentage != null ? `${m.body_fat_percentage}%` : '—'}
                      {' · '}
                      Cintura {m.waist != null ? `${m.waist}` : '—'}
                      {' · '}
                      Brazo {m.arm != null ? `${m.arm}` : '—'}
                      {' · '}
                      Pierna {m.leg != null ? `${m.leg}` : '—'}
                    </p>
                  </div>
                ))}
              </div>
              <div className="-mx-1 mt-2.5 hidden overflow-x-auto px-1 lg:block">
                <table className="w-full min-w-[28rem] text-left">
                  <thead>
                    <tr className="border-border-subtle text-text-muted text-small border-b font-semibold">
                      <th className="pr-3 pb-2">Fecha</th>
                      <th className="pr-3 pb-2">Peso</th>
                      <th className="pr-3 pb-2">Grasa</th>
                      <th className="pr-3 pb-2">Cintura</th>
                      <th className="pr-3 pb-2">Brazo</th>
                      <th className="pb-2">Pierna</th>
                    </tr>
                  </thead>
                  <tbody>
                    {measurements.map((m) => (
                      <tr
                        key={m.id}
                        className="border-border-subtle text-xs last:border-0 sm:text-sm"
                      >
                        <td className="text-text-secondary py-2 pr-3 font-medium whitespace-nowrap">
                          {format(new Date(m.date), 'dd MMM yyyy', { locale: es })}
                        </td>
                        <td className="text-text py-2 pr-3 font-semibold">
                          {m.weight != null ? `${m.weight} kg` : '—'}
                        </td>
                        <td className="text-text-muted py-2 pr-3">
                          {m.body_fat_percentage != null ? `${m.body_fat_percentage}%` : '—'}
                        </td>
                        <td className="text-text-muted py-2 pr-3">
                          {m.waist != null ? `${m.waist} cm` : '—'}
                        </td>
                        <td className="text-text-muted py-2 pr-3">
                          {m.arm != null ? `${m.arm} cm` : '—'}
                        </td>
                        <td className="text-text-muted py-2">
                          {m.leg != null ? `${m.leg} cm` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      )}

      {workouts.length > 0 && (
        <Card padding="sm" rounded="xl" className="border-border bg-surface">
          <h2 className="text-text mb-2 text-sm font-semibold">Actividad reciente</h2>
          <div className="space-y-0.5">
            {workouts.slice(0, 5).map((w) => (
              <div
                key={w.id}
                className="border-border-subtle flex items-center justify-between gap-2 border-b py-2 last:border-0"
              >
                <p className="text-text truncate text-xs font-medium sm:text-sm">
                  {w.routine_name}
                </p>
                <p className="text-text-muted text-small shrink-0 tabular-nums sm:text-xs">
                  {format(new Date(w.start_time), 'dd MMM · HH:mm', { locale: es })}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
