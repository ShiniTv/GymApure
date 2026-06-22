import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { dateLocale as es } from '../../lib/dateLocale';
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  Clock,
  CreditCard,
  Dumbbell,
  UserCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useMemberStatsOptional } from '../../context/MemberStatsContext';
import {
  expiryBannerClasses,
  formatExpiryCountdown,
  getExpirySeverity,
  shouldShowExpiryAlert,
} from '../../lib/expiryUtils';
import { useIsMobile } from '../../hooks/useIsMobile';
import { formatDifficulty, cn } from '../../lib/utils';
import { QuickAction } from '../../components/admin/QuickAction';
import { Button, Card, EmptyState, PageHeader, StatCard } from '../../components/ui';

export default function MemberDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const memberStatsCtx = useMemberStatsOptional();
  const memberStats = memberStatsCtx?.stats ?? null;
  const statsError = memberStatsCtx?.error;
  const isMobile = useIsMobile();

  const sub = memberStats?.subscription;
  const routine = memberStats?.primaryRoutine;
  const pending = memberStats?.pendingPayments ?? 0;
  const alertDays = memberStats?.expiryAlertDays ?? 7;
  const workoutsMonth = memberStats?.workoutsThisMonth ?? 0;

  if (statsError && !memberStats) {
    return (
      <div className="page-stack">
        <PageHeader
          showTitleOnMobile
          title={<>Hola, <span className="text-orange-500">{user?.name}</span></>}
          subtitle="Tu espacio de entrenamiento"
        />
        <EmptyState
          icon={AlertTriangle}
          title="Error al cargar"
          description={statsError}
          action={<Button onClick={() => void memberStatsCtx?.refresh()}>Reintentar</Button>}
        />
      </div>
    );
  }

  return (
    <div className={cn('page-stack', isMobile && routine && 'pb-24')}>
      <PageHeader
        showTitleOnMobile
        title={<>Hola, <span className="text-orange-500">{user?.name}</span></>}
        subtitle="Tu espacio de entrenamiento en Caribean Gym"
        badge={sub ? `${sub.days_remaining} días de plan` : undefined}
      />

      {pending > 0 && (
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-sm font-bold text-yellow-700 dark:text-yellow-400">
            Tienes {pending} pago(s) pendiente(s) de revisión.
          </p>
          <Link to="/payments" className="text-xs font-bold text-yellow-800 dark:text-yellow-300 hover:underline">
            Ver pagos
          </Link>
        </div>
      )}

      {sub && shouldShowExpiryAlert(sub.days_remaining, alertDays) && (() => {
        const severity = getExpirySeverity(sub.days_remaining, alertDays);
        const classes = expiryBannerClasses(severity);
        const suffix =
          sub.days_remaining === 0
            ? ' Renueva para seguir entrenando.'
            : sub.days_remaining === 1
            ? ' Renueva pronto.'
            : '';
        return (
          <div className={`rounded-2xl border px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${classes.container}`}>
            <p className={`text-sm font-bold ${classes.text}`}>
              {formatExpiryCountdown(sub.days_remaining) + suffix}
            </p>
            <Link to="/payments" className={`text-xs font-bold hover:underline ${classes.link}`}>
              Renovar
            </Link>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Entrenos del mes" value={workoutsMonth} icon={Activity} color="orange" />
        <StatCard title="Racha activa" value={memberStats?.workoutStreak ?? 0} icon={CalendarClock} color="emerald" />
        <StatCard title="Días de plan" value={sub?.days_remaining ?? '—'} icon={CalendarClock} color="blue" />
        <StatCard title="Ejercicios hoy" value={routine?.exercise_count ?? 0} icon={Dumbbell} color="orange" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickAction
          to={routine ? `/workout/${routine.id}` : '/routines'}
          icon={Dumbbell}
          title="Entrenar"
          description={routine ? routine.name : 'Ver rutinas asignadas'}
          tone="orange"
        />
        <QuickAction to="/payments" icon={CreditCard} title="Pagos" description="Reportar o renovar membresía" tone="emerald" />
        <QuickAction to="/history" icon={Clock} title="Historial" description="Tus sesiones anteriores" tone="blue" />
        <QuickAction to="/profile" icon={UserCircle} title="Mi perfil" description="Datos personales y medidas" tone="orange" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card padding="lg" rounded="2xl">
          <h3 className="section-title mb-6">Membresía</h3>
          {sub ? (
            <>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">{sub.membership_name}</p>
              <p className="text-sm text-zinc-500 mt-2">
                Vence {format(new Date(sub.end_date), 'dd MMM yyyy', { locale: es })}
              </p>
              <div className="mt-6 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-3">
                <div
                  className="bg-emerald-500 h-3 rounded-full transition-all"
                  style={{ width: `${memberStats?.progressPercent ?? 0}%` }}
                />
              </div>
            </>
          ) : (
            <EmptyState
              icon={CreditCard}
              title="Sin membresía activa"
              description="Reporta tu pago para activar el acceso al gym."
              action={
                <Button size="sm" onClick={() => navigate('/payments')}>
                  Reportar pago
                </Button>
              }
            />
          )}
        </Card>

        <Card padding="lg" rounded="2xl">
          <h3 className="section-title mb-6">Tu rutina</h3>
          {routine ? (
            <>
              <div className="flex items-center gap-4">
                <div className="p-4 bg-orange-500/10 rounded-2xl">
                  <Dumbbell className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-zinc-900 dark:text-white">{routine.name}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {routine.exercise_count} ejercicios · {formatDifficulty(routine.difficulty)}
                  </p>
                </div>
              </div>
              <Button className="w-full mt-6" onClick={() => navigate(`/workout/${routine.id}`)}>
                Empezar entrenamiento
              </Button>
              {(memberStats?.assignedRoutinesCount ?? 0) > 1 && (
                <Link to="/routines" className="mt-3 block text-center text-xs font-bold text-orange-600 hover:underline">
                  Ver todos ({memberStats?.assignedRoutinesCount})
                </Link>
              )}
            </>
          ) : (
            <EmptyState
              icon={Dumbbell}
              title="Sin rutina asignada"
              description="Tu entrenador te asignará un plan pronto."
            />
          )}
        </Card>
      </div>

      {memberStats?.lastWorkout && (
        <Card padding="lg" rounded="2xl">
          <h3 className="section-title mb-3">Último entrenamiento</h3>
          <p className="font-bold text-zinc-800 dark:text-zinc-200">{memberStats.lastWorkout.routine_name}</p>
          <p className="text-xs text-zinc-500 mt-1">
            {format(new Date(memberStats.lastWorkout.start_time), "dd MMM yyyy · HH:mm", { locale: es })}
          </p>
          <Link to="/history" className="inline-block mt-4 text-xs font-bold text-orange-600 hover:underline">
            Ver historial completo
          </Link>
        </Card>
      )}

      <Link to="/profile" className="block">
        <Card padding="lg" rounded="2xl" className="hover:border-orange-500/40 transition-colors group">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="section-title mb-1">Mi progreso</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">Perfil, mediciones y evolución de peso</p>
            </div>
            <div className="p-3 rounded-xl bg-orange-500/10 text-orange-600 group-hover:bg-orange-500/20 transition-colors">
              <UserCircle className="h-6 w-6" />
            </div>
          </div>
        </Card>
      </Link>

      {isMobile && routine && (
        <div className="fixed bottom-0 left-0 right-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-zinc-50/95 dark:bg-zinc-950/95 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 z-40">
          <Button
            className="w-full min-h-[52px] text-base font-semibold"
            onClick={() => navigate(`/workout/${routine.id}`)}
          >
            <Dumbbell className="h-5 w-5 mr-2" />
            Empezar entrenamiento
          </Button>
        </div>
      )}
    </div>
  );
}
