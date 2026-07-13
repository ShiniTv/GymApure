import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  Activity,
  Clock,
  TrendingUp,
  AlertTriangle,
  Dumbbell,
  CalendarClock,
  BookOpen,
  UtensilsCrossed,
  ChevronRight,
} from 'lucide-react';
import { QuickAction } from '../../components/admin/QuickAction';
import { DashboardSection } from '../../components/admin/DashboardSection';
import { useTrainerStatsQuery } from '../../hooks/queries/useDashboardQuery';
import { StatCard, Card, PageHeader, Badge, EmptyState, Button } from '../../components/ui';
import { usePageTitle } from '../../hooks/usePageTitle';

export default function TrainerDashboard() {
  usePageTitle('Panel');
  const navigate = useNavigate();
  const { data: trainerStats } = useTrainerStatsQuery();

  const stats = trainerStats;
  const withoutRoutines = trainerStats?.membersWithoutRoutines ?? 0;
  const expiringMembers = trainerStats?.expiringMembers ?? [];
  const trainerHasAlerts = withoutRoutines > 0 || expiringMembers.length > 0;

  return (
    <div className="page-stack-tight">
      <PageHeader
        compact
        title={
          <>
            Control de <span className="text-brand">entrenamiento</span>
          </>
        }
        subtitle="Actividad con tus miembros"
        badge={stats?.activeNow ? `${stats.activeNow} de mis miembros en el gym` : undefined}
      />

      {trainerHasAlerts && (
        <Card padding="sm" rounded="xl" className="border-brand/30 bg-brand/5">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="text-brand mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-zinc-900 dark:text-white">Atención requerida</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {withoutRoutines > 0 && (
                  <Link
                    to="/routines?view=calendar&assign=1"
                    className="bg-brand/10 text-brand dark:text-brand hover:bg-brand/15 inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-semibold"
                  >
                    {withoutRoutines} sin rutina activa
                  </Link>
                )}
                {expiringMembers.length > 0 && (
                  <Link
                    to="/members?expiring=true"
                    className="inline-flex items-center rounded-lg bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-500/15 dark:text-red-400"
                  >
                    {expiringMembers.length} por vencer
                  </Link>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      <DashboardSection title="Tu actividad" icon={Activity} compact>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <StatCard
            compact
            title="Mis miembros"
            value={stats?.assignedMembers || 0}
            icon={Users}
            color="blue"
          />
          <StatCard
            compact
            title="En el gym"
            value={stats?.activeNow || 0}
            icon={Activity}
            color="orange"
          />
          <StatCard
            compact
            title="Sesiones hoy"
            value={stats?.todayWorkouts || 0}
            icon={Clock}
            color="emerald"
          />
          <StatCard
            compact
            title="Rutinas creadas"
            value={stats?.routinesCreated || 0}
            icon={TrendingUp}
            color="blue"
          />
        </div>
      </DashboardSection>

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
        <QuickAction
          compact
          iconOnlyMobile
          to="/members"
          icon={Users}
          title="Miembros"
          description="Ver todos los miembros activos"
          count={stats?.assignedMembers || 0}
          tone="blue"
        />
        <QuickAction
          compact
          iconOnlyMobile
          to="/routines?view=calendar&assign=1"
          icon={CalendarClock}
          title="Asignar"
          description="Asignar rutina a un miembro"
          tone="emerald"
        />
        <QuickAction
          compact
          iconOnlyMobile
          to="/routines"
          icon={Dumbbell}
          title="Rutinas"
          description="Crear y editar rutinas"
          count={stats?.routinesCreated || 0}
          tone="orange"
        />
        <QuickAction
          compact
          iconOnlyMobile
          to="/exercises"
          icon={BookOpen}
          title="Ejercicios"
          description="Catálogo de movimientos"
          tone="blue"
        />
      </div>

      <div className="grid max-w-md grid-cols-2 gap-2 sm:gap-3">
        <QuickAction
          compact
          iconOnlyMobile
          to="/routines?view=calendar"
          icon={CalendarClock}
          title="Calendario"
          description="Vista mensual"
          tone="blue"
        />
        <QuickAction
          compact
          iconOnlyMobile
          to="/members"
          icon={UtensilsCrossed}
          title="Nutrición"
          description="Selecciona un miembro"
          tone="emerald"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
        <Card padding="sm" rounded="xl">
          <h3 className="mb-3 text-sm font-bold text-zinc-900 dark:text-white">
            Actividad reciente
          </h3>
          <div className="scroll-area max-h-72 space-y-0">
            {stats?.recentActivities?.map((activity, i) => (
              <Link
                key={i}
                to={`/members/${activity.user_id}/history`}
                className="flex items-center gap-3 rounded-lg border-b border-zinc-100 px-1 py-2.5 transition-colors last:border-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/30"
              >
                <div className="relative shrink-0">
                  <div className="bg-brand/10 text-brand flex h-9 w-9 items-center justify-center rounded-lg">
                    <Dumbbell className="h-4 w-4" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                    {activity.full_name}
                  </p>
                  <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {activity.routine_name}
                  </p>
                </div>
                <div className="flex shrink-0 items-center rounded-lg bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
                  <Clock className="text-brand mr-1 h-3.5 w-3.5" />
                  {new Date(activity.start_time).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </Link>
            ))}
            {(!stats?.recentActivities || stats.recentActivities.length === 0) && (
              <EmptyState
                icon={Activity}
                title="Sin actividad reciente"
                description="Cuando tus miembros empiecen a entrenar, verás sus sesiones aquí."
                action={
                  <Button variant="secondary" size="sm" onClick={() => navigate('/members')}>
                    Ver miembros
                  </Button>
                }
              />
            )}
          </div>
        </Card>

        <Card padding="sm" rounded="xl">
          <h3 className="mb-3 text-sm font-bold text-zinc-900 dark:text-white">
            Atención requerida
          </h3>
          <div className="space-y-2">
            {(trainerStats?.membersWithoutRoutines ?? 0) > 0 && (
              <Link
                to="/routines?view=calendar&assign=1"
                className="bg-brand/5 border-brand/20 hover:bg-brand/10 flex items-center justify-between rounded-xl border p-3 transition-colors"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="bg-brand/10 shrink-0 rounded-lg p-1.5">
                    <Users className="text-brand h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-zinc-900 sm:text-sm dark:text-white">
                      Sin rutina asignada
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {trainerStats!.membersWithoutRoutines} miembro
                      {trainerStats!.membersWithoutRoutines !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <ChevronRight className="text-brand h-4 w-4 shrink-0" />
              </Link>
            )}

            {(trainerStats?.expiringMembers ?? []).map((m) => (
              <Link
                key={m.id}
                to={`/members/${m.id}/routines`}
                className="flex items-center justify-between rounded-xl border border-red-500/15 bg-red-500/5 p-3 transition-colors hover:bg-red-500/10"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="shrink-0 rounded-lg bg-red-500/10 p-1.5">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-zinc-900 sm:text-sm dark:text-white">
                      {m.full_name}
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Membresía por vencer
                    </p>
                  </div>
                </div>
                <Badge variant="danger">{m.days_remaining}d</Badge>
              </Link>
            ))}

            {(trainerStats?.membersWithoutRoutines ?? 0) === 0 &&
              (trainerStats?.expiringMembers ?? []).length === 0 && (
                <EmptyState
                  icon={CalendarClock}
                  title="Todo al día"
                  description="No hay miembros pendientes de rutina ni membresías por vencer pronto."
                />
              )}
          </div>
        </Card>
      </div>
    </div>
  );
}
