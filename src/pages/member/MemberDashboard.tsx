import { Link, useNavigate } from 'react-router-dom';
import { format, isAfter, isBefore, addDays, startOfDay } from 'date-fns';
import { parseDateOnly } from '../../lib/dates';
import { dateLocale as es } from '../../lib/dateLocale';
import {
  AlertTriangle,
  Clock,
  CreditCard,
  Dumbbell,
  BookOpen,
  UtensilsCrossed,
  CalendarDays,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useMemberStatsOptional } from '../../context/MemberStatsContext';
import { useMemberRoutinesQuery } from '../../hooks/queries/useRoutinesQuery';
import {
  expiryBannerClasses,
  formatExpiryCountdown,
  formatRemainingDaysShort,
  getExpirySeverity,
  getSubscriptionBarStyle,
  shouldShowExpiryAlert,
  subscriptionPlanNameClass,
} from '../../lib/expiryUtils';
import { formatDifficulty } from '../../lib/utils';
import { QuickAction } from '../../components/admin/QuickAction';
import { MemberHero } from '../../components/member/MemberHero';
import { MemberSelfCheckInCard } from '../../components/member/MemberSelfCheckInCard';
import { PushOnboardingCard } from '../../components/PushOnboardingCard';
import { Button, Card, EmptyState, PageHeader, Badge } from '../../components/ui';
import { usePageTitle } from '../../hooks/usePageTitle';

