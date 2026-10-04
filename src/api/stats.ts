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
import {
  getTodayRoutineChoice,
  listPendingMemberChoicesForTrainer,
  setTodayRoutineChoice,
} from '../lib/memberAgency.ts';
import { getCachedTrainerStats, setCachedTrainerStats } from '../lib/trainerStatsCache.ts';
import { getErrorMessage } from '../lib/errors.ts';

const router = asyncRouter();

interface MemberRoutineRow {
  id: number;
  name: string;
  difficulty: string;
  assigned_at: string;
  start_date: string | null;
  end_date: string | null;
  scheduled_weekdays: number[] | null;
  training_block_name: string | null;
  training_block_objective: string | null;
  exercise_count: number;
}

function resolvePrimaryMemberRoutine(
  routines: MemberRoutineRow[],
  todayChoiceId: number | null
): MemberRoutineRow | null {
  if (routines.length === 0) return null;
  const byId = new Map(routines.map((r) => [r.id, r]));
  if (todayChoiceId != null && byId.has(todayChoiceId)) {
    return byId.get(todayChoiceId)!;
  }
  const todayWeekday = new Date().getDay() || 7;
  const scheduledToday = routines.find(
    (r) => !r.scheduled_weekdays?.length || r.scheduled_weekdays.includes(todayWeekday)
  );
  return scheduledToday ?? routines[0] ?? null;
}

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
  revenueToday: number;
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
  demoLeadsPending: number;
}

