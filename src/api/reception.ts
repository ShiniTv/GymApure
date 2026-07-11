import { asyncRouter } from './middleware/asyncRouter.ts';
import { query } from '../db/index.ts';
import { AuthRequest, authorize } from './middleware/auth.ts';
import { logAudit } from '../lib/audit.ts';
import { cedulaWhereClause, normalizeCedulaInput } from '../lib/cedulaUtils.ts';
import { performCheckIn, performCheckOut } from './attendance/attendanceCore.ts';
import { sqlTodayRange } from '../lib/sqlDateRanges.ts';
import { RECEPTION_OPERATORS } from '../lib/roles.ts';
import { walkInHandler } from './reception/walkIn.ts';
import { asyncHandler } from './middleware/asyncHandler.ts';
import { proofUpload } from '../lib/uploadStorage.ts';
import { uploadRateLimiter } from './middleware/rateLimit.ts';
import { z } from 'zod';

const router = asyncRouter();

router.use(authorize(RECEPTION_OPERATORS));

const lookupQuerySchema = z.object({
  cedula: z.string().min(1, 'Cédula requerida'),
});

const checkBodySchema = z.object({
  cedula: z.string().min(1, 'Cédula requerida'),
});

router.get(
  '/lookup',
  asyncHandler(async (req, res) => {
    const parsed = lookupQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: 'Cédula requerida', found: false });
      return;
    }

    const cedula = normalizeCedulaInput(parsed.data.cedula);

    const userResult = await query<{
      id: number;
      full_name: string;
      email: string;
      cedula: string | null;
      phone: string | null;
      status: string;
      role: string;
      profile_image: string | null;
      sub_id: number | null;
      membership_name: string | null;
      end_date: string | null;
      days_remaining: number | null;
      att_id: number | null;
      check_in_time: Date | string | null;
      check_out_time: Date | string | null;
    }>(
      `SELECT u.id, u.full_name, u.email, u.cedula, u.phone, u.status, u.role, u.profile_image,
              sub.id AS sub_id, sub.membership_name, sub.end_date, sub.days_remaining,
              att.id AS att_id, att.check_in_time, att.check_out_time
       FROM users u
       LEFT JOIN LATERAL (
         SELECT s.id, m.name AS membership_name, s.end_date,
                GREATEST(0, s.end_date - CURRENT_DATE)::int AS days_remaining
         FROM subscriptions s
         JOIN memberships m ON m.id = s.membership_id
         WHERE s.user_id = u.id AND s.status = 'active' AND s.end_date >= CURRENT_DATE
         ORDER BY s.end_date DESC
         LIMIT 1
       ) sub ON true
       LEFT JOIN LATERAL (
         SELECT a.id, a.check_in_time, a.check_out_time
         FROM attendance a
         WHERE a.user_id = u.id AND ${sqlTodayRange('a.check_in_time')}
         ORDER BY a.check_in_time DESC
         LIMIT 1
       ) att ON true
       WHERE ${cedulaWhereClause('u.cedula', 1)}
       LIMIT 1`,
      [cedula]
    );

    const row = userResult.rows[0];
    if (!row) {
      res.status(404).json({ error: 'Usuario no encontrado', found: false });
      return;
    }

    const subscription =
      row.sub_id != null && row.membership_name && row.end_date
        ? {
            id: row.sub_id,
            membership_name: row.membership_name,
            end_date: row.end_date,
            days_remaining: row.days_remaining ?? 0,
          }
        : null;

    const todaySession =
      row.att_id != null && row.check_in_time
        ? {
            id: row.att_id,
            check_in_time: row.check_in_time,
            check_out_time: row.check_out_time,
          }
        : null;

    const isInside = todaySession ? todaySession.check_out_time == null : false;

    let accessStatus: 'allowed' | 'inactive' | 'no_subscription' = 'allowed';
    if (row.status !== 'active') accessStatus = 'inactive';
    else if (!subscription) accessStatus = 'no_subscription';

    res.json({
      found: true,
      user: {
        id: row.id,
        full_name: row.full_name,
        email: row.email,
        cedula: row.cedula,
        phone: row.phone,
        status: row.status,
        role: row.role,
        profile_image: row.profile_image,
      },
      subscription,
      attendance: {
        is_inside: isInside,
        today_session: todaySession,
      },
      access_status: accessStatus,
      can_check_in: accessStatus === 'allowed' && !isInside,
      can_check_out: accessStatus === 'allowed' && isInside,
    });
  })
);

router.post(
  '/walk-in',
  uploadRateLimiter,
  proofUpload.single('proof'),
  asyncHandler(walkInHandler)
);

router.post(
  '/check-in',
  asyncHandler(async (req: AuthRequest, res) => {
    const parsed = checkBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Cédula requerida' });
      return;
    }

    const cedula = normalizeCedulaInput(parsed.data.cedula) || parsed.data.cedula;
    const result = await performCheckIn(cedula);
    if (result.ok) {
      await logAudit(req.user!.id, 'reception.check_in', { cedula, ...result.body });
    }
    res.status(result.status).json(result.body);
  })
);

router.post(
  '/check-out',
  asyncHandler(async (req: AuthRequest, res) => {
    const parsed = checkBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Cédula requerida' });
      return;
    }

    const cedula = normalizeCedulaInput(parsed.data.cedula) || parsed.data.cedula;
    const result = await performCheckOut(cedula);
    if (result.ok) {
      await logAudit(req.user!.id, 'reception.check_out', { cedula, ...result.body });
    }
    res.status(result.status).json(result.body);
  })
);

export default router;
