import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { format, isAfter, isBefore, addDays, startOfDay } from 'date-fns';
import { parseDateOnly } from '../../lib/dates';
import { dateLocale as es } from '../../lib/dateLocale';
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  CreditCard,
  Dumbbell,
  UtensilsCrossed,
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
import { useMediaQuery } from '../../lib/useMediaQuery';

export default function MemberDashboard() {
  const { user } = useAuth();
  usePageTitle('Inicio');
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 1023px)');
  const [moreOpen, setMoreOpen] = useState(false);
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
      <div className="page-stack-tight mx-auto w-full max-w-5xl">
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
    <div className="page-stack-tight mx-auto w-full max-w-5xl">
      <MemberHero
        name={user?.name ?? 'Atleta'}
        workoutsThisWeek={memberStats?.workoutsThisWeek ?? 0}
        weeklyTrainingGoal={memberStats?.weeklyTrainingGoal ?? 5}
        workoutStreak={memberStats?.workoutStreak ?? 0}
        routineId={routine?.id}
        routineName={routine?.name}
        routineCompletedToday={primaryRoutineCompletedToday}
        routineInProgress={primaryRoutineInProgress}
      />

      {pending > 0 && (
        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-amber-600/25 bg-amber-500/10 px-4 py-3 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
              Tienes {pending} pago(s) pendiente(s) de revisión.
            </p>
            <p className="mt-1 text-[11px] text-amber-800/80 dark:text-amber-300/80">
              Paso 3 de 3: espera la aprobación del staff para activar o renovar tu membresía.
              {sub && shouldShowExpiryAlert(sub.days_remaining, alertDays)
                ? ` · ${formatExpiryCountdown(sub.days_remaining)}`
                : ''}
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

      {pending === 0 &&
        sub &&
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
              className={`flex flex-col justify-between gap-3 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center ${classes.container}`}
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
                </p>
              </div>
              <Button size="sm" onClick={() => navigate('/payments?register=1')}>
                Reportar pago
              </Button>
            </div>
          );
        })()}

      <MemberSelfCheckInCard />

      {/* Desktop: full routine + membership cards. Mobile: no second train CTA (hero owns it). */}
      {isMobile ? (
        <div className="space-y-3">
          {routine ? (
            <Link
              to="/routines"
              className="flex items-center gap-3 rounded-xl border border-zinc-200/70 px-3 py-2.5 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/50"
            >
              <div className="bg-brand/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
                <Dumbbell className="text-brand h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">Ver rutinas</p>
                <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                  {routine.name} · {routine.exercise_count} ejercicios
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
            </Link>
          ) : (
            <Link
              to="/messages"
              className="flex items-center gap-3 rounded-xl border border-dashed border-zinc-300 px-3 py-2.5 dark:border-zinc-700"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
                <Dumbbell className="h-4 w-4 text-zinc-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                  Sin rutina aún
                </p>
                <p className="text-[11px] text-zinc-500">Escribe a tu entrenador</p>
              </div>
            </Link>
          )}

          <Card padding="sm" rounded="xl">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Membresía</h3>
            {sub ? (
              <>
                <p
                  className={`mt-1 text-lg font-bold ${subscriptionPlanNameClass(sub.days_remaining, alertDays)}`}
                >
                  {sub.membership_name}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {formatRemainingDaysShort(sub.days_remaining)}
                  {' · '}
                  Vence {format(new Date(sub.end_date), 'dd MMM yyyy', { locale: es })}
                </p>
                <div className="mt-3 h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-2 rounded-full transition-[width,background-color] duration-500"
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
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-xs text-zinc-500">Sin membresía activa</p>
                <Button size="sm" variant="ghost" onClick={() => navigate('/payments')}>
                  Reportar pago
                </Button>
              </div>
            )}
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card padding="sm" rounded="2xl" className="md:p-5">
            <h3 className="section-title mb-3">Tu rutina</h3>
            {routine ? (
              <>
                <div className="flex items-center gap-4">
                  <div className="bg-brand/10 rounded-2xl p-4">
                    <Dumbbell className="text-brand h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xl font-bold text-zinc-900 dark:text-white">
                      {routine.name}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {routine.exercise_count} ejercicios · {formatDifficulty(routine.difficulty)}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="mt-3 w-full shadow-sm"
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

          <Card padding="sm" rounded="2xl" className="md:p-5">
            <h3 className="section-title mb-3">Membresía</h3>
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
                <div className="mt-4 h-3 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
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
                <Link
                  to="/payments"
                  className="text-brand mt-4 inline-block text-xs font-bold hover:underline"
                >
                  Historial de pagos
                </Link>
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
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
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

      <PushOnboardingCard />

      {isMobile &&
      (upcomingRoutines.length > 0 || endingRoutines.length > 0 || memberStats?.lastWorkout) ? (
        <Card padding="sm" rounded="xl">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 text-left"
            onClick={() => setMoreOpen((v) => !v)}
            aria-expanded={moreOpen}
          >
            <span className="text-sm font-bold text-zinc-900 dark:text-white">Más de tu plan</span>
            {moreOpen ? (
              <ChevronUp className="h-4 w-4 text-zinc-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-zinc-400" />
            )}
          </button>
          {moreOpen && (
            <div className="mt-3 space-y-3">
              {(upcomingRoutines.length > 0 || endingRoutines.length > 0) && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-zinc-500">Próximas asignaciones</p>
                  {upcomingRoutines.map((r) => {
                    const row = r as { id: number; name: string; start_date?: string | null };
                    return (
                      <div
                        key={row.id}
                        className="bg-brand/5 border-brand/15 flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                            {row.name}
                          </p>
                          {row.start_date && (
                            <p className="mt-0.5 text-[11px] text-zinc-500">
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
                        className="flex items-center justify-between gap-2 rounded-xl border border-orange-500/20 bg-orange-500/5 px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                            {row.name}
                          </p>
                          {row.end_date && (
                            <p className="mt-0.5 text-[11px] text-zinc-500">
                              Hasta{' '}
                              {format(parseDateOnly(row.end_date), 'dd MMM yyyy', { locale: es })}
                            </p>
                          )}
                        </div>
                        <Badge variant="warning">Por vencer</Badge>
                      </div>
                    );
                  })}
                  <Link
                    to="/routines"
                    className="text-brand inline-block text-xs font-bold hover:underline"
                  >
                    Ver todas mis rutinas
                  </Link>
                </div>
              )}
              {memberStats?.lastWorkout && (
                <div>
                  <p className="mb-1 text-xs font-semibold text-zinc-500">Último entrenamiento</p>
                  <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                    {memberStats.lastWorkout.routine_name}
                  </p>
                  <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                    {format(new Date(memberStats.lastWorkout.start_time), 'dd MMM yyyy · HH:mm', {
                      locale: es,
                    })}
                  </p>
                  <Link
                    to="/history"
                    className="text-brand mt-2 inline-block text-xs font-bold hover:underline"
                  >
                    Ver historial completo
                  </Link>
                </div>
              )}
            </div>
          )}
        </Card>
      ) : (
        <>
          {(upcomingRoutines.length > 0 || endingRoutines.length > 0) && (
            <Card padding="sm" rounded="2xl" className="md:p-5">
              <h3 className="section-title mb-3">Próximas asignaciones</h3>
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
                            Hasta{' '}
                            {format(parseDateOnly(row.end_date), 'dd MMM yyyy', { locale: es })}
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

          {memberStats?.lastWorkout && (
            <Card padding="sm" rounded="2xl" className="md:p-5">
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
        </>
      )}
    </div>
  );
}
