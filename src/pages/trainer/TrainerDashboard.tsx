import { Link, useNavigate } from 'react-router';
import {
  Users,
  AlertTriangle,
  Dumbbell,
  CalendarClock,
  CalendarDays,
  ChevronRight,
  MessageSquare,
  UtensilsCrossed,
  Radio,
  ClipboardCheck,
  HeartPulse,
  CreditCard,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTrainerStatsQuery } from '../../hooks/queries/useDashboardQuery';
import { useTrainerNutritionOverviewQuery } from '../../hooks/queries/useNutritionQuery';
import { Card, Badge, EmptyState, Button, PageHeader, Skeleton } from '../../components/ui';
import { usePageTitle } from '../../hooks/usePageTitle';
import { cn } from '../../lib/utils';
import { routePrefetchHandlers } from '../../lib/routePrefetch';

const TODAY_LIST_CAP = 5;

const SURFACE = 'border-border/80 bg-surface';

function MetricCell({
  label,
  value,
  loading,
}: {
  label: string;
  value: number;
  loading?: boolean;
}) {
  return (
    <div className="min-w-0 px-3 py-2.5 text-center sm:px-4 sm:py-3 lg:px-5 lg:py-4 lg:text-left">
      <p className="text-text-secondary text-[10px] font-medium tracking-wide uppercase lg:text-[11px]">
        {label}
      </p>
      {loading ? (
        <Skeleton className="mx-auto mt-1 h-7 w-9 lg:mx-0 lg:h-8 lg:w-10" />
      ) : (
        <p className="text-text mt-0.5 text-xl font-bold tabular-nums sm:text-2xl lg:text-[1.75rem]">
          {value}
        </p>
      )}
    </div>
  );
}

function ShortcutChip({
  to,
  icon: Icon,
  label,
  count,
}: {
  to: string;
  icon: typeof Users;
  label: string;
  count?: number;
}) {
  return (
    <Link
      to={to}
      {...routePrefetchHandlers(to)}
      className="rounded-pill bg-surface text-text-secondary hover:bg-surface-raised inline-flex h-10 shrink-0 touch-manipulation items-center gap-2 px-3.5 text-[12px] leading-snug font-medium transition-colors lg:h-11 lg:px-4 lg:text-[13px]"
    >
      <Icon className="text-brand h-3.5 w-3.5 lg:h-4 lg:w-4" aria-hidden />
      {label}
      {count != null && count > 0 ? (
        <span className="bg-brand/15 text-brand ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums">
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </Link>
  );
}

interface MemberMini {
  id: number;
  full_name: string;
  days_since?: number;
  check_in_time?: string;
  started_at?: string;
}

function formatCheckIn(iso?: string): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return null;
  }
}

function AttentionSummaryLink({
  to,
  icon: Icon,
  label,
  count,
  tone = 'brand',
}: {
  to: string;
  icon: typeof Users;
  label: string;
  count: number;
  tone?: 'brand' | 'amber' | 'violet' | 'sky' | 'rose' | 'red';
}) {
  const toneClass =
    tone === 'amber'
      ? 'border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-amber-700 dark:text-amber-300'
      : tone === 'violet'
        ? 'border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/10 text-violet-700 dark:text-violet-300'
        : tone === 'sky'
          ? 'border-sky-500/20 bg-sky-500/5 hover:bg-sky-500/10 text-sky-700 dark:text-sky-300'
          : tone === 'rose'
            ? 'border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-700 dark:text-rose-300'
            : tone === 'red'
              ? 'border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-700 dark:text-red-300'
              : 'bg-brand/5 border-brand/20 hover:bg-brand/10 text-brand';

  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-colors lg:px-3.5 lg:py-3',
        toneClass
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="text-text min-w-0 flex-1 truncate text-[12px] font-semibold lg:text-[13px]">
        {label}
      </span>
      <span className="text-[11px] font-bold tabular-nums">{count}</span>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
    </Link>
  );
}

