import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  AlertTriangle,
  Dumbbell,
  CalendarClock,
  CalendarDays,
  ChevronRight,
  MessageSquare,
  UtensilsCrossed,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTrainerStatsQuery } from '../../hooks/queries/useDashboardQuery';
import { useTrainerNutritionOverviewQuery } from '../../hooks/queries/useNutritionQuery';
import { Card, Badge, EmptyState, Button, PageHeader, Skeleton } from '../../components/ui';
import { usePageTitle } from '../../hooks/usePageTitle';
import { cn } from '../../lib/utils';
import { routePrefetchHandlers } from '../../lib/routePrefetch';

const TODAY_LIST_CAP = 5;

const SURFACE = 'border-zinc-200/70 bg-white/80 dark:border-zinc-800/80 dark:bg-zinc-900/50';

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
      <p className="text-[10px] font-medium tracking-wide text-zinc-500 uppercase lg:text-[11px] dark:text-zinc-400">
        {label}
      </p>
      {loading ? (
        <Skeleton className="mx-auto mt-1 h-7 w-9 lg:mx-0 lg:h-8 lg:w-10" />
      ) : (
        <p className="mt-0.5 text-xl font-bold text-zinc-900 tabular-nums sm:text-2xl lg:text-[1.75rem] dark:text-white">
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
      className="inline-flex h-9 shrink-0 touch-manipulation items-center gap-1.5 rounded-full border border-zinc-200/80 bg-white/60 px-3 text-[12px] font-semibold text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 lg:h-10 lg:px-3.5 lg:text-[13px] dark:border-zinc-700/80 dark:bg-zinc-900/40 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-900/70"
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
}

function formatCheckIn(iso?: string): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return null;
  }
}

