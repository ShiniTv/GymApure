import { Link, useNavigate } from 'react-router';
import {
  Users,
  AlertTriangle,
  Dumbbell,
  ChevronRight,
  MessageSquare,
  UtensilsCrossed,
  Radio,
  ClipboardCheck,
  HeartPulse,
  CreditCard,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  useTrainerStatsQuery,
  useTrainerAppointmentsQuery,
} from '../../hooks/queries/useDashboardQuery';
import { useTrainerNutritionOverviewQuery } from '../../hooks/queries/useNutritionQuery';
import { Card, Badge, EmptyState, Button, Skeleton } from '../../components/ui';
import { OperateHeader, OperatePage } from '../../components/operate/OperateChrome';
import { DashboardSection } from '../../components/admin/DashboardSection';
import { usePageTitle } from '../../hooks/usePageTitle';
import { cn } from '../../lib/utils';
import { typography } from '../../lib/typography';
import { routePrefetchHandlers } from '../../lib/routePrefetch';

const TODAY_LIST_CAP = 5;
const SURFACE = 'border-border/80 bg-surface';

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

function isSameLocalDay(iso: string, now = new Date()) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

type AttentionTone = 'neutral' | 'urgent' | 'warn';

function AttentionRow({
  to,
  icon: Icon,
  label,
  count,
  tone = 'neutral',
}: {
  to: string;
  icon: typeof Users;
  label: string;
  count: number;
  tone?: AttentionTone;
}) {
  return (
    <Link
      to={to}
      {...routePrefetchHandlers(to)}
      className="tap-feedback group border-border/60 hover:bg-surface-raised/80 flex min-h-[var(--touch-min)] items-center gap-3 border-b px-3 py-2.5 transition-colors last:border-b-0"
    >
      <Icon
        className={cn(
          'operate-icon h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-105',
          tone === 'urgent' && 'text-danger',
          tone === 'warn' && 'text-warning',
          tone === 'neutral' && 'text-text-muted'
        )}
        aria-hidden
      />
      <span className="text-text min-w-0 flex-1 truncate text-sm font-medium tracking-[-0.011em]">
        {label}
      </span>
      <span
        className={cn(
          typography.statValueSm,
          'text-base',
          tone === 'urgent' && 'text-danger',
          tone === 'warn' && 'text-warning'
        )}
      >
        {count}
      </span>
      <ChevronRight
        className="operate-icon text-text-muted h-4 w-4 shrink-0 opacity-60 transition-transform duration-200 group-hover:translate-x-0.5"
        aria-hidden
      />
    </Link>
  );
}

function MetricCell({
  to,
  label,
  value,
  loading,
}: {
  to: string;
  label: string;
  value: number;
  loading?: boolean;
}) {
  return (
    <Link
      to={to}
      {...routePrefetchHandlers(to)}
      className="tap-feedback hover:bg-surface-raised/60 flex min-h-[var(--touch-min)] flex-col items-center justify-center gap-0.5 px-1 py-2.5 transition-colors"
      aria-label={`${label}: ${value}`}
    >
      {loading ? (
        <Skeleton className="h-5 w-8" />
      ) : (
        <span className={typography.statValueSm}>{value}</span>
      )}
      <span className={typography.statLabel}>{label}</span>
    </Link>
  );
}

