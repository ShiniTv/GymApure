import { asyncRouter } from './middleware/asyncRouter.ts';
import { query } from '../db/index.ts';
import { AuthRequest, authorize } from './middleware/auth.ts';
import {
  getExpiringSubscriptions,
  getExpiredThisWeekCount,
  getLastDoorAlert,
  type LastDoorAlert,
} from '../lib/expiringSubscriptions.ts';
import { getExpiryAlertDays } from '../lib/gymSettings.ts';
import {
  getCachedAdminStats,
  getStaleAdminStats,
  setCachedAdminStats,
} from '../lib/adminStatsCache.ts';
import { sqlTodayRange } from '../lib/sqlDateRanges.ts';
import { getActiveSubscriptionByUserId } from '../lib/subscriptions.ts';
import { computeSubscriptionRemainingPercent } from '../lib/expiryUtils.ts';
import { computeWorkoutStreak } from '../lib/workoutStreak.ts';
import { getEquipmentStatsSummary } from '../lib/equipmentInspectionAlerts.ts';
import { RECEPTION_STAFF } from '../lib/roles.ts';

const router = asyncRouter();

export interface AdminStatsPayload {
  totalRevenue: number;
  pendingPayments: number;
  pendingPaymentsOlderThan2Days: number;
  activeSubscriptions: number;
  pausedSubscriptions: number;
  todayCheckIns: number;
  yesterdayCheckIns: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  expiringSoon: number;
  expiredThisWeek: number;
  expiringList: Awaited<ReturnType<typeof getExpiringSubscriptions>>;
  expiryAlertDays: number;
  revenueHistory: { month: string; income: string }[];
  revenueDaily: { date: string; income: string }[];
  lastDoorAlert: LastDoorAlert | null;
  equipmentOperational: number;
  equipmentLimited: number;
  equipmentMaintenance: number;
  equipmentOutOfService: number;
  equipmentInspectionsDue: number;
  classSessionsToday: number;
  classBookingsToday: number;
  classCapacityToday: number;
  classFillPercentToday: number;
  demoLeadsPending: number;
}