async function buildAdminStats(): Promise<AdminStatsPayload> {
  const alertDays = await getExpiryAlertDays();

  const [
    paymentAgg,
    pendingAgg,
    activeSubscriptions,
    attendanceAgg,
    revenueHistory,
    revenueDaily,
    expiringList,
    expiredThisWeek,
    lastDoorAlert,
    equipmentStats,
    pausedSubs,
    demoPending,
  ] = await Promise.all([
    query<{ total_all: string; this_month: string; last_month: string; today: string }>(
      `SELECT
         COALESCE(SUM(amount_usd), 0)::text AS total_all,
         COALESCE(SUM(amount_usd) FILTER (
           WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
         ), 0)::text AS this_month,
         COALESCE(SUM(amount_usd) FILTER (
           WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
             AND created_at < DATE_TRUNC('month', CURRENT_DATE)
         ), 0)::text AS last_month,
         COALESCE(SUM(amount_usd) FILTER (
           WHERE ${sqlTodayRange('created_at')}
         ), 0)::text AS today
       FROM payments
       WHERE status = 'approved'`
    ),
    query<{ pending: string; pending_old: string }>(
      `SELECT
         COUNT(*)::text AS pending,
         COUNT(*) FILTER (WHERE created_at < NOW() - INTERVAL '2 days')::text AS pending_old
       FROM payments
       WHERE status = 'pending'`
    ),
    query<{ count: string }>(
      `SELECT COUNT(DISTINCT user_id)::text AS count FROM subscriptions
       WHERE status = 'active' AND end_date >= CURRENT_DATE`
    ),
    query<{ today: string; yesterday: string }>(
      `SELECT
         COUNT(*) FILTER (WHERE ${sqlTodayRange('check_in_time')})::text AS today,
         COUNT(*) FILTER (
           WHERE check_in_time >= CURRENT_DATE - INTERVAL '1 day'
             AND check_in_time < CURRENT_DATE
         )::text AS yesterday
       FROM attendance
       WHERE check_in_time >= CURRENT_DATE - INTERVAL '1 day'`
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
      `SELECT COUNT(*)::text AS count FROM subscriptions WHERE status = 'paused'`
    ),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM demo_requests WHERE status = 'pending'`
    ),
  ]);

  return {
    totalRevenue: parseFloat(paymentAgg.rows[0]?.total_all || '0'),
    pendingPayments: parseInt(pendingAgg.rows[0]?.pending || '0', 10),
    pendingPaymentsOlderThan2Days: parseInt(pendingAgg.rows[0]?.pending_old || '0', 10),
    activeSubscriptions: parseInt(activeSubscriptions.rows[0]?.count || '0', 10),
    pausedSubscriptions: parseInt(pausedSubs.rows[0]?.count || '0', 10),
    todayCheckIns: parseInt(attendanceAgg.rows[0]?.today || '0', 10),
    yesterdayCheckIns: parseInt(attendanceAgg.rows[0]?.yesterday || '0', 10),
    revenueThisMonth: parseFloat(paymentAgg.rows[0]?.this_month || '0'),
    revenueLastMonth: parseFloat(paymentAgg.rows[0]?.last_month || '0'),
    revenueToday: parseFloat(paymentAgg.rows[0]?.today || '0'),
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
      revenueToday: payload.revenueToday,
      expiringSoon: payload.expiringSoon,
      expiredThisWeek: payload.expiredThisWeek,
      equipmentOperational: payload.equipmentOperational,
      equipmentLimited: payload.equipmentLimited,
      equipmentMaintenance: payload.equipmentMaintenance,
      equipmentOutOfService: payload.equipmentOutOfService,
      equipmentInspectionsDue: payload.equipmentInspectionsDue,
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
  const cacheKey = trainerId ?? 'all';
  const cached = getCachedTrainerStats(cacheKey);
  if (cached) {
    return res.json(cached);
  }

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

    // Batch 1: Core counts and recent activities (max 5 parallel queries, avoiding pool contention)
    const [assignedRes, activeRes, workoutsRes, routinesRes, recentRes, totalRes] =
      await Promise.all([
        query<{ count: string }>(assignedMembersSql, trainerId ? [trainerId] : []),
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
        query<{ user_id: number; full_name: string; routine_name: string; start_time: string }>(
          recentSql,
          trainerId ? [trainerId] : []
        ),
        trainerId
          ? Promise.resolve(null)
          : query<{ count: string }>(
              "SELECT COUNT(*)::text AS count FROM users WHERE role = 'member'"
            ),
      ]);

    const assignedCount = parseInt(assignedRes.rows[0]?.count || '0', 10);
    const totalCount = trainerId ? assignedCount : parseInt(totalRes?.rows[0]?.count || '0', 10);

    let membersWithoutRoutines = 0;
    let expiringMembers: { id: number; full_name: string; days_remaining: number }[] = [];
    let inactiveMembers: {
      id: number;
      full_name: string;
      last_workout: string | null;
      days_since: number;
    }[] = [];
    let trainingToday: { id: number; full_name: string; check_in_time: string }[] = [];
    let membersWithoutAssessment: { id: number; full_name: string }[] = [];
    let staleCheckins: { id: number; full_name: string; days_since: number }[] = [];
    let recoveryAlerts: { id: number; full_name: string; discomfort: number; energy: number }[] =
      [];
    let remoteTrainingNow: { id: number; full_name: string; started_at: string }[] = [];
    let memberChoices: Awaited<ReturnType<typeof listPendingMemberChoicesForTrainer>> = [];

    // Batch 2 & 3: Trainer-specific lists executed in two micro-batches (max 4 concurrent queries each)
    if (trainerId) {
      const [withoutRoutinesRes, expiringRes, inactiveRes, trainingTodayRes] = await Promise.all([
        membersWithoutRoutinesSql
          ? query<{ count: string }>(membersWithoutRoutinesSql, [trainerId])
          : Promise.resolve({ rows: [{ count: '0' }] }),
        expiringMembersSql
          ? query<{ id: number; full_name: string; days_remaining: number }>(expiringMembersSql, [
              trainerId,
              alertDays,
            ])
          : Promise.resolve({ rows: [] }),
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
      ]);

      const [noAssessmentRes, staleCheckinsRes, recoveryRes, remoteRes, choices] =
        await Promise.all([
          query<{ id: number; full_name: string }>(
            `SELECT u.id, u.full_name
             FROM users u
             WHERE u.id IN (
               SELECT member_id FROM trainer_member_assignments WHERE trainer_id = $1
               UNION
               SELECT ur.user_id FROM user_routines ur
               JOIN routines r ON r.id = ur.routine_id WHERE r.trainer_id = $1
             )
               AND NOT EXISTS (
                 SELECT 1 FROM member_training_assessments assessment
                 WHERE assessment.member_id = u.id
               )
             ORDER BY u.full_name ASC
             LIMIT 8`,
            [trainerId]
          ),
          query<{ id: number; full_name: string; days_since: number }>(
            `SELECT u.id, u.full_name,
                    COALESCE((CURRENT_DATE - MAX(checkin.week_of)), 999)::int AS days_since
             FROM users u
             LEFT JOIN member_weekly_checkins checkin ON checkin.member_id = u.id
             WHERE u.id IN (
               SELECT member_id FROM trainer_member_assignments WHERE trainer_id = $1
               UNION
               SELECT ur.user_id FROM user_routines ur
               JOIN routines r ON r.id = ur.routine_id WHERE r.trainer_id = $1
             )
             GROUP BY u.id, u.full_name
             HAVING COALESCE(MAX(checkin.week_of), DATE '1970-01-01')
                    < CURRENT_DATE - INTERVAL '7 days'
             ORDER BY days_since DESC, u.full_name ASC
             LIMIT 8`,
            [trainerId]
          ),
          query<{ id: number; full_name: string; discomfort: number; energy: number }>(
            `SELECT DISTINCT ON (u.id) u.id, u.full_name, feedback.discomfort, feedback.energy
             FROM workout_feedback feedback
             JOIN workout_sessions ws ON ws.id = feedback.workout_session_id
             JOIN users u ON u.id = ws.user_id
             WHERE (feedback.discomfort >= 4 OR feedback.energy <= 2)
               AND (
                 u.id IN (SELECT member_id FROM trainer_member_assignments WHERE trainer_id = $1)
                 OR u.id IN (
                   SELECT ur.user_id FROM user_routines ur
                   JOIN routines r ON r.id = ur.routine_id WHERE r.trainer_id = $1
                 )
               )
             ORDER BY u.id, feedback.updated_at DESC
             LIMIT 8`,
            [trainerId]
          ),
          query<{ id: number; full_name: string; started_at: string }>(
            `SELECT u.id, u.full_name, rs.started_at::text
             FROM member_remote_sessions rs
             JOIN users u ON u.id = rs.member_id
             WHERE rs.ended_at IS NULL
               AND rs.started_at >= NOW() - INTERVAL '4 hours'
               AND (
                 u.id IN (SELECT member_id FROM trainer_member_assignments WHERE trainer_id = $1)
                 OR u.id IN (
                   SELECT ur.user_id FROM user_routines ur
                   JOIN routines r ON r.id = ur.routine_id WHERE r.trainer_id = $1
                 )
               )
             ORDER BY rs.started_at DESC
             LIMIT 12`,
            [trainerId]
          ),
          listPendingMemberChoicesForTrainer(trainerId),
        ]);

      membersWithoutRoutines = parseInt(withoutRoutinesRes.rows[0]?.count || '0', 10);
      expiringMembers = expiringRes.rows;
      inactiveMembers = inactiveRes.rows;
      trainingToday = trainingTodayRes.rows;
      membersWithoutAssessment = noAssessmentRes.rows;
      staleCheckins = staleCheckinsRes.rows;
      recoveryAlerts = recoveryRes.rows;
      remoteTrainingNow = remoteRes.rows;
      memberChoices = choices;
    }

    const payload = {
      totalMembers: totalCount,
      activeNow: parseInt(activeRes.rows[0]?.count || '0', 10),
      todayWorkouts: parseInt(workoutsRes.rows[0]?.count || '0', 10),
      routinesCreated: parseInt(routinesRes.rows[0]?.count || '0', 10),
      assignedMembers: assignedCount,
      recentActivities: recentRes.rows,
      membersWithoutRoutines,
      expiringMembers,
      inactiveMembers,
      trainingToday,
      membersWithoutAssessment,
      staleCheckins,
      recoveryAlerts,
      remoteTrainingNow,
      remoteActiveNow: remoteTrainingNow.length,
      memberChoices,
      expiryAlertDays: alertDays,
    };

    setCachedTrainerStats(cacheKey, payload);
    res.json(payload);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.put('/member/today-routine', authorize(['member']), async (req: AuthRequest, res) => {
  const routineId = parseInt(String(req.body?.routine_id ?? ''), 10);
  if (!Number.isSafeInteger(routineId) || routineId <= 0) {
    return res.status(400).json({ error: 'routine_id inválido' });
  }
  try {
    await setTodayRoutineChoice(req.user!.id, routineId);
    res.json({ success: true, routine_id: routineId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(400).json({ error: message });
  }
});

router.get('/member', authorize(['member']), async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const expiryAlertDays = await getExpiryAlertDays();

  try {
    const [subscription, routines, userContext, workoutMetrics, todayChoiceId] = await Promise.all([
      getActiveSubscriptionByUserId({ query }, userId).then((sub) => ({ rows: [sub] })),
      query<MemberRoutineRow>(
        `SELECT r.id, r.name, r.difficulty, ur.assigned_at, ur.start_date, ur.end_date,
                ur.scheduled_weekdays, block.name AS training_block_name,
                block.objective AS training_block_objective,
                COALESCE(ec.exercise_count, 0)::int AS exercise_count
         FROM user_routines ur
         JOIN routines r ON r.id = ur.routine_id
         LEFT JOIN member_training_blocks block ON block.id = ur.training_block_id
         LEFT JOIN (
           SELECT routine_id, COUNT(*)::int AS exercise_count
           FROM routine_exercises
           GROUP BY routine_id
         ) ec ON ec.routine_id = r.id
         WHERE ur.user_id = $1
         ORDER BY ur.assigned_at DESC`,
        [userId]
      ),
      query<{
        weekly_training_goal: number;
        pending_payments: number;
        has_trainer: boolean;
        has_pt_invoice: boolean;
      }>(
        `SELECT
           COALESCE((SELECT weekly_training_goal FROM users WHERE id = $1), 5)::int AS weekly_training_goal,
           (SELECT COUNT(*)::int FROM payments WHERE user_id = $1 AND status = 'pending') AS pending_payments,
           EXISTS (
             SELECT 1 FROM trainer_member_assignments WHERE member_id = $1
           ) AS has_trainer,
           EXISTS (
             SELECT 1 FROM trainer_invoices WHERE member_id = $1
           ) AS has_pt_invoice`,
        [userId]
      ),
      query<{
        workouts_this_month: number;
        workouts_this_week: number;
        workout_days: string[];
        completed_today_routine_ids: number[];
        last_workout: { routine_name: string; start_time: string; end_time: string } | null;
        active_sessions: {
          id: number;
          routine_id: number;
          routine_name: string;
          start_time: string;
        }[];
      }>(
        `WITH user_workouts AS (
           SELECT ws.id, ws.routine_id, ws.start_time, ws.end_time, ws.success, r.name AS routine_name
           FROM workout_sessions ws
           LEFT JOIN routines r ON r.id = ws.routine_id
           WHERE ws.user_id = $1
         ),
         completed AS (
           SELECT * FROM user_workouts
           WHERE end_time IS NOT NULL AND success = 1
         ),
         stats AS (
           SELECT
             COUNT(*) FILTER (WHERE start_time >= DATE_TRUNC('month', CURRENT_DATE))::int AS workouts_this_month,
             COUNT(DISTINCT DATE(start_time)) FILTER (WHERE start_time >= DATE_TRUNC('week', CURRENT_DATE))::int AS workouts_this_week,
             ARRAY(
               SELECT DISTINCT DATE(start_time)::text
               FROM completed
               ORDER BY DATE(start_time)::text DESC
               LIMIT 90
             ) AS workout_days,
             ARRAY(
               SELECT DISTINCT routine_id
               FROM completed
               WHERE ${sqlTodayRange('start_time')}
             ) AS completed_today_routine_ids,
             (
               SELECT json_build_object(
                 'start_time', start_time::text,
                 'end_time', end_time::text,
                 'routine_name', routine_name
               )
               FROM completed
               ORDER BY start_time DESC
               LIMIT 1
             ) AS last_workout
           FROM completed
         ),
         active_sessions AS (
           SELECT COALESCE(
             json_agg(
               json_build_object(
                 'id', id,
                 'routine_id', routine_id,
                 'routine_name', routine_name,
                 'start_time', start_time::text
               ) ORDER BY start_time DESC
             ),
             '[]'::json
           ) AS active
           FROM user_workouts
           WHERE end_time IS NULL
         )
         SELECT 
           COALESCE(s.workouts_this_month, 0)::int AS workouts_this_month,
           COALESCE(s.workouts_this_week, 0)::int AS workouts_this_week,
           COALESCE(s.workout_days, ARRAY[]::text[]) AS workout_days,
           COALESCE(s.completed_today_routine_ids, ARRAY[]::int[]) AS completed_today_routine_ids,
           s.last_workout,
           COALESCE(a.active, '[]'::json) AS active_sessions
         FROM stats s
         CROSS JOIN active_sessions a`,
        [userId]
      ),
      getTodayRoutineChoice(userId),
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

    const routineRows = routines.rows;
    const primaryRoutine = resolvePrimaryMemberRoutine(routineRows, todayChoiceId);

    const ctx = userContext.rows[0] ?? {
      weekly_training_goal: 5,
      pending_payments: 0,
      has_trainer: false,
      has_pt_invoice: false,
    };
    const wm = workoutMetrics.rows[0] ?? {
      workouts_this_month: 0,
      workouts_this_week: 0,
      workout_days: [],
      completed_today_routine_ids: [],
      last_workout: null,
      active_sessions: [],
    };

    res.json({
      subscription: sub ?? null,
      remainingPercent,
      primaryRoutine,
      todayRoutineId: todayChoiceId,
      assignedRoutines: routineRows,
      assignedRoutinesCount: routineRows.length,
      pendingPayments: ctx.pending_payments,
      lastWorkout: wm.last_workout,
      expiryAlertDays,
      workoutsThisMonth: wm.workouts_this_month,
      workoutsThisWeek: wm.workouts_this_week,
      workoutStreak: computeWorkoutStreak(wm.workout_days ?? []),
      weeklyTrainingGoal: ctx.weekly_training_goal,
      completedRoutineIdsToday: wm.completed_today_routine_ids ?? [],
      activeSessions: wm.active_sessions ?? [],
      hasTrainerAssignment: Boolean(ctx.has_trainer),
      showPtBilling: Boolean(ctx.has_trainer || ctx.has_pt_invoice),
    });
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
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
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

export default router;
