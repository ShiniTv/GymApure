import { Link, useNavigate } from 'react-router';
import { useState, type ReactNode } from 'react';
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
import { cn, formatDifficulty } from '../../lib/utils';
import { QuickAction } from '../../components/admin/QuickAction';
import { MemberHero } from '../../components/member/MemberHero';
import { MemberSelfCheckInCard } from '../../components/member/MemberSelfCheckInCard';
import { PushOnboardingCard } from '../../components/PushOnboardingCard';
import { Button, Card, Collapse, EmptyState, PageHeader, Badge } from '../../components/ui';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useMediaQuery } from '../../lib/useMediaQuery';

const PAGE = 'page-stack stagger-fade-in mx-auto w-full max-w-5xl';
const BANNER =
  'flex flex-col justify-between gap-4 rounded-card px-ds-4 py-ds-4 sm:flex-row sm:items-center';
const SURFACE_ROW =
  'tap-feedback flex items-center gap-3.5 rounded-card bg-surface px-ds-4 py-ds-4 transition-[background-color,transform,opacity] duration-150';
const ASSIGNMENT_UPCOMING =
  'bg-brand/5 border-brand/15 flex items-center justify-between gap-2 rounded-xl border';
const ASSIGNMENT_ENDING =
  'flex items-center justify-between gap-2 rounded-xl border border-orange-500/20 bg-orange-500/5';
const LINK_BRAND = 'text-brand inline-block text-xs font-bold hover:underline';

interface AssignmentRow {
  id: number;
  name: string;
  start_date?: string | null;
  end_date?: string | null;
}

