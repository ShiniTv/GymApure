import { Router } from 'express';
import { query } from '../db/index.ts';
import { AuthRequest, authorize } from './middleware/auth.ts';
import {
  getExpiringCount,
  getExpiringSubscriptions,
  getExpiredThisWeekCount,
} from '../lib/expiringSubscriptions.ts';
import { getExpiryAlertDays, getExpirySettings } from '../lib/gymSettings.ts';
import { isEmailConfigured } from '../lib/notifications/email.ts';
import { isSmsConfigured } from '../lib/notifications/sms.ts';
import { isWhatsAppConfigured, getWhatsAppProvider, getWhatsAppProviderLabel } from '../lib/notifications/whatsapp.ts';

const router = Router();

router.get('/admin', authorize(['admin']), async (_req, res) => {
  try {
    const alertDays = await getExpiryAlertDays();
    const expirySettings = await getExpirySettings();

    const totalUsers = await query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM users'
    );
    const totalRevenue = await query<{ total: string | null }>(
      "SELECT SUM(amount_usd)::text AS total FROM payments WHERE status = 'approved'"
    );
    const pendingPayments = await query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM payments WHERE status = 'pending'"
    );
    const activeSubscriptions = await query<{ count: string }>(
      `SELECT COUNT(DISTINCT user_id)::text AS count FROM subscriptions
       WHERE status = 'active' AND end_date >= CURRENT_DATE`
    );
    const todayCheckIns = await query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM attendance WHERE check_in_time::date = CURRENT_DATE'
    );

    const revenueHistory = await query(
      `SELECT
        TO_CHAR(created_at, 'YYYY-MM') AS month,
        SUM(amount_usd) AS income
      FROM payments
      WHERE status = 'approved'
        AND created_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months'
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month ASC`
    );

    const [expiringSoon, expiredThisWeek, expiringList] = await Promise.all([
      getExpiringCount(alertDays),
      getExpiredThisWeekCount(),
      getExpiringSubscriptions(alertDays),
    ]);

    res.json({
      totalUsers: parseInt(totalUsers.rows[0]?.count || '0', 10),
      totalRevenue: parseFloat(totalRevenue.rows[0]?.total || '0'),
      pendingPayments: parseInt(pendingPayments.rows[0]?.count || '0', 10),
      activeSubscriptions: parseInt(activeSubscriptions.rows[0]?.count || '0', 10),
      todayCheckIns: parseInt(todayCheckIns.rows[0]?.count || '0', 10),
      expiringSoon,
      expiredThisWeek,
      expiringList,
      expiryAlertDays: alertDays,
      expirySettings: {
        ...expirySettings,
        providers: {
          email: isEmailConfigured(),
          sms: isSmsConfigured(),
          whatsapp: isWhatsAppConfigured(),
          whatsappProvider: getWhatsAppProvider(),
          whatsappProviderLabel: getWhatsAppProviderLabel(),
        },
      },
      revenueHistory: revenueHistory.rows,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.get('/trainer', authorize(['admin', 'trainer']), async (req: AuthRequest, res) => {
  const trainerId = req.user!.role === 'trainer' ? req.user!.id : null;

  try {
    const totalMembers = await query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM users WHERE role = 'member'"
    );
    const activeSessions = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM attendance
       WHERE check_in_time >= NOW() - INTERVAL '2 hours'
         AND check_out_time IS NULL`
    );

    const todayWorkoutsSql = trainerId
      ? `SELECT COUNT(*)::text AS count FROM workout_sessions ws
         JOIN routines r ON r.id = ws.routine_id
         WHERE ws.start_time::date = CURRENT_DATE AND r.trainer_id = $1`
      : 'SELECT COUNT(*)::text AS count FROM workout_sessions WHERE start_time::date = CURRENT_DATE';
    const todayWorkouts = await query<{ count: string }>(
      todayWorkoutsSql,
      trainerId ? [trainerId] : []
    );

    const routinesSql = trainerId
      ? 'SELECT COUNT(*)::text AS count FROM routines WHERE trainer_id = $1'
      : 'SELECT COUNT(*)::text AS count FROM routines';
    const routinesCreated = await query<{ count: string }>(
      routinesSql,
      trainerId ? [trainerId] : []
    );

    const assignedMembersSql = trainerId
      ? `SELECT COUNT(DISTINCT ur.user_id)::text AS count
         FROM user_routines ur
         JOIN routines r ON r.id = ur.routine_id
         WHERE r.trainer_id = $1`
      : `SELECT COUNT(DISTINCT user_id)::text AS count FROM user_routines`;
    const assignedMembers = await query<{ count: string }>(
      assignedMembersSql,
      trainerId ? [trainerId] : []
    );

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

    const recentActivities = await query(recentSql, trainerId ? [trainerId] : []);

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
    const subscription = await query(
      `SELECT s.start_date, s.end_date, s.status,
              m.name AS membership_name, m.duration_days, m.price_usd,
              GREATEST(0, s.end_date - CURRENT_DATE)::int AS days_remaining
       FROM subscriptions s
       JOIN memberships m ON m.id = s.membership_id
       WHERE s.user_id = $1 AND s.status = 'active' AND s.end_date >= CURRENT_DATE
       ORDER BY s.end_date DESC
       LIMIT 1`,
      [userId]
    );

    const routines = await query(
      `SELECT r.id, r.name, r.difficulty, ur.assigned_at, ur.start_date, ur.end_date,
              (SELECT COUNT(*)::int FROM routine_exercises WHERE routine_id = r.id) AS exercise_count
       FROM user_routines ur
       JOIN routines r ON r.id = ur.routine_id
       WHERE ur.user_id = $1
       ORDER BY ur.assigned_at DESC`,
      [userId]
    );

    const pendingPayments = await query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM payments WHERE user_id = $1 AND status = 'pending'",
      [userId]
    );

    const lastWorkout = await query(
      `SELECT ws.start_time, ws.end_time, r.name AS routine_name
       FROM workout_sessions ws
       JOIN routines r ON r.id = ws.routine_id
       WHERE ws.user_id = $1
       ORDER BY ws.start_time DESC
       LIMIT 1`,
      [userId]
    );

    const sub = subscription.rows[0] as {
      membership_name: string;
      duration_days: number;
      days_remaining: number;
      end_date: string;
    } | undefined;

    const progressPercent =
      sub && sub.duration_days > 0
        ? Math.min(100, Math.round((sub.days_remaining / sub.duration_days) * 100))
        : 0;

    res.json({
      subscription: sub ?? null,
      progressPercent,
      primaryRoutine: routines.rows[0] ?? null,
      assignedRoutinesCount: routines.rows.length,
      pendingPayments: parseInt(pendingPayments.rows[0]?.count || '0', 10),
      lastWorkout: lastWorkout.rows[0] ?? null,
      expiryAlertDays,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

export default router;
