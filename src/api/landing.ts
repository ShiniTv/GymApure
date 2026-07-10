import { asyncRouter } from './middleware/asyncRouter.ts';
import crypto from 'crypto';
import { query } from '../db/index.ts';
import { env } from '../config/env.ts';
import { sqlTodayRange } from '../lib/sqlDateRanges.ts';
import { demoRequestSchema, formatZodDemoRequestError } from '../lib/demoRequestSchema.ts';
import { sendEmail, demoRequestAdminEmail, demoRequestConfirmationEmail } from '../lib/email.ts';
import { logger } from '../lib/logger.ts';
import { landingDemoRateLimiter } from './middleware/rateLimit.ts';
import {
  LANDING_SHOWCASE,
  getReportRange,
  toLandingShowcaseStatic,
  toLandingShowcaseIllustration,
  type LandingShowcaseData,
} from '../config/landingShowcase.ts';

const router = asyncRouter();

const DEFAULT_DEMO_NOTIFY_EMAIL = 'soporte.gymapure@gmail.com';

function resolveDemoNotifyEmails(): string[] {
  const raw = env.ADMIN_NOTIFY_EMAILS?.trim();
  if (raw) {
    return raw
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);
  }
  return [DEFAULT_DEMO_NOTIFY_EMAIL];
}

function hashClientIp(ip: string | undefined): string | null {
  if (!ip) return null;
  return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 32);
}

async function isLandingDemoSeeded(): Promise<boolean> {
  try {
    const result = await query<{ value: string }>(
      `SELECT value FROM gym_settings WHERE key = 'landing_demo_seeded' LIMIT 1`
    );
    return result.rows[0]?.value === 'true';
  } catch {
    return false;
  }
}

async function buildLiveLandingPreview(): Promise<LandingShowcaseData> {
  const { dateFrom, dateTo } = getReportRange();

  const [
    revenueThisMonth,
    todayCheckIns,
    activeSubscriptions,
    pendingPayments,
    insideNow,
    reportPayments,
    reportAttendance,
    reportMembers,
    mariaRow,
  ] = await Promise.all([
    query<{ total: string | null }>(
      `SELECT SUM(amount_usd)::text AS total FROM payments
       WHERE status = 'approved' AND created_at >= DATE_TRUNC('month', CURRENT_DATE)`
    ),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM attendance WHERE ${sqlTodayRange('check_in_time')}`
    ),
    query<{ count: string }>(
      `SELECT COUNT(DISTINCT user_id)::text AS count FROM subscriptions
       WHERE status = 'active' AND end_date >= CURRENT_DATE`
    ),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM payments WHERE status = 'pending'`
    ),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM attendance
       WHERE ${sqlTodayRange('check_in_time')} AND check_out_time IS NULL`
    ),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM payments
       WHERE created_at::date >= $1::date AND created_at::date <= $2::date`,
      [dateFrom, dateTo]
    ),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM attendance
       WHERE check_in_time::date >= $1::date AND check_in_time::date <= $2::date`,
      [dateFrom, dateTo]
    ),
    query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM users WHERE role = 'member'`),
    query<{
      full_name: string;
      cedula: string | null;
      days_remaining: number;
      membership_name: string;
    }>(
      `SELECT u.full_name, u.cedula,
              GREATEST(0, s.end_date - CURRENT_DATE)::int AS days_remaining,
              m.name AS membership_name
       FROM users u
       JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active' AND s.end_date >= CURRENT_DATE
       JOIN memberships m ON m.id = s.membership_id
       WHERE u.email = 'maria.gonzalez@gym.local'
       ORDER BY s.end_date DESC
       LIMIT 1`
    ),
  ]);

  const maria = mariaRow.rows[0];

  return {
    source: 'live',
    admin: {
      revenueThisMonth: parseFloat(revenueThisMonth.rows[0]?.total || '0'),
      todayCheckIns: parseInt(todayCheckIns.rows[0]?.count || '0', 10),
      activeMembers: parseInt(activeSubscriptions.rows[0]?.count || '0', 10),
      pendingPayments: parseInt(pendingPayments.rows[0]?.count || '0', 10),
      revenueTrendPercent: LANDING_SHOWCASE.admin.revenueTrendPercent,
      chartBars: [...LANDING_SHOWCASE.admin.chartBars],
    },
    reception: {
      todayCheckIns: parseInt(todayCheckIns.rows[0]?.count || '0', 10),
      insideNow: parseInt(insideNow.rows[0]?.count || '0', 10),
      pendingPayments: parseInt(pendingPayments.rows[0]?.count || '0', 10),
      memberCedula: maria?.cedula ?? LANDING_SHOWCASE.reception.memberCedula,
      memberName: maria?.full_name ?? LANDING_SHOWCASE.reception.memberName,
      membershipName: maria?.membership_name ?? LANDING_SHOWCASE.reception.membershipName,
      daysRemaining: maria?.days_remaining ?? LANDING_SHOWCASE.reception.daysRemaining,
    },
    reports: {
      dateFrom,
      dateTo,
      payments: parseInt(reportPayments.rows[0]?.count || '0', 10),
      attendance: parseInt(reportAttendance.rows[0]?.count || '0', 10),
      members: parseInt(reportMembers.rows[0]?.count || '0', 10),
    },
  };
}

