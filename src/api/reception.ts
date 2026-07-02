import { asyncRouter } from './middleware/asyncRouter.ts';
import { query } from '../db/index.ts';
import { AuthRequest, authorize } from './middleware/auth.ts';
import { logAudit } from '../lib/audit.ts';
import { cedulaWhereClause, normalizeCedulaInput } from '../lib/cedulaUtils.ts';
import { performCheckIn, performCheckOut } from './attendance/attendanceCore.ts';
import { sqlTodayRange } from '../lib/sqlDateRanges.ts';
import { RECEPTION_STAFF } from '../lib/roles.ts';
import { walkInHandler } from './reception/walkIn.ts';
import { asyncHandler } from './middleware/asyncHandler.ts';
import { getActiveSubscriptionByUserId } from '../lib/subscriptions.ts';
import { z } from 'zod';

const router = asyncRouter();

router.use(authorize(RECEPTION_STAFF));

const lookupQuerySchema = z.object({
  cedula: z.string().min(1, 'Cédula requerida'),
});

const checkBodySchema = z.object({
  cedula: z.string().min(1, 'Cédula requerida'),
});

router.get('/lookup', asyncHandler(async (req, res) => {
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
  }>(
    `SELECT id, full_name, email, cedula, phone, status, role, profile_image
     FROM users
     WHERE ${cedulaWhereClause('cedula', 1)}
     LIMIT 1`,
    [cedula]
  );

  const user = userResult.rows[0];
  if (!user) {
    res.status(404).json({ error: 'Usuario no encontrado', found: false });
    return;
  }

  const subscription = await getActiveSubscriptionByUserId({ query }, user.id);

  const attendanceResult = await query<{
    id: number;
    check_in_time: Date | string;
    check_out_time: Date | string | null;
  }>(
    `SELECT id, check_in_time, check_out_time
     FROM attendance
     WHERE user_id = $1 AND ${sqlTodayRange('check_in_time')}
     ORDER BY check_in_time DESC
     LIMIT 1`,
    [user.id]
  );

  const todaySession = attendanceResult.rows[0];
  const isInside = todaySession ? todaySession.check_out_time == null : false;

  let accessStatus: 'allowed' | 'inactive' | 'no_subscription' = 'allowed';
  if (user.status !== 'active') accessStatus = 'inactive';
  else if (!subscription) accessStatus = 'no_subscription';

  res.json({
    found: true,
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      cedula: user.cedula,
      phone: user.phone,
      status: user.status,
      role: user.role,
      profile_image: user.profile_image,
    },
    subscription,
    attendance: {
      is_inside: isInside,
      today_session: todaySession
        ? {
            id: todaySession.id,
            check_in_time: todaySession.check_in_time,
            check_out_time: todaySession.check_out_time,
          }
        : null,
    },
    access_status: accessStatus,
    can_check_in: accessStatus === 'allowed' && !isInside,
    can_check_out: accessStatus === 'allowed' && isInside,
  });
}));

router.post('/walk-in', walkInHandler);

router.post('/check-in', asyncHandler(async (req: AuthRequest, res) => {
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
}));

router.post('/check-out', asyncHandler(async (req: AuthRequest, res) => {
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
}));

export default router;