export default function MemberDashboard() {
  const { user } = useAuth();
  usePageTitle('Inicio');
  const navigate = useNavigate();
  const memberStatsCtx = useMemberStatsOptional();
  const memberStats = memberStatsCtx?.stats ?? null;
  const statsError = memberStatsCtx?.error;
  const { data: memberRoutines = [] } = useMemberRoutinesQuery(user?.id, !!user);

  const today = startOfDay(new Date());
  const upcomingRoutines = memberRoutines.filter((r) => {
    const row = r as { start_date?: string | null; end_date?: string | null };
    if (!row.start_date) return false;
    return isAfter(startOfDay(parseDateOnly(row.start_date)), today);
  });
  const endingRoutines = memberRoutines.filter((r) => {
    const row = r as { start_date?: string | null; end_date?: string | null };
    if (!row.end_date) return false;
    const end = startOfDay(parseDateOnly(row.end_date));
    return !isBefore(end, today) && !isAfter(end, addDays(today, 7));
  });

  const sub = memberStats?.subscription;
  const routine = memberStats?.primaryRoutine;
  const pending = memberStats?.pendingPayments ?? 0;
  const alertDays = memberStats?.expiryAlertDays ?? 7;
  const completedToday = new Set(memberStats?.completedRoutineIdsToday ?? []);
  const primaryRoutineCompletedToday = routine ? completedToday.has(routine.id) : false;
  const primaryRoutineInProgress = routine
    ? (memberStats?.activeSessions?.some((s) => s.routine_id === routine.id) ?? false)
    : false;
  const subscriptionBarStyle = getSubscriptionBarStyle(memberStats?.remainingPercent ?? 0);

  if (statsError && !memberStats) {
    return (
      <div className="page-stack">
        <PageHeader
          showTitleOnMobile
          title={
            <>
              Hola, <span className="text-brand">{user?.name}</span>
            </>
          }
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
    <div className="page-stack">
      <MemberHero
        name={user?.name ?? 'Atleta'}
        workoutsThisWeek={memberStats?.workoutsThisWeek ?? 0}
        weeklyTrainingGoal={memberStats?.weeklyTrainingGoal ?? 5}
        workoutStreak={memberStats?.workoutStreak ?? 0}
        routineId={routine?.id}
        routineName={routine?.name}
        routineCompletedToday={primaryRoutineCompletedToday}
      />

      <MemberSelfCheckInCard />

      <PushOnboardingCard />

      {pending > 0 && (
        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-amber-600/25 bg-amber-500/10 px-6 py-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
              Tienes {pending} pago(s) pendiente(s) de revisión.
            </p>
            <p className="mt-1 text-[11px] text-amber-800/80 dark:text-amber-300/80">
              Paso 3 de 3: espera la aprobación del staff para activar o renovar tu membresía.
            </p>
          </div>
          <Link
            to="/payments?status=pending"
            className="text-xs font-bold text-amber-900 underline hover:no-underline dark:text-amber-200"
          >
            Ver pagos
          </Link>
        </div>
      )}

      {!sub && pending === 0 && (
        <Card padding="md" rounded="xl" className="border-brand/20 bg-brand/5">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Activa tu membresía</h3>
          <ol className="mt-3 space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
            <li>
              <span className="text-brand font-semibold">1.</span> Elige un plan al reportar el pago
            </li>
            <li>
              <span className="text-brand font-semibold">2.</span> Sube el comprobante con
              referencia
            </li>
            <li>
              <span className="text-brand font-semibold">3.</span> Espera la aprobación del gym
            </li>
          </ol>
          <Button size="sm" className="mt-4" onClick={() => navigate('/payments?register=1')}>
            Empezar renovación
          </Button>
        </Card>
      )}

      {sub &&
        shouldShowExpiryAlert(sub.days_remaining, alertDays) &&
        (() => {
          const severity = getExpirySeverity(sub.days_remaining, alertDays);
          const classes = expiryBannerClasses(severity);
          const suffix =
            sub.days_remaining === 0
              ? ' Renueva para seguir entrenando.'
              : sub.days_remaining === 1
                ? ' Renueva pronto.'
                : '';
          return (
            <div
              className={`flex flex-col justify-between gap-3 rounded-2xl border px-6 py-4 sm:flex-row sm:items-center ${classes.container}`}
            >
              <div>
                <p className={`text-sm font-bold ${classes.text}`}>
                  {formatExpiryCountdown(sub.days_remaining) + suffix}
                </p>
                <p className={`mt-1 text-[11px] opacity-80 ${classes.text}`}>
                  Plan {sub.membership_name}
                  {sub.end_date
                    ? ` · vence ${format(parseDateOnly(sub.end_date), 'dd MMM yyyy', { locale: es })}`
                    : ''}
                  {pending > 0 ? ' · ya tienes un comprobante en revisión' : ''}
                </p>
              </div>
              {pending > 0 ? (
                <Link
                  to="/payments?status=pending"
                  className={`text-xs font-bold hover:underline ${classes.link}`}
                >
                  Ver comprobante
                </Link>
              ) : (
                <Button size="sm" onClick={() => navigate('/payments?register=1')}>
                  Reportar pago
                </Button>
              )}
            </div>
          );
        })()}

      {sub && !shouldShowExpiryAlert(sub.days_remaining, alertDays) && (
        <Card
          padding="sm"
          rounded="xl"
          className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">
              {sub.membership_name}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {formatRemainingDaysShort(sub.days_remaining)}
              {sub.end_date
                ? ` · hasta ${format(parseDateOnly(sub.end_date), 'dd MMM yyyy', { locale: es })}`
                : ''}
            </p>
          </div>
          <Link to="/payments" className="text-brand text-xs font-bold hover:underline">
            Historial de pagos
          </Link>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
        <QuickAction
          compact
          iconOnlyMobile
          to="/routines"
          icon={Dumbbell}
          title="Rutinas"
          description="Asignaciones activas"
          tone="blue"
        />
        <QuickAction
          compact
          iconOnlyMobile
          to="/reservas"
          icon={CalendarDays}
          title="Reservas"
          description="Clases grupales"
          tone="orange"
        />
        <QuickAction
          compact
          iconOnlyMobile
          to="/exercises"
          icon={BookOpen}
          title="Biblioteca"
          description="Videos y guías"
          tone="orange"
        />
        <QuickAction
          compact
          iconOnlyMobile
          to="/nutrition"
          icon={UtensilsCrossed}
          title="Nutrición"
          description="Macros y comidas"
          tone="emerald"
        />
        <QuickAction
          compact
          iconOnlyMobile
          to="/history"
          icon={Clock}
          title="Historial"
          description="Sesiones anteriores"
          tone="blue"
        />
        <QuickAction
          compact
          iconOnlyMobile
          to="/payments"
          icon={CreditCard}
          title="Pagos"
          description="Reportar o renovar"
          tone="emerald"
        />
      </div>

      {(upcomingRoutines.length > 0 || endingRoutines.length > 0) && (
        <Card padding="lg" rounded="2xl">
          <h3 className="section-title mb-4">Próximas asignaciones</h3>
          <div className="space-y-2">
            {upcomingRoutines.map((r) => {
              const row = r as { id: number; name: string; start_date?: string | null };
              return (
                <div
                  key={row.id}
                  className="bg-brand/5 border-brand/15 flex items-center justify-between gap-2 rounded-xl border px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-zinc-900 dark:text-white">
                      {row.name}
                    </p>
                    {row.start_date && (
                      <p className="mt-0.5 text-xs text-zinc-500">
                        Inicia{' '}
                        {format(parseDateOnly(row.start_date), 'dd MMM yyyy', { locale: es })}
                      </p>
                    )}
                  </div>
                  <Badge variant="default">Próxima</Badge>
                </div>
              );
            })}
            {endingRoutines.map((r) => {
              const row = r as { id: number; name: string; end_date?: string | null };
              return (
                <div
                  key={row.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-orange-500/20 bg-orange-500/5 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-zinc-900 dark:text-white">
                      {row.name}
                    </p>
                    {row.end_date && (
                      <p className="mt-0.5 text-xs text-zinc-500">
                        Hasta {format(parseDateOnly(row.end_date), 'dd MMM yyyy', { locale: es })}
                      </p>
                    )}
                  </div>
                  <Badge variant="warning">Por vencer</Badge>
                </div>
              );
            })}
          </div>
          <Link
            to="/routines"
            className="text-brand mt-4 inline-block text-xs font-bold hover:underline"
          >
            Ver todas mis rutinas
          </Link>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card padding="lg" rounded="2xl">
          <h3 className="section-title mb-6">Membresía</h3>
          {sub ? (
            <>
              <p
                className={`text-2xl font-bold ${subscriptionPlanNameClass(sub.days_remaining, alertDays)}`}
              >
                {sub.membership_name}
              </p>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                {formatRemainingDaysShort(sub.days_remaining)}
                {' · '}
                Vence {format(new Date(sub.end_date), 'dd MMM yyyy', { locale: es })}
              </p>
              <div className="mt-6 h-3 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="h-3 rounded-full transition-[width,background-color] duration-500"
                  style={{
                    width: `${subscriptionBarStyle.widthPercent}%`,
                    backgroundColor: subscriptionBarStyle.backgroundColor,
                  }}
                  role="progressbar"
                  aria-valuenow={subscriptionBarStyle.widthPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={formatRemainingDaysShort(sub.days_remaining)}
                />
              </div>
            </>
          ) : (
            <EmptyState
              variant="motivational"
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
                <div className="bg-brand/10 rounded-2xl p-4">
                  <Dumbbell className="text-brand h-6 w-6" />
                </div>
                <div>
                  <p className="text-xl font-bold text-zinc-900 dark:text-white">{routine.name}</p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {routine.exercise_count} ejercicios · {formatDifficulty(routine.difficulty)}
                  </p>
                </div>
              </div>
              <Button
                className="mt-6 w-full"
                disabled={primaryRoutineCompletedToday}
                onClick={() => navigate(`/workout/${routine.id}`)}
              >
                {primaryRoutineCompletedToday
                  ? 'Completada hoy'
                  : primaryRoutineInProgress
                    ? 'Continuar entrenamiento'
                    : 'Empezar entrenamiento'}
              </Button>
              {primaryRoutineInProgress && !primaryRoutineCompletedToday && (
                <p className="mt-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
                  Tienes un entrenamiento en curso. Puedes retomarlo cuando quieras.
                </p>
              )}
              {primaryRoutineCompletedToday && (
                <p className="mt-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
                  Ya entrenaste esta rutina hoy. Vuelve mañana.
                </p>
              )}
              {(memberStats?.assignedRoutinesCount ?? 0) > 1 && (
                <Link
                  to="/routines"
                  className="text-brand mt-3 block text-center text-xs font-bold hover:underline"
                >
                  Ver todos ({memberStats?.assignedRoutinesCount})
                </Link>
              )}
            </>
          ) : (
            <EmptyState
              variant="motivational"
              icon={Dumbbell}
              title="Sin rutina asignada"
              description="Tu entrenador te asignará un plan pronto. Mientras tanto, escríbele por mensajes."
              action={
                <Button size="sm" onClick={() => navigate('/messages')}>
                  Escribir a mi entrenador
                </Button>
              }
            />
          )}
        </Card>
      </div>

      {memberStats?.lastWorkout && (
        <Card padding="lg" rounded="2xl">
          <h3 className="section-title mb-3">Último entrenamiento</h3>
          <p className="font-bold text-zinc-800 dark:text-zinc-200">
            {memberStats.lastWorkout.routine_name}
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {format(new Date(memberStats.lastWorkout.start_time), 'dd MMM yyyy · HH:mm', {
              locale: es,
            })}
          </p>
          <Link
            to="/history"
            className="text-brand mt-4 inline-block text-xs font-bold hover:underline"
          >
            Ver historial completo
          </Link>
        </Card>
      )}
    </div>
  );
}
