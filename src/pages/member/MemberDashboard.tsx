import { Link, useNavigate } from 'react-router';
import { useState, type ReactNode } from 'react';
import { format, isAfter, isBefore, addDays, startOfDay } from 'date-fns';
import { parseDateOnly } from '../../lib/dates';
import { dateLocale as es } from '../../lib/dateLocale';
import {
  AlertTriangle,
  CalendarDays,
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
import { MemberRemoteTrainingCard } from '../../components/member/MemberRemoteTrainingCard';
import { PushOnboardingCard } from '../../components/PushOnboardingCard';
import { Button, Card, Collapse, EmptyState, PageHeader } from '../../components/ui';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useMediaQuery } from '../../lib/useMediaQuery';

const PAGE = 'page-stack-tight stagger-fade-in mx-auto w-full max-w-5xl';
const BANNER =
  'flex flex-col justify-between gap-4 rounded-xl border px-ds-4 py-ds-4 sm:flex-row sm:items-center';
const ASSIGNMENT_UPCOMING =
  'flex items-center justify-between gap-2 border-b border-border/60 last:border-b-0';
const ASSIGNMENT_ENDING =
  'flex items-center justify-between gap-2 border-b border-border/60 last:border-b-0';
const LINK_BRAND = 'text-brand inline-block text-xs font-bold hover:underline';
const MOBILE_LIST_ROW =
  'tap-feedback flex min-h-12 items-center gap-3 px-3.5 py-2.5 transition-colors hover:bg-surface-raised';