function TodayPanel({
  loading,
  quiet,
  trainingToday,
  remoteTraining,
  inactiveMembers,
  todaysAppointments,
  appointmentsLoading,
}: {
  loading: boolean;
  quiet: boolean;
  trainingToday: MemberMini[];
  remoteTraining: MemberMini[];
  inactiveMembers: MemberMini[];
  todaysAppointments: {
    id: number;
    member_id: number;
    member_name?: string;
    starts_at: string;
    status: string;
  }[];
  appointmentsLoading: boolean;
}) {
  const trainingCount = trainingToday.length + remoteTraining.length;

  return (
    <DashboardSection
      title="Hoy"
      compact
      action={
        <div className="flex items-center gap-2">
          {trainingCount > 0 ? (
            <Badge variant="success" className="text-small">
              {trainingCount} entrenando
            </Badge>
          ) : null}
          <Link
            to="/routines?view=calendar"
            {...routePrefetchHandlers('/routines?view=calendar')}
            className="text-brand text-small inline-flex min-h-11 items-center font-semibold hover:underline"
          >
            Agenda
          </Link>
        </div>
      }
    >
      <Card
        padding="sm"
        rounded="xl"
        className={cn(SURFACE, quiet && !loading ? 'py-3' : undefined)}
      >
        <div className="border-border/60 mb-3 border-b pb-3">
          <p className="text-text-secondary text-small mb-1.5 font-semibold">
            Sesiones 1:1 · {appointmentsLoading ? '…' : todaysAppointments.length}
          </p>
          {appointmentsLoading ? (
            <Skeleton className="h-8 w-full" />
          ) : todaysAppointments.length === 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-text-secondary text-small">No hay sesiones 1:1 hoy</p>
              <Link
                to="/routines?view=calendar"
                {...routePrefetchHandlers('/routines?view=calendar')}
                className="text-brand text-small inline-flex min-h-11 items-center font-semibold hover:underline"
              >
                Agendar
              </Link>
            </div>
          ) : (
            <ul className="space-y-0.5">
              {todaysAppointments.slice(0, TODAY_LIST_CAP).map((appointment) => (
                <li key={appointment.id}>
                  <Link
                    to={`/members/${appointment.member_id}/routines?tab=agenda`}
                    className="hover:text-brand text-text text-small flex min-h-11 min-w-0 items-center justify-between gap-2 rounded-md py-1.5 font-medium lg:text-sm"
                  >
                    <span className="min-w-0 truncate">
                      {appointment.member_name ?? `Miembro ${appointment.member_id}`}
                    </span>
                    <span className="text-brand text-small shrink-0 font-semibold tabular-nums">
                      {formatCheckIn(appointment.starts_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        {loading ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : quiet ? (
          <div className="sm:divide-border/60 grid gap-3 sm:grid-cols-2 sm:gap-0 sm:divide-x">
            <div className="sm:pr-4 lg:pr-5">
              <p className="text-text-secondary text-small font-semibold">Entrenando · 0</p>
              <p className="text-text-secondary text-small mt-1 lg:text-sm">
                Nadie en gym ni remoto
              </p>
            </div>
            <div className="border-border/60 border-t pt-3 sm:border-0 sm:pt-0 sm:pl-4 lg:pl-5">
              <p className="text-text-secondary text-small font-semibold">Sin entrenar · ≥3d</p>
              <p className="text-text-secondary text-small mt-1 lg:text-sm">
                Sin alertas de inactividad
              </p>
            </div>
          </div>
        ) : (
          <div className="sm:divide-border/60 grid gap-4 sm:grid-cols-2 sm:gap-0 sm:divide-x">
            <div className="space-y-3 sm:pr-4 lg:pr-5">
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <p className="text-text-secondary text-small font-semibold">
                    En el gym · {trainingToday.length}
                  </p>
                  {trainingToday.length > TODAY_LIST_CAP && (
                    <Link
                      to="/members"
                      className="text-brand text-small inline-flex min-h-11 items-center font-semibold hover:underline"
                    >
                      Ver todos
                    </Link>
                  )}
                </div>
                {trainingToday.length === 0 ? (
                  <p className="text-text-secondary text-small">Nadie en el gym</p>
                ) : (
                  <ul className="space-y-0.5">
                    {trainingToday.slice(0, TODAY_LIST_CAP).map((m) => {
                      const checkIn = formatCheckIn(m.check_in_time);
                      return (
                        <li key={`gym-${m.id}`}>
                          <Link
                            to={`/members/${m.id}/routines`}
                            className="hover:text-brand text-text text-small flex min-h-11 min-w-0 items-center justify-between gap-2 rounded-md py-1.5 font-medium lg:text-sm"
                          >
                            <span className="min-w-0 truncate">{m.full_name}</span>
                            {checkIn ? (
                              <span className="text-small shrink-0 font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">
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
                  <p className="text-text-secondary text-small flex items-center gap-1 font-semibold">
                    <Radio className="h-3 w-3" aria-hidden />
                    Remoto · {remoteTraining.length}
                  </p>
                </div>
                {remoteTraining.length === 0 ? (
                  <p className="text-text-secondary text-small">Nadie en remoto</p>
                ) : (
                  <ul className="space-y-0.5">
                    {remoteTraining.slice(0, TODAY_LIST_CAP).map((m) => {
                      const started = formatCheckIn(m.started_at);
                      return (
                        <li key={`remote-${m.id}`}>
                          <Link
                            to={`/members/${m.id}/routines`}
                            className="hover:text-brand text-text text-small flex min-h-11 min-w-0 items-center justify-between gap-2 rounded-md py-1.5 font-medium lg:text-sm"
                          >
                            <span className="min-w-0 truncate">{m.full_name}</span>
                            {started ? (
                              <span className="text-brand text-small shrink-0 font-semibold tabular-nums">
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
                <p className="text-text-secondary text-small font-semibold">Sin entrenar · ≥3d</p>
                {inactiveMembers.length > TODAY_LIST_CAP && (
                  <Link
                    to="/members"
                    className="text-brand text-small inline-flex min-h-11 items-center font-semibold hover:underline"
                  >
                    Ver todos
                  </Link>
                )}
              </div>
              {inactiveMembers.length === 0 ? (
                <p className="text-text-secondary text-small">Sin alertas de inactividad</p>
              ) : (
                <ul className="space-y-0.5">
                  {inactiveMembers.slice(0, TODAY_LIST_CAP).map((m) => (
                    <li key={m.id} className="flex items-center gap-1">
                      <Link
                        to={`/members/${m.id}/routines`}
                        className="hover:text-brand text-text text-small flex min-h-11 min-w-0 flex-1 items-center justify-between gap-2 rounded-md py-1.5 font-medium lg:text-sm"
                      >
                        <span className="min-w-0 truncate">{m.full_name}</span>
                        <span className="text-small shrink-0 font-semibold text-amber-600 dark:text-amber-400">
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
          <p className="text-text-secondary text-small leading-relaxed lg:text-sm">
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
                  <p className="text-text truncate text-sm font-semibold">{activity.full_name}</p>
                  <p className="text-text-secondary text-small truncate">{activity.routine_name}</p>
                </div>
                <span className="text-text-muted text-small shrink-0 font-medium tabular-nums">
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
  const { data: appointments = [], isPending: appointmentsPending } =
    useTrainerAppointmentsQuery(true);

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
  const todaysAppointments = (appointments ?? []).filter(
    (appointment) => appointment.status === 'scheduled' && isSameLocalDay(appointment.starts_at)
  );
  const todayQuiet =
    !loading &&
    trainingToday.length === 0 &&
    remoteTraining.length === 0 &&
    inactiveMembers.length === 0 &&
    todaysAppointments.length === 0;

  const memberChoicesCount = stats?.memberChoices?.length ?? 0;
  const attentionItems = [
    staleCheckinsCount > 0 && {
      key: 'checkin',
      to: '/members?needs=checkin',
      icon: ClipboardCheck,
      label: 'Seguimiento semanal',
      count: staleCheckinsCount,
      tone: 'neutral' as const,
      group: 'hoy' as const,
    },
    recoveryAlertsCount > 0 && {
      key: 'recovery',
      to: '/members?needs=recovery',
      icon: HeartPulse,
      label: 'Recuperación',
      count: recoveryAlertsCount,
      tone: 'urgent' as const,
      group: 'hoy' as const,
    },
    expiringCount > 0 && {
      key: 'expiring',
      to: '/members?expiring=true',
      icon: CreditCard,
      label: 'Membresía por vencer',
      count: expiringCount,
      tone: 'urgent' as const,
      group: 'hoy' as const,
    },
    withoutRoutines > 0 && {
      key: 'routines',
      to: '/routines?view=calendar&assign=1',
      icon: Dumbbell,
      label: 'Sin rutina',
      count: withoutRoutines,
      tone: 'neutral' as const,
      group: 'plan' as const,
    },
    withoutNutritionPlan > 0 && {
      key: 'nutrition',
      to: '/nutrition-overview?filter=without',
      icon: UtensilsCrossed,
      label: 'Sin nutrición',
      count: withoutNutritionPlan,
      tone: 'warn' as const,
      group: 'plan' as const,
    },
    withoutAssessmentCount > 0 && {
      key: 'assessment',
      to: '/members?needs=assessment',
      icon: ClipboardCheck,
      label: 'Sin evaluación',
      count: withoutAssessmentCount,
      tone: 'neutral' as const,
      group: 'plan' as const,
    },
    memberChoicesCount > 0 && {
      key: 'choices',
      to: '/members?needs=choices',
      icon: ClipboardCheck,
      label: 'Elecciones del cliente',
      count: memberChoicesCount,
      tone: 'neutral' as const,
      group: 'plan' as const,
    },
  ].filter(Boolean) as {
    key: string;
    to: string;
    icon: typeof Users;
    label: string;
    count: number;
    tone: AttentionTone;
    group: 'hoy' | 'plan';
  }[];

  const attentionTotal = attentionItems.reduce((sum, item) => sum + item.count, 0);
  const hasAttention = attentionItems.length > 0;
  const hoyItems = attentionItems.filter((i) => i.group === 'hoy');
  const planItems = attentionItems.filter((i) => i.group === 'plan');

  if (isError) {
    return (
      <OperatePage>
        <OperateHeader icon={HeartPulse} title="Panel de entrenador" />
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
      </OperatePage>
    );
  }

  return (
    <OperatePage>
      <OperateHeader
        icon={HeartPulse}
        title={
          <>
            Hola, <span className={typography.pageTitleAccent}>{firstName}</span>
          </>
        }
        subtitle={
          hasAttention
            ? `${attentionTotal} pendiente${attentionTotal === 1 ? '' : 's'} por resolver`
            : 'Tu día con miembros'
        }
        action={
          (stats?.activeNow || remoteActive > 0) && !loading ? (
            <>
              {stats?.activeNow ? (
                <Badge variant="success">{stats.activeNow} en el gym</Badge>
              ) : null}
              {remoteActive > 0 ? <Badge variant="accent">{remoteActive} remoto</Badge> : null}
            </>
          ) : undefined
        }
      />

      <section aria-labelledby="trainer-attention-heading" className="space-y-2">
        <div className="flex min-h-8 items-center justify-between gap-3">
          <h2
            id="trainer-attention-heading"
            className="text-text text-sm font-semibold tracking-[-0.01em]"
          >
            Requiere atención
          </h2>
          {hasAttention ? (
            <span className="text-text-muted text-small tabular-nums">{attentionTotal}</span>
          ) : null}
        </div>

        {loading ? (
          <div className={cn('overflow-hidden rounded-[var(--radius-card)] border', SURFACE)}>
            <Skeleton className="h-11 w-full rounded-none" />
            <Skeleton className="h-11 w-full rounded-none" />
            <Skeleton className="h-11 w-full rounded-none" />
          </div>
        ) : hasAttention ? (
          <div className={cn('group overflow-hidden rounded-[var(--radius-card)] border', SURFACE)}>
            {hoyItems.length > 0 ? (
              <div>
                <p className="text-text-muted text-small border-border/60 border-b px-3 py-2 font-medium">
                  Hoy
                </p>
                {hoyItems.map((item) => (
                  <AttentionRow
                    key={item.key}
                    to={item.to}
                    icon={item.icon}
                    label={item.label}
                    count={item.count}
                    tone={item.tone}
                  />
                ))}
              </div>
            ) : null}
            {planItems.length > 0 ? (
              <div>
                <p
                  className={cn(
                    'text-text-muted text-small border-border/60 px-3 py-2 font-medium',
                    hoyItems.length > 0 ? 'border-t border-b' : 'border-b'
                  )}
                >
                  Pendiente de plan
                </p>
                {planItems.map((item) => (
                  <AttentionRow
                    key={item.key}
                    to={item.to}
                    icon={item.icon}
                    label={item.label}
                    count={item.count}
                    tone={item.tone}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div
            className={cn(
              'flex items-start gap-3 rounded-[var(--radius-card)] border px-3 py-3.5',
              SURFACE
            )}
          >
            <CheckCircle2 className="text-success mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div className="min-w-0">
              <p className="text-text text-sm font-medium tracking-[-0.011em]">Todo al día</p>
              <p className="text-text-secondary text-small mt-0.5 leading-relaxed">
                Sin seguimientos ni planes pendientes.{' '}
                <Link
                  to="/members"
                  {...routePrefetchHandlers('/members')}
                  className="text-brand font-semibold underline-offset-2 hover:underline"
                >
                  Ver miembros
                </Link>
              </p>
            </div>
          </div>
        )}
      </section>

      <div
        className={cn(
          'grid grid-cols-4 divide-x divide-[color:var(--color-border)] overflow-hidden rounded-[var(--radius-card)] border',
          SURFACE
        )}
      >
        <MetricCell
          to="/members"
          label="Miembros"
          value={stats?.assignedMembers ?? 0}
          loading={loading}
        />
        <MetricCell to="/members" label="En gym" value={stats?.activeNow ?? 0} loading={loading} />
        <MetricCell to="/members" label="Remoto" value={remoteActive} loading={loading} />
        <MetricCell
          to="/routines?view=calendar"
          label="Hoy"
          value={stats?.todayWorkouts ?? 0}
          loading={loading}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] md:items-start md:gap-3">
        <TodayPanel
          loading={loading}
          quiet={todayQuiet}
          trainingToday={trainingToday}
          remoteTraining={remoteTraining}
          inactiveMembers={inactiveMembers}
          todaysAppointments={todaysAppointments}
          appointmentsLoading={appointmentsPending && appointments.length === 0}
        />
        <ActivityPanel
          loading={loading}
          activities={stats?.recentActivities}
          onSeeMembers={() => navigate('/members')}
        />
      </div>
    </OperatePage>
  );
}
