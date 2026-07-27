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
import {
  Card,
  Badge,
  EmptyState,
  Button,
  PageHeader,
  Skeleton,
  StatCard,
} from '../../components/ui';
import { DashboardSection } from '../../components/admin/DashboardSection';
import { StaffPortalBanner } from '../../components/StaffPortalBanner';
import { usePageTitle } from '../../hooks/usePageTitle';
import { cn } from '../../lib/utils';
import { routePrefetchHandlers } from '../../lib/routePrefetch';

const TODAY_LIST_CAP = 5;

const SURFACE = 'border-border/80 bg-surface';

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
      className="border-border/70 bg-surface text-text-secondary hover:bg-surface-raised inline-flex h-9 shrink-0 touch-manipulation items-center gap-2 rounded-[var(--radius-button)] border px-3 text-[12px] leading-snug font-medium transition-colors lg:text-[13px]"
    >
      <Icon className="text-brand h-3.5 w-3.5" aria-hidden />
      {label}
      {count != null && count > 0 ? (
        <span className="bg-brand/15 text-brand ml-0.5 rounded-[var(--radius-chip)] px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
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
        'flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 transition-colors lg:px-3.5',
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
    <DashboardSection
      title="Hoy"
      compact
      action={
        trainingCount > 0 ? (
          <Badge variant="success" className="text-[10px]">
            {trainingCount} entrenando
          </Badge>
        ) : null
      }
    >
      <Card
        padding="sm"
        rounded="xl"
        className={cn(SURFACE, quiet && !loading ? 'py-3' : undefined)}
      >
        {loading ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : quiet ? (
          <div className="sm:divide-border/60 grid gap-3 sm:grid-cols-2 sm:gap-0 sm:divide-x lg:gap-0">
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
          <div className="sm:divide-border/60 grid gap-4 sm:grid-cols-2 sm:gap-0 sm:divide-x">
            <div className="space-y-3 sm:pr-4 lg:pr-5">
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <p className="text-text-secondary text-[11px] font-semibold">
                    En el gym · {trainingToday.length}
                  </p>
                  {trainingToday.length > TODAY_LIST_CAP && (
                    <Link
                      to="/members"
                      className="text-brand inline-flex min-h-11 items-center text-[10px] font-semibold hover:underline"
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
                            className="hover:text-brand text-text flex min-h-11 min-w-0 flex-1 items-center justify-between gap-2 rounded-md py-1.5 text-[12px] font-medium lg:text-[13px]"
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
                            className="hover:text-brand text-text flex min-h-11 min-w-0 items-center justify-between gap-2 rounded-md py-1.5 text-[12px] font-medium lg:text-[13px]"
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
                    className="text-brand inline-flex min-h-11 items-center text-[10px] font-semibold hover:underline"
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
                        className="hover:text-brand text-text flex min-h-11 min-w-0 flex-1 items-center justify-between gap-2 rounded-md py-1.5 text-[12px] font-medium lg:text-[13px]"
                      >
                        <span className="min-w-0 truncate">{m.full_name}</span>
                        <span className="shrink-0 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                          {m.days_since}d
                        </span>
                      </Link>
                      <Link
                        to={`/messages?member=${m.id}`}
                        className="text-text-muted hover:bg-surface-overlay hover:text-text inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md transition-colors"
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
    </DashboardSection>
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
    <DashboardSection title="Actividad reciente" compact>
      {loading ? (
        <div
          className={cn(
            'space-y-2 overflow-hidden rounded-[var(--radius-card)] border p-3',
            SURFACE
          )}
        >
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="hidden h-10 w-full lg:block" />
        </div>
      ) : !activities?.length ? (
        <div className={cn('rounded-[var(--radius-card)] border px-3 py-4', SURFACE)}>
          <p className="text-text-secondary text-[12px] leading-relaxed lg:text-[13px]">
            Cuando entrenen, verás sus sesiones aquí.{' '}
            <button
              type="button"
              className="text-brand inline font-semibold underline-offset-2 hover:underline"
              onClick={onSeeMembers}
            >
              Ver miembros
            </button>
          </p>
        </div>
      ) : (
        <ul className={cn('overflow-hidden rounded-[var(--radius-card)] border', SURFACE)}>
          {activities.map((activity, i) => (
            <li key={`${activity.user_id}-${activity.start_time}`}>
              <Link
                to={`/members/${activity.user_id}/history`}
                className={cn(
                  'hover:bg-surface-raised/70 flex items-center gap-2.5 px-3 py-2.5 transition-colors',
                  i > 0 && 'border-border/60 border-t'
                )}
              >
                <Dumbbell className="text-brand h-3.5 w-3.5 shrink-0" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-text truncate text-[13px] font-semibold">
                    {activity.full_name}
                  </p>
                  <p className="text-text-secondary truncate text-[11px]">
                    {activity.routine_name}
                  </p>
                </div>
                <span className="text-text-muted shrink-0 text-[11px] font-medium tabular-nums">
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
    </DashboardSection>
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
      <div className="page-stack-tight mx-auto w-full max-w-7xl">
        <PageHeader compact title="Panel de entrenador" />
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
    <div className="page-stack-tight mx-auto w-full max-w-7xl">
      <StaffPortalBanner
        eyebrow="Panel de entrenador"
        title={
          <>
            Hola, <span className="text-brand">{firstName}</span>
          </>
        }
        subtitle="Actividad y seguimiento con tus miembros"
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

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[70px] rounded-lg" />
          ))
        ) : (
          <>
            <StatCard minimal title="Miembros" value={stats?.assignedMembers ?? 0} icon={Users} />
            <StatCard minimal title="En gym" value={stats?.activeNow ?? 0} icon={Dumbbell} />
            <StatCard minimal title="Remoto" value={remoteActive} icon={Radio} />
            <StatCard minimal title="Hoy" value={stats?.todayWorkouts ?? 0} icon={CalendarDays} />
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
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
        <ShortcutChip to="/pt-billing" icon={CreditCard} label="Cobros PT" />
        <ShortcutChip to="/messages" icon={MessageSquare} label="Mensajes" />
      </div>

      {hasAttention && (
        <DashboardSection title="Requiere atención" compact>
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
        </DashboardSection>
      )}

      <div className="grid gap-4 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] md:items-start md:gap-4">
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