function AssignmentListItem({
  row,
  tone,
  dateLabel,
  dateValue,
  badge,
  compact,
}: {
  row: AssignmentRow;
  tone: 'upcoming' | 'ending';
  dateLabel: string;
  dateValue: string | null | undefined;
  badge: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        tone === 'upcoming' ? ASSIGNMENT_UPCOMING : ASSIGNMENT_ENDING,
        compact ? 'px-3 py-2.5' : 'px-4 py-3'
      )}
    >
      <div className="min-w-0">
        <p
          className={cn('text-text truncate', compact ? 'text-sm font-semibold' : 'font-semibold')}
        >
          {row.name}
        </p>
        {dateValue && (
          <p
            className={cn('text-text-secondary', compact ? 'mt-0.5 text-[11px]' : 'mt-0.5 text-xs')}
          >
            {dateLabel} {format(parseDateOnly(dateValue), 'dd MMM yyyy', { locale: es })}
          </p>
        )}
      </div>
      {badge}
    </div>
  );
}

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
      <div className={PAGE}>
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
    <div className={PAGE}>
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
        <div className={cn(BANNER, 'bg-amber-500/10')}>
          <div>
            <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
              Tienes {pending} pago(s) pendiente(s) de revisión.
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-amber-800/80 dark:text-amber-300/80">
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
        <Card padding="md" rounded="xl" className="bg-brand/5 dark:bg-brand/[0.08]">
          <h3 className="text-text text-sm font-bold">Activa tu membresía</h3>
          <ol className="text-text-secondary mt-4 space-y-3 text-xs leading-relaxed">
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
          <Button size="sm" className="mt-5" onClick={() => navigate('/payments?register=1')}>
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
            <div className={cn(BANNER, classes.container)}>
              <div>
                <p className={cn('text-sm font-bold', classes.text)}>
                  {formatExpiryCountdown(sub.days_remaining) + suffix}
                </p>
                <p className={cn('mt-1.5 text-[11px] leading-relaxed opacity-80', classes.text)}>
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
        <div className="stagger-fade-in space-y-4">
          {routine ? (
            <Link to="/routines" className={cn(SURFACE_ROW, 'hover:bg-surface-raised')}>
              <div className="bg-brand/10 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
                <Dumbbell className="text-brand h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-text text-sm leading-snug font-semibold">Ver rutinas</p>
                <p className="text-text-secondary mt-1 truncate text-[11px] leading-relaxed">
                  {routine.name} · {routine.exercise_count} ejercicios
                </p>
              </div>
              <ChevronRight className="text-text-muted h-4 w-4 shrink-0" aria-hidden />
            </Link>
          ) : (
            <Link to="/messages" className={SURFACE_ROW}>
              <div className="bg-surface-overlay flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
                <Dumbbell className="text-text-muted h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-text text-sm leading-snug font-semibold">Sin rutina aún</p>
                <p className="text-text-secondary mt-1 text-[11px] leading-relaxed">
                  Escribe a tu entrenador
                </p>
              </div>
            </Link>
          )}

          <Card padding="md" rounded="xl">
            <h3 className="text-text text-sm font-semibold">Membresía</h3>
            {sub ? (
              <>
                <p
                  className={cn(
                    'mt-2 text-lg font-bold',
                    subscriptionPlanNameClass(sub.days_remaining, alertDays)
                  )}
                >
                  {sub.membership_name}
                </p>
                <p className="text-text-secondary mt-1.5 text-xs leading-relaxed">
                  {formatRemainingDaysShort(sub.days_remaining)}
                  {' · '}
                  Vence {format(new Date(sub.end_date), 'dd MMM yyyy', { locale: es })}
                </p>
                <div className="bg-surface-overlay mt-4 h-2 w-full rounded-full">
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
              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="text-text-secondary text-xs">Sin membresía activa</p>
                <Button size="sm" variant="ghost" onClick={() => navigate('/payments')}>
                  Reportar pago
                </Button>
              </div>
            )}
          </Card>
        </div>
      ) : (
        <div className="stagger-fade-in grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card padding="sm" rounded="2xl" className="md:p-5">
            <h3 className="section-title mb-3">Tu rutina</h3>
            {routine ? (
              <>
                <div className="flex items-center gap-4">
                  <div className="bg-brand/10 rounded-2xl p-4">
                    <Dumbbell className="text-brand h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-text truncate text-xl font-bold">{routine.name}</p>
                    <p className="text-text-secondary mt-1 text-xs">
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
                  <p className="text-text-secondary mt-2 text-center text-xs">
                    Tienes un entrenamiento en curso. Puedes retomarlo cuando quieras.
                  </p>
                )}
                {primaryRoutineCompletedToday && (
                  <p className="text-text-secondary mt-2 text-center text-xs">
                    Ya entrenaste esta rutina hoy. Vuelve mañana.
                  </p>
                )}
                {(memberStats?.assignedRoutinesCount ?? 0) > 1 && (
                  <Link to="/routines" className={cn(LINK_BRAND, 'mt-3 block text-center')}>
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
                  className={cn(
                    'text-2xl font-bold',
                    subscriptionPlanNameClass(sub.days_remaining, alertDays)
                  )}
                >
                  {sub.membership_name}
                </p>
                <p className="text-text-secondary mt-2 text-sm">
                  {formatRemainingDaysShort(sub.days_remaining)}
                  {' · '}
                  Vence {format(new Date(sub.end_date), 'dd MMM yyyy', { locale: es })}
                </p>
                <div className="bg-surface-overlay mt-4 h-3 w-full rounded-full">
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
                <Link to="/payments" className={cn(LINK_BRAND, 'mt-4')}>
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

      <div className="stagger-fade-in grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
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
            <span className="text-text text-sm font-bold">Más de tu plan</span>
            {moreOpen ? (
              <ChevronUp className="text-text-muted h-4 w-4" />
            ) : (
              <ChevronDown className="text-text-muted h-4 w-4" />
            )}
          </button>
          <Collapse open={moreOpen}>
            <div className="mt-3 space-y-3">
              {(upcomingRoutines.length > 0 || endingRoutines.length > 0) && (
                <div className="space-y-2">
                  <p className="text-text-secondary text-xs font-semibold">Próximas asignaciones</p>
                  {upcomingRoutines.map((r) => {
                    const row = r as AssignmentRow;
                    return (
                      <AssignmentListItem
                        key={row.id}
                        row={row}
                        tone="upcoming"
                        dateLabel="Inicia"
                        dateValue={row.start_date}
                        badge={<Badge variant="default">Próxima</Badge>}
                        compact
                      />
                    );
                  })}
                  {endingRoutines.map((r) => {
                    const row = r as AssignmentRow;
                    return (
                      <AssignmentListItem
                        key={row.id}
                        row={row}
                        tone="ending"
                        dateLabel="Hasta"
                        dateValue={row.end_date}
                        badge={<Badge variant="warning">Por vencer</Badge>}
                        compact
                      />
                    );
                  })}
                  <Link to="/routines" className={LINK_BRAND}>
                    Ver todas mis rutinas
                  </Link>
                </div>
              )}
              {memberStats?.lastWorkout && (
                <div>
                  <p className="text-text-secondary mb-1 text-xs font-semibold">
                    Último entrenamiento
                  </p>
                  <p className="text-text text-sm font-bold">
                    {memberStats.lastWorkout.routine_name}
                  </p>
                  <p className="text-text-secondary mt-0.5 text-[11px]">
                    {format(new Date(memberStats.lastWorkout.start_time), 'dd MMM yyyy · HH:mm', {
                      locale: es,
                    })}
                  </p>
                  <Link to="/history" className={cn(LINK_BRAND, 'mt-2')}>
                    Ver historial completo
                  </Link>
                </div>
              )}
            </div>
          </Collapse>
        </Card>
      ) : (
        <>
          {(upcomingRoutines.length > 0 || endingRoutines.length > 0) && (
            <Card padding="sm" rounded="2xl" className="md:p-5">
              <h3 className="section-title mb-3">Próximas asignaciones</h3>
              <div className="space-y-2">
                {upcomingRoutines.map((r) => {
                  const row = r as AssignmentRow;
                  return (
                    <AssignmentListItem
                      key={row.id}
                      row={row}
                      tone="upcoming"
                      dateLabel="Inicia"
                      dateValue={row.start_date}
                      badge={<Badge variant="default">Próxima</Badge>}
                    />
                  );
                })}
                {endingRoutines.map((r) => {
                  const row = r as AssignmentRow;
                  return (
                    <AssignmentListItem
                      key={row.id}
                      row={row}
                      tone="ending"
                      dateLabel="Hasta"
                      dateValue={row.end_date}
                      badge={<Badge variant="warning">Por vencer</Badge>}
                    />
                  );
                })}
              </div>
              <Link to="/routines" className={cn(LINK_BRAND, 'mt-4')}>
                Ver todas mis rutinas
              </Link>
            </Card>
          )}

          {memberStats?.lastWorkout && (
            <Card padding="sm" rounded="2xl" className="md:p-5">
              <h3 className="section-title mb-3">Último entrenamiento</h3>
              <p className="text-text font-bold">{memberStats.lastWorkout.routine_name}</p>
              <p className="text-text-secondary mt-1 text-xs">
                {format(new Date(memberStats.lastWorkout.start_time), 'dd MMM yyyy · HH:mm', {
                  locale: es,
                })}
              </p>
              <Link to="/history" className={cn(LINK_BRAND, 'mt-4')}>
                Ver historial completo
              </Link>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