function TodayPanel({
  loading,
  quiet,
  trainingToday,
  remoteTraining,
  inactiveMembers,
}: {
  loading: boolean;
  quiet: boolean;
  trainingToday: MemberMini[];
  remoteTraining: MemberMini[];
  inactiveMembers: MemberMini[];
}) {
  const trainingCount = trainingToday.length + remoteTraining.length;

  return (
    <Card
      padding="sm"
      rounded="xl"
      className={cn(SURFACE, 'h-full lg:p-4', quiet && !loading ? 'py-3 lg:py-4' : undefined)}
    >
      <div className="mb-2.5 flex items-center justify-between gap-2 lg:mb-3">
        <h2 className="text-text text-[13px] font-semibold lg:text-sm">Hoy</h2>
        {trainingCount > 0 ? (
          <Badge variant="success" className="text-[10px]">
            {trainingCount} entrenando
          </Badge>
        ) : null}
      </div>
      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : quiet ? (
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-0 sm:divide-x sm:divide-zinc-100 lg:gap-0 dark:sm:divide-zinc-800">
          <div className="sm:pr-4 lg:pr-5">
            <p className="text-text-secondary text-[11px] font-semibold">Entrenando · 0</p>
            <p className="text-text-secondary mt-1 text-[12px] lg:text-[13px]">
              Nadie en gym ni remoto
            </p>
          </div>
          <div className="border-border/60 border-t pt-3 sm:border-0 sm:pt-0 sm:pl-4 lg:pl-5">
            <p className="text-text-secondary text-[11px] font-semibold">Sin entrenar · ≥3d</p>
            <p className="text-text-secondary mt-1 text-[12px] lg:text-[13px]">
              Sin alertas de inactividad
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-0 sm:divide-x sm:divide-zinc-100 dark:sm:divide-zinc-800">
          <div className="space-y-3 sm:pr-4 lg:pr-5">
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="text-text-secondary text-[11px] font-semibold">
                  En el gym · {trainingToday.length}
                </p>
                {trainingToday.length > TODAY_LIST_CAP && (
                  <Link
                    to="/members"
                    className="text-brand text-[10px] font-semibold hover:underline"
                  >
                    Ver todos
                  </Link>
                )}
              </div>
              {trainingToday.length === 0 ? (
                <p className="text-text-secondary text-[12px]">Nadie en el gym</p>
              ) : (
                <ul className="space-y-0.5">
                  {trainingToday.slice(0, TODAY_LIST_CAP).map((m) => {
                    const checkIn = formatCheckIn(m.check_in_time);
                    return (
                      <li key={`gym-${m.id}`} className="flex items-center gap-1">
                        <Link
                          to={`/members/${m.id}/routines`}
                          className="hover:text-brand text-text flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg py-1.5 text-[12px] font-medium lg:py-2 lg:text-[13px]"
                        >
                          <span className="min-w-0 truncate">{m.full_name}</span>
                          {checkIn ? (
                            <span className="shrink-0 text-[10px] font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">
                              {checkIn}
                            </span>
                          ) : (
                            <ChevronRight className="text-text-muted h-3.5 w-3.5 shrink-0" />
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="text-text-secondary flex items-center gap-1 text-[11px] font-semibold">
                  <Radio className="h-3 w-3" aria-hidden />
                  Remoto · {remoteTraining.length}
                </p>
              </div>
              {remoteTraining.length === 0 ? (
                <p className="text-text-secondary text-[12px]">Nadie en remoto</p>
              ) : (
                <ul className="space-y-0.5">
                  {remoteTraining.slice(0, TODAY_LIST_CAP).map((m) => {
                    const started = formatCheckIn(m.started_at);
                    return (
                      <li key={`remote-${m.id}`}>
                        <Link
                          to={`/members/${m.id}/routines`}
                          className="hover:text-brand text-text flex min-w-0 items-center justify-between gap-2 rounded-lg py-1.5 text-[12px] font-medium lg:py-2 lg:text-[13px]"
                        >
                          <span className="min-w-0 truncate">{m.full_name}</span>
                          {started ? (
                            <span className="text-brand shrink-0 text-[10px] font-semibold tabular-nums">
                              {started}
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="border-border/60 border-t pt-3 sm:border-0 sm:pt-0 sm:pl-4 lg:pl-5">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <p className="text-text-secondary text-[11px] font-semibold">Sin entrenar · ≥3d</p>
              {inactiveMembers.length > TODAY_LIST_CAP && (
                <Link
                  to="/members"
                  className="text-brand text-[10px] font-semibold hover:underline"
                >
                  Ver todos
                </Link>
              )}
            </div>
            {inactiveMembers.length === 0 ? (
              <p className="text-text-secondary text-[12px]">Sin alertas de inactividad</p>
            ) : (
              <ul className="space-y-0.5">
                {inactiveMembers.slice(0, TODAY_LIST_CAP).map((m) => (
                  <li key={m.id} className="flex items-center gap-1">
                    <Link
                      to={`/members/${m.id}/routines`}
                      className="hover:text-brand text-text flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg py-1.5 text-[12px] font-medium lg:py-2 lg:text-[13px]"
                    >
                      <span className="min-w-0 truncate">{m.full_name}</span>
                      <span className="shrink-0 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                        {m.days_since}d
                      </span>
                    </Link>
                    <Link
                      to={`/messages?member=${m.id}`}
                      className="text-text-muted hover:bg-surface-overlay hover:text-text inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors"
                      aria-label={`Mensaje a ${m.full_name}`}
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

function ActivityPanel({
  loading,
  activities,
  onSeeMembers,
}: {
  loading: boolean;
  activities:
    | {
        user_id: number;
        full_name: string;
        routine_name: string;
        start_time: string;
      }[]
    | undefined;
  onSeeMembers: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <h2 className="text-text mb-2 px-0.5 text-[13px] font-semibold lg:mb-3 lg:text-sm">
        Actividad reciente
      </h2>
      {loading ? (
        <div className={cn('rounded-card p-ds-4 flex-1 space-y-0 overflow-hidden border', SURFACE)}>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="mt-2 h-10 w-full" />
          <Skeleton className="mt-2 hidden h-10 w-full lg:block" />
        </div>
      ) : !activities?.length ? (
        <div className={cn('rounded-card px-ds-4 py-ds-5 flex-1 border', SURFACE)}>
          <p className="text-text-secondary text-[12px] leading-relaxed lg:text-[13px]">
            Cuando entrenen, verás sus sesiones aquí.{' '}
            <button
              type="button"
              className="text-brand font-semibold underline-offset-2 hover:underline"
              onClick={onSeeMembers}
            >
              Ver miembros
            </button>
          </p>
        </div>
      ) : (
        <ul className={cn('rounded-card flex-1 overflow-hidden border', SURFACE)}>
          {activities.map((activity, i) => (
            <li key={`${activity.user_id}-${activity.start_time}`}>
              <Link
                to={`/members/${activity.user_id}/history`}
                className={cn(
                  'hover:bg-surface-raised/70 flex items-center gap-2.5 px-3 py-2.5 transition-colors lg:px-4 lg:py-3',
                  i > 0 && 'border-border/60 border-t'
                )}
              >
                <Dumbbell className="text-brand h-3.5 w-3.5 shrink-0 lg:h-4 lg:w-4" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-text truncate text-[13px] font-semibold">
                    {activity.full_name}
                  </p>
                  <p className="text-text-secondary truncate text-[11px] lg:text-xs">
                    {activity.routine_name}
                  </p>
                </div>
                <span className="text-text-muted shrink-0 text-[11px] font-medium tabular-nums lg:text-xs">
                  {new Date(activity.start_time).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function TrainerDashboard() {
  usePageTitle('Panel');
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: trainerStats, isError, isPending, refetch } = useTrainerStatsQuery();
  const { data: nutritionOverview } = useTrainerNutritionOverviewQuery(true);

  const stats = trainerStats;
  const trainingToday = stats?.trainingToday ?? [];
  const remoteTraining = stats?.remoteTrainingNow ?? [];
  const inactiveMembers = stats?.inactiveMembers ?? [];
  const withoutRoutines = stats?.membersWithoutRoutines ?? 0;
  const withoutNutritionPlan = nutritionOverview?.without_plan ?? 0;
  const withoutAssessmentCount = stats?.membersWithoutAssessment?.length ?? 0;
  const staleCheckinsCount = stats?.staleCheckins?.length ?? 0;
  const recoveryAlertsCount = stats?.recoveryAlerts?.length ?? 0;
  const expiringCount = stats?.expiringMembers?.length ?? 0;
  const remoteActive = stats?.remoteActiveNow ?? remoteTraining.length;
  const firstName = user?.name?.split(/\s+/)[0] ?? 'entrenador';
  const loading = isPending && !stats;
  const todayQuiet =
    !loading &&
    trainingToday.length === 0 &&
    remoteTraining.length === 0 &&
    inactiveMembers.length === 0;

  const hasAttention =
    withoutRoutines > 0 ||
    withoutNutritionPlan > 0 ||
    withoutAssessmentCount > 0 ||
    staleCheckinsCount > 0 ||
    recoveryAlertsCount > 0 ||
    expiringCount > 0;

  if (isError) {
    return (
      <div className="page-stack">
        <PageHeader
          compact
          title={
            <>
              Panel de <span className="text-brand">entrenador</span>
            </>
          }
        />
        <EmptyState
          icon={AlertTriangle}
          title="No se pudo cargar el panel"
          description="Revisa tu conexión e inténtalo de nuevo."
          action={
            <Button variant="secondary" size="sm" onClick={() => void refetch()}>
              Reintentar
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="page-stack mx-auto w-full max-w-3xl lg:max-w-5xl xl:max-w-6xl">
      <PageHeader
        compact
        title={
          <>
            Hola, <span className="text-brand">{firstName}</span>
          </>
        }
        subtitle="Actividad con tus miembros"
        action={
          stats?.activeNow || remoteActive ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {stats?.activeNow ? (
                <Badge variant="success">{stats.activeNow} en el gym</Badge>
              ) : null}
              {remoteActive > 0 ? <Badge variant="accent">{remoteActive} remoto</Badge> : null}
            </div>
          ) : undefined
        }
      />

      <div
        className={cn(
          'rounded-card bg-surface sm:divide-border/40 grid grid-cols-2 overflow-hidden sm:grid-cols-4 sm:divide-x',
          SURFACE
        )}
      >
        <MetricCell label="Miembros" value={stats?.assignedMembers ?? 0} loading={loading} />
        <MetricCell label="En gym" value={stats?.activeNow ?? 0} loading={loading} />
        <div className="border-border/60 border-t sm:border-t-0">
          <MetricCell label="Remoto" value={remoteActive} loading={loading} />
        </div>
        <div className="border-border/60 border-t sm:border-t-0">
          <MetricCell label="Hoy" value={stats?.todayWorkouts ?? 0} loading={loading} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pb-0.5">
        <ShortcutChip to="/members" icon={Users} label="Miembros" count={stats?.assignedMembers} />
        <ShortcutChip
          to="/routines?view=calendar&assign=1"
          icon={CalendarClock}
          label="Asignar"
          count={withoutRoutines > 0 ? withoutRoutines : undefined}
        />
        <ShortcutChip
          to="/nutrition-overview"
          icon={UtensilsCrossed}
          label="Nutrición"
          count={withoutNutritionPlan > 0 ? withoutNutritionPlan : undefined}
        />
        <ShortcutChip to="/routines?view=calendar" icon={CalendarDays} label="Calendario" />
        <ShortcutChip to="/messages" icon={MessageSquare} label="Mensajes" />
      </div>

      {hasAttention && (
        <div className="space-y-1.5">
          <p className="text-text-secondary px-0.5 text-[11px] font-semibold tracking-wide uppercase">
            Atención
          </p>
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {withoutRoutines > 0 && (
              <AttentionSummaryLink
                to="/routines?view=calendar&assign=1"
                icon={Dumbbell}
                label="Sin rutina"
                count={withoutRoutines}
              />
            )}
            {withoutNutritionPlan > 0 && (
              <AttentionSummaryLink
                to="/nutrition-overview?filter=without"
                icon={UtensilsCrossed}
                label="Sin nutrición"
                count={withoutNutritionPlan}
                tone="amber"
              />
            )}
            {withoutAssessmentCount > 0 && (
              <AttentionSummaryLink
                to="/members"
                icon={ClipboardCheck}
                label="Sin evaluación"
                count={withoutAssessmentCount}
                tone="violet"
              />
            )}
            {staleCheckinsCount > 0 && (
              <AttentionSummaryLink
                to="/members"
                icon={ClipboardCheck}
                label="Check-in semanal"
                count={staleCheckinsCount}
                tone="sky"
              />
            )}
            {recoveryAlertsCount > 0 && (
              <AttentionSummaryLink
                to="/members"
                icon={HeartPulse}
                label="Recuperación"
                count={recoveryAlertsCount}
                tone="rose"
              />
            )}
            {expiringCount > 0 && (
              <AttentionSummaryLink
                to="/members?expiring=true"
                icon={CreditCard}
                label="Membresía por vencer"
                count={expiringCount}
                tone="red"
              />
            )}
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] md:items-stretch md:gap-4 lg:gap-5">
        <TodayPanel
          loading={loading}
          quiet={todayQuiet}
          trainingToday={trainingToday}
          remoteTraining={remoteTraining}
          inactiveMembers={inactiveMembers}
        />
        <ActivityPanel
          loading={loading}
          activities={stats?.recentActivities}
          onSeeMembers={() => navigate('/members')}
        />
      </div>
    </div>
  );
}