function TodayPanel({
  loading,
  quiet,
  trainingToday,
  inactiveMembers,
}: {
  loading: boolean;
  quiet: boolean;
  trainingToday: MemberMini[];
  inactiveMembers: MemberMini[];
}) {
  return (
    <Card
      padding="sm"
      rounded="xl"
      className={cn(SURFACE, 'h-full lg:p-4', quiet && !loading ? 'py-3 lg:py-4' : undefined)}
    >
      <div className="mb-2.5 flex items-center justify-between gap-2 lg:mb-3">
        <h2 className="text-[13px] font-semibold text-zinc-900 lg:text-sm dark:text-white">Hoy</h2>
        {trainingToday.length > 0 ? (
          <Badge variant="success" className="text-[10px]">
            {trainingToday.length} en el gym
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
            <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
              En el gym · 0
            </p>
            <p className="mt-1 text-[12px] text-zinc-500 lg:text-[13px] dark:text-zinc-400">
              Nadie entrenando ahora
            </p>
          </div>
          <div className="border-t border-zinc-100 pt-3 sm:border-0 sm:pt-0 sm:pl-4 lg:pl-5 dark:border-zinc-800">
            <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
              Sin entrenar · ≥3d
            </p>
            <p className="mt-1 text-[12px] text-zinc-500 lg:text-[13px] dark:text-zinc-400">
              Sin alertas de inactividad
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-0 sm:divide-x sm:divide-zinc-100 dark:sm:divide-zinc-800">
          <div className="sm:pr-4 lg:pr-5">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
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
              <p className="text-[12px] text-zinc-500 dark:text-zinc-400">Nadie en el gym</p>
            ) : (
              <ul className="space-y-0.5">
                {trainingToday.slice(0, TODAY_LIST_CAP).map((m) => {
                  const checkIn = formatCheckIn(m.check_in_time);
                  return (
                    <li key={m.id} className="flex items-center gap-1">
                      <Link
                        to={`/members/${m.id}/routines`}
                        className="hover:text-brand flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg py-1.5 text-[12px] font-medium text-zinc-800 lg:py-2 lg:text-[13px] dark:text-zinc-200"
                      >
                        <span className="min-w-0 truncate">{m.full_name}</span>
                        {checkIn ? (
                          <span className="shrink-0 text-[10px] font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">
                            {checkIn}
                          </span>
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                        )}
                      </Link>
                      <Link
                        to={`/messages?member=${m.id}`}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                        aria-label={`Mensaje a ${m.full_name}`}
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-zinc-100 pt-3 sm:border-0 sm:pt-0 sm:pl-4 lg:pl-5 dark:border-zinc-800">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Sin entrenar · ≥3d
              </p>
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
              <p className="text-[12px] text-zinc-500 dark:text-zinc-400">
                Sin alertas de inactividad
              </p>
            ) : (
              <ul className="space-y-0.5">
                {inactiveMembers.slice(0, TODAY_LIST_CAP).map((m) => (
                  <li key={m.id} className="flex items-center gap-1">
                    <Link
                      to={`/members/${m.id}/history`}
                      className="hover:text-brand flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg py-1.5 text-[12px] font-medium text-zinc-800 lg:py-2 lg:text-[13px] dark:text-zinc-200"
                    >
                      <span className="truncate">{m.full_name}</span>
                      <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                        {m.days_since}d
                      </span>
                    </Link>
                    <Link
                      to={`/messages?member=${m.id}`}
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
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
      <h2 className="mb-2 px-0.5 text-[13px] font-semibold text-zinc-900 lg:mb-3 lg:text-sm dark:text-white">
        Actividad reciente
      </h2>
      {loading ? (
        <div
          className={cn('flex-1 space-y-0 overflow-hidden rounded-xl border p-3 lg:p-4', SURFACE)}
        >
          <Skeleton className="h-10 w-full" />
          <Skeleton className="mt-2 h-10 w-full" />
          <Skeleton className="mt-2 hidden h-10 w-full lg:block" />
        </div>
      ) : !activities?.length ? (
        <div className={cn('flex-1 rounded-xl border px-3 py-4 lg:px-4 lg:py-5', SURFACE)}>
          <p className="text-[12px] text-zinc-500 lg:text-[13px] dark:text-zinc-400">
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
        <ul className={cn('flex-1 overflow-hidden rounded-xl border', SURFACE)}>
          {activities.map((activity, i) => (
            <li key={`${activity.user_id}-${activity.start_time}`}>
              <Link
                to={`/members/${activity.user_id}/history`}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-zinc-50 lg:px-4 lg:py-3 dark:hover:bg-zinc-800/40',
                  i > 0 && 'border-t border-zinc-100/80 dark:border-zinc-800/80'
                )}
              >
                <Dumbbell className="text-brand h-3.5 w-3.5 shrink-0 lg:h-4 lg:w-4" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-zinc-900 dark:text-white">
                    {activity.full_name}
                  </p>
                  <p className="truncate text-[11px] text-zinc-500 lg:text-xs dark:text-zinc-400">
                    {activity.routine_name}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] font-medium text-zinc-400 tabular-nums lg:text-xs dark:text-zinc-500">
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
  const inactiveMembers = stats?.inactiveMembers ?? [];
  const withoutRoutines = stats?.membersWithoutRoutines ?? 0;
  const withoutNutritionPlan = nutritionOverview?.without_plan ?? 0;
  const firstName = user?.name?.split(/\s+/)[0] ?? 'entrenador';
  const loading = isPending && !stats;
  const todayQuiet = !loading && trainingToday.length === 0 && inactiveMembers.length === 0;

  if (isError) {
    return (
      <div className="page-stack-tight">
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
    <div className="page-stack-tight mx-auto w-full max-w-3xl lg:max-w-5xl xl:max-w-6xl">
      <PageHeader
        compact
        title={
          <>
            Hola, <span className="text-brand">{firstName}</span>
          </>
        }
        subtitle="Actividad con tus miembros"
        action={
          stats?.activeNow ? (
            <Badge variant="success">{stats.activeNow} en el gym</Badge>
          ) : undefined
        }
      />

      <div
        className={cn(
          'grid grid-cols-2 overflow-hidden rounded-xl border sm:grid-cols-4 sm:divide-x sm:divide-zinc-200/80 dark:sm:divide-zinc-800/80',
          SURFACE
        )}
      >
        <MetricCell label="Miembros" value={stats?.assignedMembers ?? 0} loading={loading} />
        <MetricCell label="En gym" value={stats?.activeNow ?? 0} loading={loading} />
        <div className="border-t border-zinc-200/80 sm:border-t-0 dark:border-zinc-800/80">
          <MetricCell label="Hoy" value={stats?.todayWorkouts ?? 0} loading={loading} />
        </div>
        <div className="border-t border-zinc-200/80 sm:border-t-0 dark:border-zinc-800/80">
          <MetricCell label="Sin rutina" value={withoutRoutines} loading={loading} />
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

      {(withoutRoutines > 0 ||
        withoutNutritionPlan > 0 ||
        (stats?.expiringMembers?.length ?? 0) > 0) && (
        <div className="space-y-1.5">
          <p className="px-0.5 text-[11px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            Atención
          </p>
          <div className="grid gap-1.5 lg:grid-cols-2 lg:gap-3">
            {withoutRoutines > 0 && (
              <Link
                to="/routines?view=calendar&assign=1"
                className="bg-brand/5 border-brand/20 hover:bg-brand/10 flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 transition-colors lg:px-4 lg:py-3"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-zinc-900 dark:text-white">
                    Sin rutina asignada
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {withoutRoutines} miembro{withoutRoutines !== 1 ? 's' : ''}
                  </p>
                </div>
                <ChevronRight className="text-brand h-4 w-4 shrink-0" />
              </Link>
            )}
            {withoutNutritionPlan > 0 && (
              <Link
                to="/nutrition-overview?filter=without"
                className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 transition-colors hover:bg-amber-500/10 lg:px-4 lg:py-3"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-zinc-900 dark:text-white">
                    Sin plan nutricional
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {withoutNutritionPlan} miembro{withoutNutritionPlan !== 1 ? 's' : ''}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              </Link>
            )}
            {(stats?.expiringMembers ?? []).map((m) => (
              <Link
                key={m.id}
                to={`/members/${m.id}/routines`}
                className="flex items-center justify-between gap-2 rounded-xl border border-red-500/15 bg-red-500/5 px-3 py-2.5 transition-colors hover:bg-red-500/10 lg:px-4 lg:py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-zinc-900 dark:text-white">
                    {m.full_name}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Membresía por vencer
                  </p>
                </div>
                <Badge variant="danger">{m.days_remaining}d</Badge>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Mobile: stack · Tablet+: Hoy + Actividad side by side */}
      <div className="grid gap-4 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] md:items-stretch md:gap-4 lg:gap-5">
        <TodayPanel
          loading={loading}
          quiet={todayQuiet}
          trainingToday={trainingToday}
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
