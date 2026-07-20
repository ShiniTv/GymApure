import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  AlertTriangle,
  Dumbbell,
  CalendarClock,
  CalendarDays,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTrainerStatsQuery } from '../../hooks/queries/useDashboardQuery';
import { Card, Badge, EmptyState, Button, PageHeader, Skeleton } from '../../components/ui';
import { usePageTitle } from '../../hooks/usePageTitle';
import { cn } from '../../lib/utils';
import { routePrefetchHandlers } from '../../lib/routePrefetch';

const TODAY_LIST_CAP = 5;

const LIGHT_CARD = 'border-zinc-200/70 bg-white/80 dark:border-zinc-800/80 dark:bg-zinc-900/50';

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
    <div className="min-w-0 px-2 py-2 text-center sm:px-3">
      <p className="text-[10px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
        {label}
      </p>
      {loading ? (
        <Skeleton className="mx-auto mt-1 h-6 w-8" />
      ) : (
        <p className="mt-0.5 text-lg font-bold text-zinc-900 tabular-nums sm:text-xl dark:text-white">
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
      className="inline-flex h-9 shrink-0 touch-manipulation items-center gap-1.5 rounded-full border border-zinc-200/80 bg-transparent px-3 text-[12px] font-semibold text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700/80 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-900/60"
    >
      <Icon className="text-brand h-3.5 w-3.5" aria-hidden />
      {label}
      {count != null && count > 0 ? (
        <span className="bg-brand/15 text-brand ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums">
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </Link>
  );
}

export default function TrainerDashboard() {
  usePageTitle('Panel');
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: trainerStats, isError, isPending, refetch } = useTrainerStatsQuery();

  const stats = trainerStats;
  const trainingToday = stats?.trainingToday ?? [];
  const inactiveMembers = stats?.inactiveMembers ?? [];
  const withoutRoutines = stats?.membersWithoutRoutines ?? 0;
  const firstName = user?.name?.split(/\s+/)[0] ?? 'entrenador';
  const loading = isPending && !stats;

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
    <div className="mx-auto w-full max-w-3xl space-y-5">
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

      {/* Metrics strip — one surface */}
      <div
        className={cn(
          'grid grid-cols-4 divide-x divide-zinc-200/80 overflow-hidden rounded-xl border dark:divide-zinc-800/80',
          LIGHT_CARD
        )}
      >
        <MetricCell label="Miembros" value={stats?.assignedMembers ?? 0} loading={loading} />
        <MetricCell label="En gym" value={stats?.activeNow ?? 0} loading={loading} />
        <MetricCell label="Hoy" value={stats?.todayWorkouts ?? 0} loading={loading} />
        <MetricCell label="Sin rutina" value={withoutRoutines} loading={loading} />
      </div>

      {/* Shortcuts as chips */}
      <div className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ShortcutChip to="/members" icon={Users} label="Miembros" count={stats?.assignedMembers} />
        <ShortcutChip
          to="/routines?view=calendar&assign=1"
          icon={CalendarClock}
          label="Asignar"
          count={withoutRoutines > 0 ? withoutRoutines : undefined}
        />
        <ShortcutChip to="/routines?view=calendar" icon={CalendarDays} label="Calendario" />
        <ShortcutChip to="/messages" icon={MessageSquare} label="Mensajes" />
      </div>

      {(withoutRoutines > 0 || (stats?.expiringMembers?.length ?? 0) > 0) && (
        <div className="space-y-1.5">
          <p className="px-0.5 text-[11px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            Atención
          </p>
          <div className="space-y-1.5">
            {withoutRoutines > 0 && (
              <Link
                to="/routines?view=calendar&assign=1"
                className="bg-brand/5 border-brand/20 hover:bg-brand/10 flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 transition-colors"
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
            {(stats?.expiringMembers ?? []).map((m) => (
              <Link
                key={m.id}
                to={`/members/${m.id}/routines`}
                className="flex items-center justify-between gap-2 rounded-xl border border-red-500/15 bg-red-500/5 px-3 py-2.5 transition-colors hover:bg-red-500/10"
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

      {/* Hoy — one card, two columns */}
      <Card padding="sm" rounded="xl" className={LIGHT_CARD}>
        <h2 className="mb-3 text-[13px] font-semibold text-zinc-900 dark:text-white">Hoy</h2>
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-0 sm:divide-x sm:divide-zinc-100 dark:sm:divide-zinc-800">
          <div className="sm:pr-4">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Entrenando · {trainingToday.length}
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
            {loading ? (
              <Skeleton className="h-10 w-full" />
            ) : trainingToday.length === 0 ? (
              <p className="text-[12px] leading-snug text-zinc-500 dark:text-zinc-400">
                Nadie de tus miembros está en el gym.
              </p>
            ) : (
              <ul className="space-y-1">
                {trainingToday.slice(0, TODAY_LIST_CAP).map((m) => (
                  <li key={m.id}>
                    <Link
                      to={`/members/${m.id}/routines`}
                      className="hover:text-brand flex items-center justify-between gap-2 py-1 text-[12px] font-medium text-zinc-800 dark:text-zinc-200"
                    >
                      <span className="truncate">{m.full_name}</span>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-zinc-100 pt-3 sm:border-0 sm:pt-0 sm:pl-4 dark:border-zinc-800">
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
            {loading ? (
              <Skeleton className="h-10 w-full" />
            ) : inactiveMembers.length === 0 ? (
              <p className="text-[12px] leading-snug text-zinc-500 dark:text-zinc-400">
                Todos entrenaron recientemente.
              </p>
            ) : (
              <ul className="space-y-1">
                {inactiveMembers.slice(0, TODAY_LIST_CAP).map((m) => (
                  <li key={m.id} className="flex items-center gap-1">
                    <Link
                      to={`/members/${m.id}/history`}
                      className="hover:text-brand flex min-w-0 flex-1 items-center justify-between gap-2 py-1 text-[12px] font-medium text-zinc-800 dark:text-zinc-200"
                    >
                      <span className="truncate">{m.full_name}</span>
                      <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                        {m.days_since}d
                      </span>
                    </Link>
                    <Link
                      to={`/messages?member=${m.id}`}
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
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
      </Card>

      {/* Actividad reciente */}
      <div>
        <h2 className="mb-2 px-0.5 text-[13px] font-semibold text-zinc-900 dark:text-white">
          Actividad reciente
        </h2>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ) : !stats?.recentActivities?.length ? (
          <p className="px-0.5 text-[12px] text-zinc-500 dark:text-zinc-400">
            Cuando entrenen, verás sus sesiones aquí.{' '}
            <button
              type="button"
              className="text-brand font-semibold underline-offset-2 hover:underline"
              onClick={() => navigate('/members')}
            >
              Ver miembros
            </button>
          </p>
        ) : (
          <ul className={cn('overflow-hidden rounded-xl border', LIGHT_CARD)}>
            {stats.recentActivities.map((activity, i) => (
              <li key={`${activity.user_id}-${activity.start_time}`}>
                <Link
                  to={`/members/${activity.user_id}/history`}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40',
                    i > 0 && 'border-t border-zinc-100/80 dark:border-zinc-800/80'
                  )}
                >
                  <Dumbbell className="text-brand h-3.5 w-3.5 shrink-0" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-zinc-900 dark:text-white">
                      {activity.full_name}
                    </p>
                    <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                      {activity.routine_name}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] font-medium text-zinc-400 tabular-nums dark:text-zinc-500">
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
    </div>
  );
}