async function buildAdminStats(): Promise<AdminStatsPayload> {
  const alertDays = await getExpiryAlertDays();

  const [
    totalRevenue,
    pendingPayments,
    activeSubscriptions,
    todayCheckIns,
    yesterdayCheckIns,
    revenueThisMonth,
    revenueLastMonth,
    revenueHistory,
    revenueDaily,
    expiringList,
    expiredThisWeek,
    lastDoorAlert,
    equipmentStats,
    pendingOld,
    pausedSubs,
    classToday,
    demoPending,
  ] = await Promise.all([
    query<{ total: string | null }>(
      "SELECT SUM(amount_usd)::text AS total FROM payments WHERE status = 'approved'"
    ),
    query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM payments WHERE status = 'pending'"
    ),
    query<{ count: string }>(
      `SELECT COUNT(DISTINCT user_id)::text AS count FROM subscriptions
       WHERE status = 'active' AND end_date >= CURRENT_DATE`
    ),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM attendance WHERE ${sqlTodayRange('check_in_time')}`
    ),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM attendance
       WHERE check_in_time >= CURRENT_DATE - INTERVAL '1 day'
         AND check_in_time < CURRENT_DATE`
    ),
    query<{ total: string | null }>(
      `SELECT SUM(amount_usd)::text AS total FROM payments
       WHERE status = 'approved'
         AND created_at >= DATE_TRUNC('month', CURRENT_DATE)`
    ),
    query<{ total: string | null }>(
      `SELECT SUM(amount_usd)::text AS total FROM payments
       WHERE status = 'approved'
         AND created_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
         AND created_at < DATE_TRUNC('month', CURRENT_DATE)`
    ),
    query<{ month: string; income: string }>(
      `SELECT
        TO_CHAR(created_at, 'YYYY-MM') AS month,
        SUM(amount_usd)::text AS income
      FROM payments
      WHERE status = 'approved'
        AND created_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months'
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month ASC`
    ),
    query<{ date: string; income: string }>(
      `SELECT
        TO_CHAR(created_at::date, 'YYYY-MM-DD') AS date,
        SUM(amount_usd)::text AS income
      FROM payments
      WHERE status = 'approved'
        AND created_at >= CURRENT_DATE - INTERVAL '29 days'
      GROUP BY created_at::date
      ORDER BY date ASC`
    ),
    getExpiringSubscriptions(alertDays),
    getExpiredThisWeekCount(),
    getLastDoorAlert(alertDays),
    getEquipmentStatsSummary(),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM payments
       WHERE status = 'pending' AND created_at < NOW() - INTERVAL '2 days'`
    ),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM subscriptions WHERE status = 'paused'`
    ),
    query<{ sessions: string; bookings: string; capacity: string }>(
      `SELECT
         COUNT(cs.id)::text AS sessions,
         COALESCE(SUM(b.booked_count), 0)::text AS bookings,
         COALESCE(SUM(cs.capacity), 0)::text AS capacity
       FROM class_sessions cs
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS booked_count
         FROM class_bookings cb
         WHERE cb.session_id = cs.id AND cb.status IN ('booked', 'attended', 'waitlisted')
       ) b ON true
       WHERE cs.status = 'scheduled'
         AND cs.starts_at >= CURRENT_DATE
         AND cs.starts_at < CURRENT_DATE + INTERVAL '1 day'`
    ),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM demo_requests WHERE status = 'pending'`
    ),
  ]);

  const classSessionsToday = parseInt(classToday.rows[0]?.sessions || '0', 10);
  const classBookingsToday = parseInt(classToday.rows[0]?.bookings || '0', 10);
  const classCapacityToday = parseInt(classToday.rows[0]?.capacity || '0', 10);
  const classFillPercentToday =
    classCapacityToday > 0 ? Math.round((classBookingsToday / classCapacityToday) * 100) : 0;

  return {
    totalRevenue: parseFloat(totalRevenue.rows[0]?.total || '0'),
    pendingPayments: parseInt(pendingPayments.rows[0]?.count || '0', 10),
    pendingPaymentsOlderThan2Days: parseInt(pendingOld.rows[0]?.count || '0', 10),
    activeSubscriptions: parseInt(activeSubscriptions.rows[0]?.count || '0', 10),
    pausedSubscriptions: parseInt(pausedSubs.rows[0]?.count || '0', 10),
    todayCheckIns: parseInt(todayCheckIns.rows[0]?.count || '0', 10),
    yesterdayCheckIns: parseInt(yesterdayCheckIns.rows[0]?.count || '0', 10),
    revenueThisMonth: parseFloat(revenueThisMonth.rows[0]?.total || '0'),
    revenueLastMonth: parseFloat(revenueLastMonth.rows[0]?.total || '0'),
    expiringSoon: expiringList.length,
    expiredThisWeek,
    expiringList,
    expiryAlertDays: alertDays,
    revenueHistory: revenueHistory.rows,
    revenueDaily: revenueDaily.rows,
    lastDoorAlert,
    equipmentOperational: equipmentStats.operational,
    equipmentLimited: equipmentStats.limited,
    equipmentMaintenance: equipmentStats.maintenance,
    equipmentOutOfService: equipmentStats.outOfService,
    equipmentInspectionsDue: equipmentStats.inspectionsDueThisWeek,
    classSessionsToday,
    classBookingsToday,
    classCapacityToday,
    classFillPercentToday,
    demoLeadsPending: parseInt(demoPending.rows[0]?.count || '0', 10),
  };
}

function pickAdminStatsParts(
  payload: AdminStatsPayload,
  parts: Set<string>
): Partial<AdminStatsPayload> {
  if (parts.size === 0 || parts.has('all')) return payload;

  const out: Partial<AdminStatsPayload> = { expiryAlertDays: payload.expiryAlertDays };

  if (parts.has('kpis')) {
    Object.assign(out, {
      totalRevenue: payload.totalRevenue,
      pendingPayments: payload.pendingPayments,
      pendingPaymentsOlderThan2Days: payload.pendingPaymentsOlderThan2Days,
      activeSubscriptions: payload.activeSubscriptions,
      pausedSubscriptions: payload.pausedSubscriptions,
      todayCheckIns: payload.todayCheckIns,
      yesterdayCheckIns: payload.yesterdayCheckIns,
      revenueThisMonth: payload.revenueThisMonth,
      revenueLastMonth: payload.revenueLastMonth,
      expiringSoon: payload.expiringSoon,
      expiredThisWeek: payload.expiredThisWeek,
      equipmentOperational: payload.equipmentOperational,
      equipmentLimited: payload.equipmentLimited,
      equipmentMaintenance: payload.equipmentMaintenance,
      equipmentOutOfService: payload.equipmentOutOfService,
      equipmentInspectionsDue: payload.equipmentInspectionsDue,
      classSessionsToday: payload.classSessionsToday,
      classBookingsToday: payload.classBookingsToday,
      classCapacityToday: payload.classCapacityToday,
      classFillPercentToday: payload.classFillPercentToday,
      demoLeadsPending: payload.demoLeadsPending,
    });
  }
  if (parts.has('charts')) {
    out.revenueHistory = payload.revenueHistory;
    out.revenueDaily = payload.revenueDaily;
  }
  if (parts.has('lists')) {
    out.expiringList = payload.expiringList;
    out.lastDoorAlert = payload.lastDoorAlert;
  }
  return out;
}

router.get('/admin/summary', authorize(['admin']), async (_req, res) => {
  try {
    const cached = getCachedAdminStats() as AdminStatsPayload | null;
    if (cached) {
      return res.json({ expiringSoon: cached.expiringSoon });
    }
    const payload = await buildAdminStats();
    setCachedAdminStats(payload);
    res.json({ expiringSoon: payload.expiringSoon });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

let adminStatsRebuildInFlight: Promise<void> | null = null;

function refreshAdminStatsInBackground(): void {
  if (adminStatsRebuildInFlight) return;
  adminStatsRebuildInFlight = buildAdminStats()
    .then((payload) => {
      setCachedAdminStats(payload);
    })
    .catch(() => {
      /* keep stale payload; next request can retry */
    })
    .finally(() => {
      adminStatsRebuildInFlight = null;
    });
}

router.get('/admin', authorize(['admin']), async (req, res) => {
  try {
    const partsRaw = typeof req.query.parts === 'string' ? req.query.parts : 'all';
    const parts = new Set(
      partsRaw
        .split(',')
        .map((p) => p.trim().toLowerCase())
        .filter(Boolean)
    );

    const cached = getCachedAdminStats() as AdminStatsPayload | null;
    if (cached) {
      return res.json(pickAdminStatsParts(cached, parts));
    }

    const stale = getStaleAdminStats() as AdminStatsPayload | null;
    if (stale) {
      refreshAdminStatsInBackground();
      return res.json(pickAdminStatsParts(stale, parts));
    }

    const payload = await buildAdminStats();
    setCachedAdminStats(payload);
    res.json(pickAdminStatsParts(payload, parts));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.get('/trainer', authorize(['trainer']), async (req: AuthRequest, res) => {
  const trainerId = req.user!.role === 'trainer' ? req.user!.id : null;
  const alertDays = await getExpiryAlertDays();

  try {
    const todayWorkoutsSql = trainerId
      ? `SELECT COUNT(*)::text AS count FROM workout_sessions ws
         JOIN routines r ON r.id = ws.routine_id
         WHERE ${sqlTodayRange('ws.start_time')} AND r.trainer_id = $1`
      : `SELECT COUNT(*)::text AS count FROM workout_sessions WHERE ${sqlTodayRange('start_time')}`;

    const routinesSql = trainerId
      ? 'SELECT COUNT(*)::text AS count FROM routines WHERE trainer_id = $1'
      : 'SELECT COUNT(*)::text AS count FROM routines';

    const assignedMembersSql = trainerId
      ? `SELECT COUNT(DISTINCT member_id)::text AS count FROM (
           SELECT member_id FROM trainer_member_assignments WHERE trainer_id = $1
           UNION
           SELECT ur.user_id AS member_id FROM user_routines ur
           JOIN routines r ON r.id = ur.routine_id WHERE r.trainer_id = $1
         ) t`
      : `SELECT COUNT(DISTINCT user_id)::text AS count FROM user_routines`;

    const recentSql = trainerId
      ? `SELECT u.id AS user_id, u.full_name, r.name AS routine_name, ws.start_time
         FROM workout_sessions ws
         JOIN users u ON ws.user_id = u.id
         JOIN routines r ON ws.routine_id = r.id
         WHERE r.trainer_id = $1
         ORDER BY ws.start_time DESC
         LIMIT 5`
      : `SELECT u.id AS user_id, u.full_name, r.name AS routine_name, ws.start_time
         FROM workout_sessions ws
         JOIN users u ON ws.user_id = u.id
         JOIN routines r ON ws.routine_id = r.id
         ORDER BY ws.start_time DESC
         LIMIT 5`;

    const membersWithoutRoutinesSql = trainerId
      ? `SELECT COUNT(*)::text AS count
         FROM (
           SELECT member_id AS user_id FROM trainer_member_assignments WHERE trainer_id = $1
           UNION
           SELECT DISTINCT ur.user_id
           FROM user_routines ur
           JOIN routines r ON r.id = ur.routine_id
           WHERE r.trainer_id = $1
         ) assigned
         WHERE NOT EXISTS (
           SELECT 1 FROM user_routines ur
           JOIN routines r ON r.id = ur.routine_id
           WHERE ur.user_id = assigned.user_id
             AND r.trainer_id = $1
             AND ur.start_date <= CURRENT_DATE
             AND ur.end_date >= CURRENT_DATE
         )`
      : null;

    const assignedActiveNowSql = trainerId
      ? `SELECT COUNT(DISTINCT u.id)::text AS count
         FROM users u
         JOIN attendance a ON a.user_id = u.id
         WHERE a.check_in_time >= NOW() - INTERVAL '2 hours'
           AND a.check_out_time IS NULL
           AND u.id IN (
             SELECT member_id FROM trainer_member_assignments WHERE trainer_id = $1
             UNION
             SELECT DISTINCT ur.user_id FROM user_routines ur
             JOIN routines r ON r.id = ur.routine_id
             WHERE r.trainer_id = $1
           )`
      : null;

    const expiringMembersSql = trainerId
      ? `SELECT DISTINCT u.id, u.full_name, sub.days_remaining
         FROM users u
         JOIN LATERAL (
           SELECT GREATEST(0, s.end_date - CURRENT_DATE)::int AS days_remaining
           FROM subscriptions s
           WHERE s.user_id = u.id AND s.status = 'active' AND s.end_date >= CURRENT_DATE
           ORDER BY s.end_date DESC
           LIMIT 1
         ) sub ON true
         WHERE u.id IN (
           SELECT member_id FROM trainer_member_assignments WHERE trainer_id = $1
           UNION
           SELECT ur.user_id FROM user_routines ur
           JOIN routines r ON r.id = ur.routine_id WHERE r.trainer_id = $1
         )
           AND sub.days_remaining IS NOT NULL AND sub.days_remaining <= $2
         ORDER BY sub.days_remaining ASC
         LIMIT 5`
      : null;

    const trainerExtrasPromise = trainerId
      ? Promise.all([
          membersWithoutRoutinesSql
            ? query<{ count: string }>(membersWithoutRoutinesSql, [trainerId])
            : Promise.resolve({ rows: [{ count: '0' }] }),
          expiringMembersSql
            ? query<{ id: number; full_name: string; days_remaining: number }>(expiringMembersSql, [
                trainerId,
                alertDays,
              ])
            : Promise.resolve({
                rows: [] as { id: number; full_name: string; days_remaining: number }[],
              }),
          query<{
            id: number;
            full_name: string;
            last_workout: string | null;
            days_since: number;
          }>(
            `SELECT u.id, u.full_name,
                    MAX(ws.start_time)::text AS last_workout,
                    COALESCE((CURRENT_DATE - MAX(ws.start_time)::date), 999)::int AS days_since
             FROM users u
             LEFT JOIN workout_sessions ws ON ws.user_id = u.id
             WHERE u.role = 'member' AND u.status = 'active'
               AND (
                 u.id IN (SELECT member_id FROM trainer_member_assignments WHERE trainer_id = $1)
                 OR u.id IN (
                   SELECT ur.user_id FROM user_routines ur
                   JOIN routines r ON r.id = ur.routine_id WHERE r.trainer_id = $1
                 )
               )
             GROUP BY u.id, u.full_name
             HAVING COALESCE(MAX(ws.start_time)::date, DATE '1970-01-01')
                    < CURRENT_DATE - INTERVAL '2 days'
             ORDER BY days_since DESC
             LIMIT 8`,
            [trainerId]
          ),
          query<{ id: number; full_name: string; check_in_time: string }>(
            `SELECT u.id, u.full_name, a.check_in_time::text
             FROM attendance a
             JOIN users u ON u.id = a.user_id
             WHERE ${sqlTodayRange('a.check_in_time')}
               AND a.check_out_time IS NULL
               AND (
                 u.id IN (SELECT member_id FROM trainer_member_assignments WHERE trainer_id = $1)
                 OR u.id IN (
                   SELECT ur.user_id FROM user_routines ur
                   JOIN routines r ON r.id = ur.routine_id WHERE r.trainer_id = $1
                 )
               )
             ORDER BY a.check_in_time DESC
             LIMIT 12`,
            [trainerId]
          ),
        ])
      : Promise.resolve(null);

    const [
      totalMembers,
      activeSessions,
      todayWorkouts,
      routinesCreated,
      assignedMembers,
      recentActivities,
      trainerExtras,
    ] = await Promise.all([
      query<{ count: string }>(
        trainerId
          ? `SELECT COUNT(DISTINCT member_id)::text AS count FROM (
               SELECT member_id FROM trainer_member_assignments WHERE trainer_id = $1
               UNION
               SELECT ur.user_id AS member_id FROM user_routines ur
               JOIN routines r ON r.id = ur.routine_id WHERE r.trainer_id = $1
             ) t`
          : "SELECT COUNT(*)::text AS count FROM users WHERE role = 'member'",
        trainerId ? [trainerId] : []
      ),
      query<{ count: string }>(
        trainerId && assignedActiveNowSql
          ? assignedActiveNowSql
          : `SELECT COUNT(*)::text AS count FROM attendance
             WHERE check_in_time >= NOW() - INTERVAL '2 hours'
               AND check_out_time IS NULL`,
        trainerId ? [trainerId] : []
      ),
      query<{ count: string }>(todayWorkoutsSql, trainerId ? [trainerId] : []),
      query<{ count: string }>(routinesSql, trainerId ? [trainerId] : []),
      query<{ count: string }>(assignedMembersSql, trainerId ? [trainerId] : []),
      query<{ user_id: number; full_name: string; routine_name: string; start_time: string }>(
        recentSql,
        trainerId ? [trainerId] : []
      ),
      trainerExtrasPromise,
    ]);

    const membersWithoutRoutines = trainerExtras
      ? parseInt(trainerExtras[0].rows[0]?.count || '0', 10)
      : 0;
    const expiringMembers = trainerExtras ? trainerExtras[1].rows : [];
    const inactiveMembers = trainerExtras ? trainerExtras[2].rows : [];
    const trainingToday = trainerExtras ? trainerExtras[3].rows : [];

    res.json({
      totalMembers: parseInt(totalMembers.rows[0]?.count || '0', 10),
      activeNow: parseInt(activeSessions.rows[0]?.count || '0', 10),
      todayWorkouts: parseInt(todayWorkouts.rows[0]?.count || '0', 10),
      routinesCreated: parseInt(routinesCreated.rows[0]?.count || '0', 10),
      assignedMembers: parseInt(assignedMembers.rows[0]?.count || '0', 10),
      recentActivities: recentActivities.rows,
      membersWithoutRoutines,
      expiringMembers,
      inactiveMembers,
      trainingToday,
      expiryAlertDays: alertDays,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.get('/member', authorize(['member']), async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const expiryAlertDays = await getExpiryAlertDays();

  try {
    const [
      subscription,
      routines,
      pendingPayments,
      lastWorkout,
      workoutsThisMonth,
      workoutsThisWeek,
      workoutDays,
      memberProfile,
      completedTodayRows,
      activeSessionRows,
    ] = await Promise.all([
      getActiveSubscriptionByUserId({ query }, userId).then((sub) => ({ rows: [sub] })),
      query(
        `SELECT r.id, r.name, r.difficulty, ur.assigned_at, ur.start_date, ur.end_date,
                COALESCE(ec.exercise_count, 0)::int AS exercise_count
         FROM user_routines ur
         JOIN routines r ON r.id = ur.routine_id
         LEFT JOIN (
           SELECT routine_id, COUNT(*)::int AS exercise_count
           FROM routine_exercises
           GROUP BY routine_id
         ) ec ON ec.routine_id = r.id
         WHERE ur.user_id = $1
         ORDER BY ur.assigned_at DESC`,
        [userId]
      ),
      query<{ count: string }>(
        "SELECT COUNT(*)::text AS count FROM payments WHERE user_id = $1 AND status = 'pending'",
        [userId]
      ),
      query(
        `SELECT ws.start_time, ws.end_time, r.name AS routine_name
         FROM workout_sessions ws
         JOIN routines r ON r.id = ws.routine_id
         WHERE ws.user_id = $1
         ORDER BY ws.start_time DESC
         LIMIT 1`,
        [userId]
      ),
      query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM workout_sessions
         WHERE user_id = $1 AND start_time >= DATE_TRUNC('month', CURRENT_DATE)`,
        [userId]
      ),
      query<{ count: string }>(
        `SELECT COUNT(DISTINCT DATE(start_time))::text AS count
         FROM workout_sessions
         WHERE user_id = $1
           AND end_time IS NOT NULL
           AND start_time >= DATE_TRUNC('week', CURRENT_DATE)`,
        [userId]
      ),
      query<{ d: string }>(
        `SELECT DISTINCT DATE(start_time)::text AS d FROM workout_sessions
         WHERE user_id = $1 AND end_time IS NOT NULL
         ORDER BY d DESC LIMIT 90`,
        [userId]
      ),
      query<{ weekly_training_goal: number }>(
        `SELECT weekly_training_goal FROM users WHERE id = $1`,
        [userId]
      ),
      query<{ routine_id: number }>(
        `SELECT DISTINCT routine_id FROM workout_sessions
         WHERE user_id = $1
           AND end_time IS NOT NULL
           AND success = 1
           AND ${sqlTodayRange('start_time')}`,
        [userId]
      ),
      query<{ id: number; routine_id: number; routine_name: string; start_time: string }>(
        `SELECT ws.id, ws.routine_id, r.name AS routine_name, ws.start_time
         FROM workout_sessions ws
         JOIN routines r ON ws.routine_id = r.id
         WHERE ws.user_id = $1 AND ws.end_time IS NULL
         ORDER BY ws.start_time DESC`,
        [userId]
      ),
    ]);

    const sub = subscription.rows[0] as
      | {
          membership_name: string;
          duration_days: number;
          days_remaining: number;
          start_date: string;
          end_date: string;
        }
      | undefined;

    let remainingPercent = 0;
    if (sub) {
      remainingPercent = computeSubscriptionRemainingPercent(
        sub.days_remaining,
        sub.start_date,
        sub.end_date
      );
    }

    res.json({
      subscription: sub ?? null,
      remainingPercent,
      primaryRoutine: routines.rows[0] ?? null,
      assignedRoutinesCount: routines.rows.length,
      pendingPayments: parseInt(pendingPayments.rows[0]?.count || '0', 10),
      lastWorkout: lastWorkout.rows[0] ?? null,
      expiryAlertDays,
      workoutsThisMonth: parseInt(workoutsThisMonth.rows[0]?.count || '0', 10),
      workoutsThisWeek: parseInt(workoutsThisWeek.rows[0]?.count || '0', 10),
      workoutStreak: computeWorkoutStreak(workoutDays.rows.map((r) => r.d)),
      weeklyTrainingGoal: memberProfile.rows[0]?.weekly_training_goal ?? 5,
      completedRoutineIdsToday: completedTodayRows.rows.map((r) => r.routine_id),
      activeSessions: activeSessionRows.rows,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.get('/reception', authorize(RECEPTION_STAFF), async (_req, res) => {
  try {
    const [todayCheckIns, insideNow, pendingPayments] = await Promise.all([
      query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM attendance WHERE ${sqlTodayRange('check_in_time')}`
      ),
      query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM attendance
         WHERE ${sqlTodayRange('check_in_time')} AND check_out_time IS NULL`
      ),
      query<{ count: string }>(
        "SELECT COUNT(*)::text AS count FROM payments WHERE status = 'pending'"
      ),
    ]);

    res.json({
      todayCheckIns: parseInt(todayCheckIns.rows[0]?.count || '0', 10),
      insideNow: parseInt(insideNow.rows[0]?.count || '0', 10),
      pendingPayments: parseInt(pendingPayments.rows[0]?.count || '0', 10),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

export default router;
