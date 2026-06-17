import { Router } from 'express';
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
  setCachedAdminStats,
} from '../lib/adminStatsCache.ts';
import { sqlTodayRange } from '../lib/sqlDateRanges.ts';

const router = Router();

export interface AdminStatsPayload {
  totalRevenue: number;
  pendingPayments: number;
  activeSubscriptions: number;
  todayCheckIns: number;
  expiringSoon: number;
  expiredThisWeek: number;
  expiringList: Awaited<ReturnType<typeof getExpiringSubscriptions>>;
  expiryAlertDays: number;
  revenueHistory: { month: string; income: string }[];
  lastDoorAlert: LastDoorAlert | null;
}

async function buildAdminStats(): Promise<AdminStatsPayload> {
  const alertDays = await getExpiryAlertDays();

  const [
    totalRevenue,
    pendingPayments,
    activeSubscriptions,
    todayCheckIns,
    revenueHistory,
    expiringList,
    expiredThisWeek,
    lastDoorAlert,
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
    getExpiringSubscriptions(alertDays),
    getExpiredThisWeekCount(),
    getLastDoorAlert(alertDays),
  ]);

  return {
    totalRevenue: parseFloat(totalRevenue.rows[0]?.total || '0'),
    pendingPayments: parseInt(pendingPayments.rows[0]?.count || '0', 10),
    activeSubscriptions: parseInt(activeSubscriptions.rows[0]?.count || '0', 10),
    todayCheckIns: parseInt(todayCheckIns.rows[0]?.count || '0', 10),
    expiringSoon: expiringList.length,
    expiredThisWeek,
    expiringList,
    expiryAlertDays: alertDays,
    revenueHistory: revenueHistory.rows,
    lastDoorAlert,
  };
}

router.get('/admin/summary', authorize(['admin']), async (_req, res) => {
  try {
    const cached = getCachedAdminStats<AdminStatsPayload>();
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

router.get('/admin', authorize(['admin']), async (_req, res) => {
  try {
    const cached = getCachedAdminStats<AdminStatsPayload>();
    if (cached) {
      return res.json(cached);
    }

    const payload = await buildAdminStats();
    setCachedAdminStats(payload);
    res.json(payload);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.get('/trainer', authorize(['admin', 'trainer']), async (req: AuthRequest, res) => {
  const trainerId = req.user!.role === 'trainer' ? req.user!.id : null;

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
      ? `SELECT COUNT(DISTINCT ur.user_id)::text AS count
         FROM user_routines ur
         JOIN routines r ON r.id = ur.routine_id
         WHERE r.trainer_id = $1`
      : `SELECT COUNT(DISTINCT user_id)::text AS count FROM user_routines`;

    const recentSql = trainerId
      ? `SELECT u.full_name, r.name AS routine_name, ws.start_time
         FROM workout_sessions ws
         JOIN users u ON ws.user_id = u.id
         JOIN routines r ON ws.routine_id = r.id
         WHERE r.trainer_id = $1
         ORDER BY ws.start_time DESC
         LIMIT 5`
      : `SELECT u.full_name, r.name AS routine_name, ws.start_time
         FROM workout_sessions ws
         JOIN users u ON ws.user_id = u.id
         JOIN routines r ON ws.routine_id = r.id
         ORDER BY ws.start_time DESC
         LIMIT 5`;

    const [totalMembers, activeSessions, todayWorkouts, routinesCreated, assignedMembers, recentActivities] =
      await Promise.all([
        query<{ count: string }>("SELECT COUNT(*)::text AS count FROM users WHERE role = 'member'"),
        query<{ count: string }>(
          `SELECT COUNT(*)::text AS count FROM attendance
           WHERE check_in_time >= NOW() - INTERVAL '2 hours'
             AND check_out_time IS NULL`
        ),
        query<{ count: string }>(todayWorkoutsSql, trainerId ? [trainerId] : []),
        query<{ count: string }>(routinesSql, trainerId ? [trainerId] : []),
        query<{ count: string }>(assignedMembersSql, trainerId ? [trainerId] : []),
        query<{ full_name: string; routine_name: string; start_time: string }>(
          recentSql,
          trainerId ? [trainerId] : []
        ),
      ]);

    res.json({
      totalMembers: parseInt(totalMembers.rows[0]?.count || '0', 10),
      activeNow: parseInt(activeSessions.rows[0]?.count || '0', 10),
      todayWorkouts: parseInt(todayWorkouts.rows[0]?.count || '0', 10),
      routinesCreated: parseInt(routinesCreated.rows[0]?.count || '0', 10),
      assignedMembers: parseInt(assignedMembers.rows[0]?.count || '0', 10),
      recentActivities: recentActivities.rows,
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
    const [subscription, routines, pendingPayments, lastWorkout, workoutsThisMonth] = await Promise.all([
      query(
        `SELECT s.start_date, s.end_date, s.status,
                m.name AS membership_name, m.duration_days, m.price_usd,
                GREATEST(0, s.end_date - CURRENT_DATE)::int AS days_remaining
         FROM subscriptions s
         JOIN memberships m ON m.id = s.membership_id
         WHERE s.user_id = $1 AND s.status = 'active' AND s.end_date >= CURRENT_DATE
         ORDER BY s.end_date DESC
         LIMIT 1`,
        [userId]
      ),
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
    ]);

    const sub = subscription.rows[0] as {
      membership_name: string;
      duration_days: number;
      days_remaining: number;
      start_date: string;
      end_date: string;
    } | undefined;

    let progressPercent = 0;
    if (sub) {
      const startMs = new Date(sub.start_date).getTime();
      const endMs = new Date(sub.end_date).getTime();
      const totalDays = Math.max(1, Math.round((endMs - startMs) / 86_400_000));
      const elapsed = Math.max(0, totalDays - sub.days_remaining);
      progressPercent = Math.min(100, Math.round((elapsed / totalDays) * 100));
    }

    res.json({
      subscription: sub ?? null,
      progressPercent,
      primaryRoutine: routines.rows[0] ?? null,
      assignedRoutinesCount: routines.rows.length,
      pendingPayments: parseInt(pendingPayments.rows[0]?.count || '0', 10),
      lastWorkout: lastWorkout.rows[0] ?? null,
      expiryAlertDays,
      workoutsThisMonth: parseInt(workoutsThisMonth.rows[0]?.count || '0', 10),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

export default router;
