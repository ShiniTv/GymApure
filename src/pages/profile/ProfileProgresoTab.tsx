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
  Flame,
  Target,
} from 'lucide-react';
import { format } from 'date-fns';
import { dateLocale as es } from '../../lib/dateLocale';
import { Button, Spinner, Badge } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useMemberStatsOptional } from '../../context/MemberStatsContext';
import { useToastOptional } from '../../context/ToastContext';
import { apiFetch, parseJsonResponse } from '../../lib/api';
import type { Measurement, UserProfile, WorkoutSession } from '../../hooks/queries/useProfileQuery';
import { cn } from './ProfileDesignSystem';

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

function KPICard({
  icon: Icon,
  label,
  value,
  delta,
  trend,
  children,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  delta?: number | null;
  trend?: 'up' | 'down' | 'neutral';
  children?: React.ReactNode;
}) {
  const deltaColor = delta
    ? delta < 0
      ? 'text-success'
      : delta > 0
        ? 'text-brand'
        : 'text-text-muted'
    : 'text-text-muted';

  return (
    <div className="border-border/80 bg-surface flex flex-col justify-between space-y-1.5 rounded-xl border p-3 shadow-2xs sm:p-3.5">
      <div className="flex items-center justify-between">
        <span className="text-text-muted text-small flex items-center gap-1.5 font-semibold tracking-wider uppercase">
          <Icon className="text-brand h-3.5 w-3.5" />
          {label}
        </span>
        {children}
      </div>
      <div>
        <p className="text-text text-xl font-bold tracking-tight tabular-nums sm:text-2xl">
          {value}
        </p>
        {delta != null && (
          <p
            className={cn(
              'mt-0.5 inline-flex items-center gap-1 text-xs font-semibold',
              deltaColor
            )}
          >
            {trend === 'down' && <TrendingDown className="h-3.5 w-3.5" />}
            {trend === 'up' && <TrendingUp className="h-3.5 w-3.5" />}
            {delta > 0 ? `+${delta}` : delta} kg
          </p>
        )}
      </div>
    </div>
  );
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

  React.useEffect(() => {
    if (memberStats?.stats?.weeklyTrainingGoal != null) {
      setWeeklyGoal(memberStats.stats.weeklyTrainingGoal);
    }
  }, [memberStats?.stats?.weeklyTrainingGoal]);

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

  const weightTrend = weightDelta
    ? weightDelta < 0
      ? 'down'
      : weightDelta > 0
        ? 'up'
        : 'neutral'
    : undefined;

  return (
    <div className="w-full space-y-3">
      {/* Meta Semanal */}
      <div className="border-border/80 bg-surface space-y-2.5 rounded-xl border p-3.5 shadow-2xs sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-brand/10 rounded-lg p-1.5">
              <Target className="text-brand h-4 w-4" />
            </div>
            <div>
              <h3 className="text-text text-sm font-semibold tracking-[-0.01em]">
                Meta semanal de entrenamiento
              </h3>
              <p className="text-text-muted text-xs">
                Has completado{' '}
                <strong className="text-text">
                  {workoutsThisWeek} de {weeklyGoal}
                </strong>{' '}
                días esta semana
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="border-border/60 bg-surface text-text hover:bg-surface-raised inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border transition-colors"
              onClick={() => setWeeklyGoal((g) => Math.max(1, g - 1))}
              aria-label="Reducir meta"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="text-text min-w-[2.5rem] text-center text-base font-bold tabular-nums">
              {weeklyGoal}d
            </span>
            <button
              type="button"
              className="border-border/60 bg-surface text-text hover:bg-surface-raised inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border transition-colors"
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
              className="ml-1"
            >
              {savingGoal ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </div>

        <div>
          <div className="text-small mb-1.5 flex items-center justify-between font-medium">
            <span className="text-text-muted">Progreso semanal</span>
            <span className="text-text font-bold tabular-nums">
              {Math.min(100, Math.round((workoutsThisWeek / weeklyGoal) * 100))}%
            </span>
          </div>
          <div className="bg-surface-raised border-border/40 h-2 w-full overflow-hidden rounded-full border">
            <div
              className="from-brand to-brand/80 h-full rounded-full bg-gradient-to-r transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.round((workoutsThisWeek / weeklyGoal) * 100))}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* KPIs Grid Bento */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <KPICard
          icon={Scale}
          label="Peso actual"
          value={latestWeight != null ? `${latestWeight} kg` : '—'}
          delta={weightDelta}
          trend={weightTrend}
        />

        <KPICard
          icon={Activity}
          label="IMC"
          value={bmi ?? '—'}
          children={
            bmi != null && (
              <Badge
                variant={
                  bmi < 18.5 ? 'default' : bmi < 25 ? 'success' : bmi < 30 ? 'warning' : 'danger'
                }
                className="text-small px-1.5 py-0 font-semibold"
              >
                {bmi < 18.5
                  ? 'Bajo peso'
                  : bmi < 25
                    ? 'Normal'
                    : bmi < 30
                      ? 'Sobrepeso'
                      : 'Obesidad'}
              </Badge>
            )
          }
        />

        <KPICard
          icon={Sparkles}
          label="Grasa corporal"
          value={latest?.body_fat_percentage != null ? `${latest.body_fat_percentage}%` : '—'}
          children={
            <span className="text-text-muted text-small tabular-nums">
              {measurements.length} reg.
            </span>
          }
        />

        <KPICard
          icon={Flame}
          label="Entrenos (mes)"
          value={workoutsThisMonth}
          children={<span className="text-text-muted text-small">Activos</span>}
        />
      </div>

      {/* Gráfica de Evolución */}
      <div className="border-border/80 bg-surface space-y-3 rounded-xl border p-3.5 shadow-2xs sm:p-4">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-text text-sm font-semibold tracking-[-0.01em]">
              Evolución de peso corporal
            </h2>
            <p className="text-text-muted text-xs">Tendencia histórica en el tiempo</p>
          </div>
          <Button size="sm" onClick={onAddMeasurement} className="gap-1.5 font-semibold shadow-2xs">
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
          <div className="h-48 w-full sm:h-56">
            <ProfileWeightChart data={chartData} />
          </div>
        </Suspense>
      </div>

      {/* Perímetros Corporales */}
      {(latest?.waist != null || latest?.arm != null || latest?.leg != null) && (
        <div className="border-border/80 bg-surface space-y-2.5 rounded-xl border p-3.5 shadow-2xs sm:p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Ruler className="text-brand h-4 w-4" />
              <h2 className="text-text text-sm font-semibold tracking-[-0.01em]">
                Perímetros Corporales
              </h2>
            </div>
            <span className="text-text-muted text-xs">Última medición</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="border-border/60 bg-surface rounded-xl border p-2.5 text-center sm:text-left">
              <p className="text-text-muted text-small flex items-center justify-center gap-1 font-semibold tracking-wider uppercase sm:justify-start">
                <Ruler className="text-brand h-3 w-3" />
                Cintura
              </p>
              <p className="text-text mt-0.5 text-lg font-bold tabular-nums sm:text-xl">
                {latest?.waist ?? '—'}{' '}
                {latest?.waist && <span className="text-text-muted text-xs font-normal">cm</span>}
              </p>
              {waistDelta != null && (
                <p
                  className={cn(
                    'text-small mt-0.5 font-semibold',
                    waistDelta < 0 ? 'text-success' : 'text-brand'
                  )}
                >
                  {waistDelta > 0 ? `+${waistDelta}` : waistDelta} cm
                </p>
              )}
            </div>

            <div className="border-border/60 bg-surface rounded-xl border p-2.5 text-center sm:text-left">
              <p className="text-text-muted text-small flex items-center justify-center gap-1 font-semibold tracking-wider uppercase sm:justify-start">
                <Ruler className="text-brand h-3 w-3" />
                Brazo
              </p>
              <p className="text-text mt-0.5 text-lg font-bold tabular-nums sm:text-xl">
                {latest?.arm ?? '—'}{' '}
                {latest?.arm && <span className="text-text-muted text-xs font-normal">cm</span>}
              </p>
              {armDelta != null && (
                <p
                  className={cn(
                    'text-small mt-0.5 font-semibold',
                    armDelta < 0 ? 'text-success' : 'text-brand'
                  )}
                >
                  {armDelta > 0 ? `+${armDelta}` : armDelta} cm
                </p>
              )}
            </div>

            <div className="border-border/60 bg-surface rounded-xl border p-2.5 text-center sm:text-left">
              <p className="text-text-muted text-small flex items-center justify-center gap-1 font-semibold tracking-wider uppercase sm:justify-start">
                <Ruler className="text-brand h-3 w-3" />
                Pierna
              </p>
              <p className="text-text mt-0.5 text-lg font-bold tabular-nums sm:text-xl">
                {latest?.leg ?? '—'}{' '}
                {latest?.leg && <span className="text-text-muted text-xs font-normal">cm</span>}
              </p>
              {legDelta != null && (
                <p
                  className={cn(
                    'text-small mt-0.5 font-semibold',
                    legDelta < 0 ? 'text-success' : 'text-brand'
                  )}
                >
                  {legDelta > 0 ? `+${legDelta}` : legDelta} cm
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Historial de Mediciones */}
      <div className="border-border/80 bg-surface space-y-2.5 rounded-xl border p-3.5 shadow-2xs sm:p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Calendar className="text-brand h-4 w-4" />
            <h2 className="text-text text-sm font-semibold tracking-[-0.01em]">
              Historial de mediciones
            </h2>
          </div>
          <span className="text-text-muted text-xs tabular-nums">
            {measurements.length} registro{measurements.length !== 1 ? 's' : ''}
          </span>
        </div>
        {measurements.length > 0 ? (
          <div className="divide-border/40 border-border/60 bg-surface divide-y overflow-hidden rounded-xl border">
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

              const deltaColor = delta
                ? delta < 0
                  ? 'text-success'
                  : 'text-brand'
                : 'text-text-muted';

              return (
                <div
                  key={m.id}
                  className="hover:bg-surface-raised/50 flex items-center justify-between p-3 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-text text-xs font-semibold whitespace-nowrap">
                        {format(new Date(m.date), 'dd MMM yyyy', { locale: es })}
                      </span>
                      {idx === 0 && (
                        <span className="bg-brand/10 text-brand py-0.2 text-small rounded-full px-1.5 font-bold">
                          Última
                        </span>
                      )}
                    </div>

                    {perimeters.length > 0 && (
                      <p className="text-text-muted text-small mt-0.5 truncate">
                        {perimeters.join(' · ')}
                      </p>
                    )}
                  </div>

                  <div className="ml-2 flex shrink-0 items-center gap-3">
                    <div className="text-right">
                      <p className="text-text text-sm font-bold tabular-nums">
                        {m.weight != null ? `${m.weight} kg` : '—'}
                        {delta != null && (
                          <span className={cn('text-small ml-1 font-semibold', deltaColor)}>
                            {delta > 0 ? `+${delta}` : delta}
                          </span>
                        )}
                      </p>
                      {m.body_fat_percentage != null && (
                        <p className="text-text-muted text-small">{m.body_fat_percentage}% grasa</p>
                      )}
                    </div>

                    <div className="flex items-center gap-0.5">
                      {onEditMeasurement && (
                        <button
                          type="button"
                          onClick={() => onEditMeasurement(m)}
                          className="text-text-muted hover:text-text cursor-pointer rounded-lg p-1.5 transition-colors"
                          title="Editar medición"
                        >
                          <svg
                            className="h-3.5 w-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5a2.121 2.121 0 0 1 3 3z" />
                          </svg>
                        </button>
                      )}

                      {onDeleteMeasurement && (
                        <button
                          type="button"
                          onClick={() => void handleDelete(m.id)}
                          disabled={deletingId === m.id}
                          className="text-text-muted hover:text-danger cursor-pointer rounded-lg p-1.5 transition-colors disabled:opacity-50"
                          title="Eliminar medición"
                        >
                          <svg
                            className="h-3.5 w-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
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
            <Scale className="text-text-muted mx-auto mb-2 h-7 w-7" />
            <p className="text-text text-sm font-semibold">Sin mediciones registradas</p>
            <p className="text-text-muted mt-0.5 text-xs">
              Registra tu primera medición de peso y medidas corporales.
            </p>
            <Button size="sm" onClick={onAddMeasurement} className="mt-3 gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              <span>Registrar ahora</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