const MEMBER_LINKS = [
  { to: '/routines', icon: Dumbbell, label: 'Rutinas', detail: 'Asignaciones activas' },
  { to: '/reservas', icon: CalendarDays, label: 'Reservas', detail: 'Clases grupales' },
  { to: '/nutrition', icon: UtensilsCrossed, label: 'Nutrición', detail: 'Macros y comidas' },
  { to: '/history', icon: Clock, label: 'Historial', detail: 'Sesiones anteriores' },
  { to: '/payments', icon: CreditCard, label: 'Pagos', detail: 'Reportar o renovar' },
] as const;

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
        compact ? 'py-2' : 'py-2.5'
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
            className={cn('text-text-secondary', compact ? 'text-small mt-0.5' : 'mt-0.5 text-xs')}
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
  const todayWeekday = new Date().getDay() || 7;
  const routineScheduledToday =
    !routine?.scheduled_weekdays?.length || routine.scheduled_weekdays.includes(todayWeekday);
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
        className="shadow-none"
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
        <div className={cn(BANNER, 'border-warning/20 bg-warning/10')}>
          <div>
            <p className="text-text text-sm font-semibold">
              Tienes {pending} pago(s) pendiente(s) de revisión.
            </p>
            <p className="text-text-secondary text-small mt-1.5 leading-relaxed">
              Paso 3 de 3: espera la aprobación del staff para activar o renovar tu membresía.
              {sub && shouldShowExpiryAlert(sub.days_remaining, alertDays)
                ? ` · ${formatExpiryCountdown(sub.days_remaining)}`
                : ''}
            </p>
          </div>
          <Link
            to="/payments?status=pending"
            className="text-warning text-small font-semibold underline hover:no-underline"
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
                <p className={cn('text-small mt-1.5 leading-relaxed opacity-80', classes.text)}>
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
      <MemberRemoteTrainingCard />

      {/* Desktop: full routine + membership cards. Mobile: one quiet list; hero owns the train CTA. */}
      {isMobile ? (
        <div className="stagger-fade-in divide-border border-border/80 bg-surface divide-y overflow-hidden rounded-xl border">
          {routine ? (
            <Link to="/routines" className={MOBILE_LIST_ROW}>
              <div className="bg-brand/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                <Dumbbell className="text-brand h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-text text-sm leading-snug font-medium">Tu rutina</p>
                <p className="text-text-secondary text-small mt-0.5 truncate">
                  {routineScheduledToday ? 'Hoy toca' : 'Próximo día de rutina'} · {routine.name}
                </p>
              </div>
              <ChevronRight className="text-text-muted h-4 w-4 shrink-0" aria-hidden />
            </Link>
          ) : (
            <Link to="/messages" className={MOBILE_LIST_ROW}>
              <div className="bg-surface-overlay flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                <Dumbbell className="text-text-muted h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-text text-sm leading-snug font-medium">Sin rutina aún</p>
                <p className="text-text-secondary text-small mt-0.5">Escribe a tu entrenador</p>
              </div>
              <ChevronRight className="text-text-muted h-4 w-4 shrink-0" aria-hidden />
            </Link>
          )}

          <Link to="/payments" className={MOBILE_LIST_ROW}>
            <div className="bg-surface-overlay flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
              <CreditCard className="text-text-secondary h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-text text-sm leading-snug font-medium">Membresía</p>
              {sub ? (
                <>
                  <p
                    className={cn(
                      'text-small mt-0.5 truncate',
                      subscriptionPlanNameClass(sub.days_remaining, alertDays)
                    )}
                  >
                    {sub.membership_name} · {formatRemainingDaysShort(sub.days_remaining)}
                  </p>
                  <div className="bg-surface-overlay mt-1.5 h-1 w-full max-w-48 rounded-full">
                    <div
                      className="h-1 rounded-full transition-[width,background-color] duration-500"
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
                <p className="text-text-secondary text-small mt-0.5">Sin membresía activa</p>
              )}
            </div>
            <ChevronRight className="text-text-muted h-4 w-4 shrink-0" aria-hidden />
          </Link>
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
                      {routineScheduledToday ? 'Hoy toca' : 'No está programada para hoy'} ·{' '}
                      {routine.exercise_count} ejercicios · {formatDifficulty(routine.difficulty)}
                    </p>
                    {routine.training_block_name && (
                      <p className="text-brand text-small mt-1 font-semibold">
                        Bloque: {routine.training_block_name}
                        {routine.training_block_objective
                          ? ` · ${routine.training_block_objective}`
                          : ''}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  className="mt-3 w-full"
                  disabled={primaryRoutineCompletedToday || !routineScheduledToday}
                  onClick={() => navigate(`/workout/${routine.id}`)}
                >
                  {!routineScheduledToday
                    ? 'Descanso programado'
                    : primaryRoutineCompletedToday
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
                framed={false}
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
                framed={false}
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

      {isMobile ? (
        <section aria-labelledby="member-links-title">
          <h2
            id="member-links-title"
            className="text-text-secondary text-small mb-1.5 px-1 font-medium"
          >
            Explorar
          </h2>
          <div className="divide-border border-border/80 bg-surface divide-y overflow-hidden rounded-xl border">
            {MEMBER_LINKS.map(({ to, icon: Icon, label, detail }) => (
              <Link key={to} to={to} className={MOBILE_LIST_ROW}>
                <Icon className="text-text-secondary h-4 w-4 shrink-0" aria-hidden />
                <span className="text-text min-w-0 flex-1 text-sm font-medium">{label}</span>
                <span className="text-text-muted text-small hidden truncate min-[360px]:block">
                  {detail}
                </span>
                <ChevronRight className="text-text-muted h-4 w-4 shrink-0" aria-hidden />
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <div className="stagger-fade-in grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
          <QuickAction
            compact
            to="/routines"
            icon={Dumbbell}
            title="Rutinas"
            description="Asignaciones activas"
            tone="blue"
          />
          <QuickAction
            compact
            to="/reservas"
            icon={CalendarDays}
            title="Reservas"
            description="Clases grupales"
            tone="blue"
          />
          <QuickAction
            compact
            to="/nutrition"
            icon={UtensilsCrossed}
            title="Nutrición"
            description="Macros y comidas"
            tone="emerald"
          />
          <QuickAction
            compact
            to="/history"
            icon={Clock}
            title="Historial"
            description="Sesiones anteriores"
            tone="blue"
          />
          <QuickAction
            compact
            to="/payments"
            icon={CreditCard}
            title="Pagos"
            description="Reportar o renovar"
            tone="emerald"
          />
        </div>
      )}

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
                        badge={<span className="text-small text-text-muted shrink-0">Próxima</span>}
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
                        badge={<span className="text-small text-warning shrink-0">Por vencer</span>}
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
                  <p className="text-text-secondary text-small mt-0.5">
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
                      badge={<span className="text-small text-text-muted shrink-0">Próxima</span>}
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
                      badge={<span className="text-small text-warning shrink-0">Por vencer</span>}
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