router.get('/preview', async (_req, res) => {
  try {
    if (env.NODE_ENV === 'production') {
      return res.json(toLandingShowcaseIllustration());
    }

    const seeded = await isLandingDemoSeeded();
    if (!seeded) {
      return res.json(toLandingShowcaseStatic());
    }

    res.json(await buildLiveLandingPreview());
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.post('/demo-request', landingDemoRateLimiter, async (req, res) => {
  try {
    const parsed = demoRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: formatZodDemoRequestError(parsed.error) });
    }

    const data = parsed.data;
    if (data.website?.trim()) {
      return res.json({
        message:
          'Gracias. Revisaremos tu solicitud y te contactaremos pronto para coordinar la demo.',
      });
    }

    const ipHash = hashClientIp(req.ip);
    const insert = await query<{ id: string }>(
      `INSERT INTO demo_requests (
         contact_name, email, phone, gym_name, city, member_count,
         current_tools, requirements, preferred_contact, ip_hash
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        data.contactName,
        data.email.toLowerCase(),
        data.phone || null,
        data.gymName,
        data.city || null,
        data.memberCount || null,
        data.currentTools || null,
        data.requirements,
        data.preferredContact,
        ipHash,
      ]
    );

    const requestId = insert.rows[0]?.id;
    if (!requestId) {
      return res.status(500).json({ error: 'No se pudo registrar la solicitud' });
    }

    const emailPayload = {
      contactName: data.contactName,
      email: data.email,
      phone: data.phone,
      gymName: data.gymName,
      city: data.city,
      memberCount: data.memberCount,
      currentTools: data.currentTools,
      requirements: data.requirements,
      preferredContact: data.preferredContact,
      requestId,
    };

    const notifyEmails = resolveDemoNotifyEmails();
    await Promise.all([
      ...notifyEmails.map((to) =>
        sendEmail({
          to,
          subject: `Nueva demo — ${data.gymName}`,
          html: demoRequestAdminEmail(emailPayload),
        })
      ),
      sendEmail({
        to: data.email,
        subject: 'Recibimos tu solicitud de demo — GymApure',
        html: demoRequestConfirmationEmail(data.contactName),
      }),
    ]);

    if (!notifyEmails.length) {
      logger.warn('Solicitud de demo guardada sin destinatarios de notificación', { requestId });
    }

    res.json({
      message:
        'Gracias. Revisaremos tu solicitud y te contactaremos pronto para coordinar la demo.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    logger.error('Error en solicitud de demo', { error: message });
    res.status(500).json({ error: 'No se pudo enviar la solicitud. Inténtalo de nuevo.' });
  }
});

export default router;
