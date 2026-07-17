import { z } from 'zod';
import { asyncRouter } from './middleware/asyncRouter.ts';
import { asyncHandler } from './middleware/asyncHandler.ts';
import { type AuthRequest, authorize } from './middleware/auth.ts';
import { query, withTransaction } from '../db/index.ts';
import { formatZodError } from '../lib/passwordPolicy.ts';
import { getActiveSubscriptionByUserId } from '../lib/subscriptions.ts';
import { createUserNotification } from '../lib/notifications/service.ts';
import { logger } from '../lib/logger.ts';
import { logAudit } from '../lib/audit.ts';

const router = asyncRouter();
const ALL_AUTHENTICATED_ROLES = ['admin', 'trainer', 'receptionist', 'member'];
const STAFF_ROLES = ['admin', 'trainer', 'receptionist'];

const positiveId = z.coerce.number().int().positive();
const dateTime = z.coerce.date();

const classTypeCreateSchema = z.object({
  name: z.string().trim().min(1).max(150),
  duration_minutes: z.coerce.number().int().min(1).max(480),
  default_capacity: z.coerce.number().int().min(1).max(1000),
  is_active: z.boolean().optional(),
});

const classTypeUpdateSchema = classTypeCreateSchema
  .partial()
  .refine(
    (value) => Object.keys(value).length > 0,
    'Debe proporcionar al menos un campo para actualizar'
  );

const classSessionCreateSchema = z.object({
  class_type_id: positiveId,
  instructor_id: positiveId.nullable().optional(),
  starts_at: dateTime,
  ends_at: dateTime.optional(),
  capacity: z.coerce.number().int().min(1).max(1000).optional(),
});

const bookingTargetSchema = z.object({
  user_id: positiveId.optional(),
});

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Error interno';
}

function parseId(value: string): number | null {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function notifyBooking(
  userId: number,
  type: string,
  title: string,
  body: string,
  sessionId: number,
  dedupeKey: string
): void {
  void createUserNotification({
    userId,
    type,
    title,
    body,
    href: '/reservas',
    metadata: { session_id: sessionId },
    dedupeKey,
  }).catch((err: unknown) => {
    logger.error('No se pudo crear notificación de clase', {
      userId,
      sessionId,
      error: getErrorMessage(err),
    });
  });
}

router.get(
  '/types',
  authorize(['admin', 'trainer', 'receptionist']),
  asyncHandler(async (_req, res) => {
    const { rows } = await query(
      `SELECT id, name, duration_minutes, default_capacity, is_active, created_at
       FROM class_types
       ORDER BY is_active DESC, name ASC`
    );
    res.json(rows);
  })
);

router.post(
  '/types',
  authorize(['admin']),
  asyncHandler(async (req: AuthRequest, res) => {
    const parsed = classTypeCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: formatZodError(parsed.error) });
      return;
    }

    const { name, duration_minutes, default_capacity, is_active } = parsed.data;
    const { rows } = await query(
      `INSERT INTO class_types (name, duration_minutes, default_capacity, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, duration_minutes, default_capacity, is_active, created_at`,
      [name, duration_minutes, default_capacity, is_active ?? true]
    );
    await logAudit(req.user!.id, 'class_type.create', { class_type_id: rows[0].id });
    res.status(201).json(rows[0]);
  })
);

router.put(
  '/types/:id',
  authorize(['admin']),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({ error: 'ID de tipo de clase inválido' });
      return;
    }

    const parsed = classTypeUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: formatZodError(parsed.error) });
      return;
    }

    const fields = parsed.data;
    const sets: string[] = [];
    const params: unknown[] = [];
    for (const field of ['name', 'duration_minutes', 'default_capacity', 'is_active'] as const) {
      if (fields[field] !== undefined) {
        params.push(fields[field]);
        sets.push(`${field} = $${params.length}`);
      }
    }
    params.push(id);

    const { rows } = await query(
      `UPDATE class_types SET ${sets.join(', ')}
       WHERE id = $${params.length}
       RETURNING id, name, duration_minutes, default_capacity, is_active, created_at`,
      params
    );
    if (!rows[0]) {
      res.status(404).json({ error: 'Tipo de clase no encontrado' });
      return;
    }
    await logAudit(req.user!.id, 'class_type.update', { class_type_id: id });
    res.json(rows[0]);
  })
);

router.get(
  '/sessions',
  authorize(ALL_AUTHENTICATED_ROLES),
  asyncHandler(async (req: AuthRequest, res) => {
    const params: unknown[] = [req.user!.role === 'member', req.user!.id];
    const conditions: string[] = [];

    let hasFrom = false;
    let hasTo = false;
    for (const key of ['from', 'to'] as const) {
      if (req.query[key] === undefined) continue;
      const parsed = dateTime.safeParse(req.query[key]);
      if (!parsed.success) {
        res.status(400).json({ error: `${key} debe ser una fecha válida` });
        return;
      }
      params.push(parsed.data);
      conditions.push(`cs.starts_at ${key === 'from' ? '>=' : '<='} $${params.length}`);
      if (key === 'from') hasFrom = true;
      if (key === 'to') hasTo = true;
    }

    // Avoid unbounded scans if callers omit range (default: now → +21 days).
    if (!hasFrom) {
      params.push(new Date());
      conditions.push(`cs.starts_at >= $${params.length}`);
    }
    if (!hasTo) {
      params.push(new Date(Date.now() + 21 * 24 * 60 * 60 * 1000));
      conditions.push(`cs.starts_at <= $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await query<{
      id: number;
      class_type_id: number;
      class_type_name: string;
      instructor_id: number | null;
      instructor_name: string | null;
      starts_at: Date;
      ends_at: Date;
      capacity: number;
      status: string;
      created_at: Date;
      booked_count: number;
      waitlisted_count: number;
      my_booking_id: number | null;
      my_booking_status: 'booked' | 'waitlisted' | null;
    }>(
      `SELECT cs.id, cs.class_type_id, ct.name AS class_type_name,
              cs.instructor_id, instructor.full_name AS instructor_name,
              cs.starts_at, cs.ends_at, cs.capacity, cs.status, cs.created_at,
              (
                SELECT COUNT(*)::int FROM class_bookings cb
                WHERE cb.session_id = cs.id AND cb.status = 'booked'
              ) AS booked_count,
              (
                SELECT COUNT(*)::int FROM class_bookings cb
                WHERE cb.session_id = cs.id AND cb.status = 'waitlisted'
              ) AS waitlisted_count,
              CASE WHEN $1::boolean THEN (
                SELECT mine.id FROM class_bookings mine
                WHERE mine.session_id = cs.id AND mine.user_id = $2
                  AND mine.status IN ('booked', 'waitlisted')
                LIMIT 1
              ) ELSE NULL END AS my_booking_id,
              CASE WHEN $1::boolean THEN (
                SELECT mine.status FROM class_bookings mine
                WHERE mine.session_id = cs.id AND mine.user_id = $2
                  AND mine.status IN ('booked', 'waitlisted')
                LIMIT 1
              ) ELSE NULL END AS my_booking_status
       FROM class_sessions cs
       JOIN class_types ct ON ct.id = cs.class_type_id
       LEFT JOIN users instructor ON instructor.id = cs.instructor_id
       ${where}
       ORDER BY cs.starts_at ASC
       LIMIT 200`,
      params
    );
    res.json(
      rows.map((row) => ({
        ...row,
        has_booked: row.my_booking_status === 'booked',
        has_waitlisted: row.my_booking_status === 'waitlisted',
      }))
    );
  })
);

router.post(
  '/sessions',
  authorize(['admin', 'trainer']),
  asyncHandler(async (req: AuthRequest, res) => {
    const parsed = classSessionCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: formatZodError(parsed.error) });
      return;
    }

    const data = parsed.data;
    const instructorId = req.user!.role === 'trainer' ? req.user!.id : (data.instructor_id ?? null);
    if (
      req.user!.role === 'trainer' &&
      data.instructor_id !== undefined &&
      data.instructor_id !== null &&
      data.instructor_id !== req.user!.id
    ) {
      res.status(403).json({ error: 'Un entrenador solo puede crear sus propias clases' });
      return;
    }

    const { rows: typeRows } = await query<{
      duration_minutes: number;
      default_capacity: number;
      is_active: boolean;
    }>(
      `SELECT duration_minutes, default_capacity, is_active
       FROM class_types WHERE id = $1`,
      [data.class_type_id]
    );
    const classType = typeRows[0];
    if (!classType) {
      res.status(400).json({ error: 'Tipo de clase inválido' });
      return;
    }
    if (!classType.is_active) {
      res.status(400).json({ error: 'El tipo de clase está inactivo' });
      return;
    }

    if (instructorId !== null) {
      const instructor = await query(
        `SELECT id FROM users WHERE id = $1 AND role = 'trainer' AND status = 'active'`,
        [instructorId]
      );
      if (!instructor.rows[0]) {
        res.status(400).json({ error: 'Instructor inválido' });
        return;
      }
    }

    const endsAt =
      data.ends_at ?? new Date(data.starts_at.getTime() + classType.duration_minutes * 60 * 1000);
    if (endsAt <= data.starts_at) {
      res.status(400).json({ error: 'ends_at debe ser posterior a starts_at' });
      return;
    }

    const { rows } = await query(
      `INSERT INTO class_sessions (class_type_id, instructor_id, starts_at, ends_at, capacity)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, class_type_id, instructor_id, starts_at, ends_at, capacity, status, created_at`,
      [
        data.class_type_id,
        instructorId,
        data.starts_at,
        endsAt,
        data.capacity ?? classType.default_capacity,
      ]
    );
    await logAudit(req.user!.id, 'class_session.create', { session_id: rows[0].id });
    res.status(201).json(rows[0]);
  })
);

router.post(
  '/sessions/:id/cancel',
  authorize(['admin', 'receptionist', 'trainer']),
  asyncHandler(async (req: AuthRequest, res) => {
    const sessionId = parseId(req.params.id);
    if (!sessionId) {
      res.status(400).json({ error: 'ID de sesión inválido' });
      return;
    }

    const result = await withTransaction(async (client) => {
      const { rows: sessionRows } = await client.query<{
        id: number;
        instructor_id: number | null;
        class_type_name: string;
        starts_at: Date;
        status: string;
      }>(
        `SELECT cs.id, cs.instructor_id, ct.name AS class_type_name, cs.starts_at, cs.status
         FROM class_sessions cs
         JOIN class_types ct ON ct.id = cs.class_type_id
         WHERE cs.id = $1
         FOR UPDATE OF cs`,
        [sessionId]
      );
      const session = sessionRows[0];
      if (!session) return { error: 'Sesión no encontrada', status: 404 };
      if (req.user!.role === 'trainer' && session.instructor_id !== req.user!.id) {
        return { error: 'Solo puedes cancelar tus propias clases', status: 403 };
      }
      if (session.status === 'cancelled') {
        return { error: 'La sesión ya está cancelada', status: 400 };
      }

      await client.query(`UPDATE class_sessions SET status = 'cancelled' WHERE id = $1`, [
        sessionId,
      ]);
      const { rows: cancelledBookings } = await client.query<{ user_id: number }>(
        `UPDATE class_bookings
         SET status = 'cancelled', cancelled_at = NOW()
         WHERE session_id = $1 AND status IN ('booked', 'waitlisted')
         RETURNING user_id`,
        [sessionId]
      );
      return { session, cancelledBookings };
    });

    if ('error' in result) {
      const failure = result as { error: string; status: number };
      res.status(failure.status).json({ error: failure.error });
      return;
    }

    for (const booking of result.cancelledBookings) {
      notifyBooking(
        booking.user_id,
        'class_session_cancelled',
        'Clase cancelada',
        `${result.session.class_type_name} fue cancelada.`,
        sessionId,
        `class-session-cancelled:${sessionId}`
      );
    }
    await logAudit(req.user!.id, 'class_session.cancel', { session_id: sessionId });
    res.json({ success: true, cancelled_bookings: result.cancelledBookings.length });
  })
);

router.post(
  '/sessions/:id/book',
  authorize(['admin', 'receptionist', 'member']),
  asyncHandler(async (req: AuthRequest, res) => {
    const sessionId = parseId(req.params.id);
    if (!sessionId) {
      res.status(400).json({ error: 'ID de sesión inválido' });
      return;
    }
    const parsed = bookingTargetSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: formatZodError(parsed.error) });
      return;
    }

    if (
      req.user!.role === 'member' &&
      parsed.data.user_id &&
      parsed.data.user_id !== req.user!.id
    ) {
      res.status(403).json({ error: 'No puedes reservar para otro miembro' });
      return;
    }
    const userId = parsed.data.user_id ?? req.user!.id;

    const result = await withTransaction(async (client) => {
      const { rows: sessionRows } = await client.query<{
        id: number;
        capacity: number;
        status: string;
        starts_at: Date;
        class_type_name: string;
        instructor_id: number | null;
      }>(
        `SELECT cs.id, cs.capacity, cs.status, cs.starts_at, ct.name AS class_type_name
         FROM class_sessions cs
         JOIN class_types ct ON ct.id = cs.class_type_id
         WHERE cs.id = $1
         FOR UPDATE OF cs`,
        [sessionId]
      );
      const session = sessionRows[0];
      if (!session) return { error: 'Sesión no encontrada', status: 404 };
      if (session.status !== 'scheduled') return { error: 'La sesión está cancelada', status: 400 };
      if (session.starts_at <= new Date()) {
        return { error: 'No se puede reservar una clase que ya comenzó', status: 400 };
      }

      const member = await client.query(
        `SELECT id FROM users WHERE id = $1 AND role = 'member' AND status = 'active'`,
        [userId]
      );
      if (!member.rows[0]) return { error: 'Miembro inválido o inactivo', status: 400 };

      const subscription = await getActiveSubscriptionByUserId(client, userId);
      if (!subscription)
        return { error: 'El miembro no tiene una suscripción activa', status: 400 };

      const existing = await client.query(
        `SELECT id FROM class_bookings
         WHERE session_id = $1 AND user_id = $2 AND status IN ('booked', 'waitlisted')`,
        [sessionId, userId]
      );
      if (existing.rows[0])
        return { error: 'El miembro ya tiene una reserva para esta clase', status: 409 };

      const { rows: countRows } = await client.query<{ booked_count: number }>(
        `SELECT COUNT(*)::int AS booked_count
         FROM class_bookings WHERE session_id = $1 AND status = 'booked'`,
        [sessionId]
      );
      const waitlisted = countRows[0].booked_count >= session.capacity;

      const { rows: bookingRows } = await client.query(
        `INSERT INTO class_bookings (session_id, user_id, status)
         VALUES ($1, $2, $3)
         RETURNING id, session_id, user_id, status, created_at, cancelled_at`,
        [sessionId, userId, waitlisted ? 'waitlisted' : 'booked']
      );
      return { booking: bookingRows[0], session, waitlisted };
    });

    if ('error' in result) {
      const failure = result as { error: string; status: number };
      res.status(failure.status).json({ error: failure.error });
      return;
    }

    notifyBooking(
      userId,
      result.waitlisted ? 'class_waitlist_joined' : 'class_booking_created',
      result.waitlisted ? 'En lista de espera' : 'Reserva confirmada',
      result.waitlisted
        ? `Te agregamos a la lista de espera de ${result.session.class_type_name}. Te avisaremos si se libera un cupo.`
        : `Tu reserva para ${result.session.class_type_name} fue confirmada.`,
      sessionId,
      result.waitlisted
        ? `class-waitlist:${result.booking.id}`
        : `class-booking:${result.booking.id}`
    );
    await logAudit(req.user!.id, 'class_booking.create', {
      booking_id: result.booking.id,
      session_id: sessionId,
      user_id: userId,
    });
    res.status(201).json({ ...result.booking, waitlisted: result.waitlisted });
  })
);

router.post(
  '/bookings/:id/cancel',
  authorize(ALL_AUTHENTICATED_ROLES),
  asyncHandler(async (req: AuthRequest, res) => {
    const bookingId = parseId(req.params.id);
    if (!bookingId) {
      res.status(400).json({ error: 'ID de reserva inválido' });
      return;
    }

    const result = await withTransaction(async (client) => {
      const { rows } = await client.query<{
        id: number;
        user_id: number;
        session_id: number;
        status: string;
        starts_at: Date;
        class_type_name: string;
        instructor_id: number | null;
      }>(
        `SELECT cb.id, cb.user_id, cb.session_id, cb.status, cs.starts_at, ct.name AS class_type_name,
                cs.instructor_id
         FROM class_bookings cb
         JOIN class_sessions cs ON cs.id = cb.session_id
         JOIN class_types ct ON ct.id = cs.class_type_id
         WHERE cb.id = $1
         FOR UPDATE OF cb, cs`,
        [bookingId]
      );
      const booking = rows[0];
      if (!booking) return { error: 'Reserva no encontrada', status: 404 };

      const isMember = req.user!.role === 'member';
      if (isMember && booking.user_id !== req.user!.id) {
        return { error: 'No puedes cancelar la reserva de otro miembro', status: 403 };
      }
      if (req.user!.role === 'trainer' && booking.instructor_id !== req.user!.id) {
        return { error: 'Solo puedes gestionar las reservas de tus propias clases', status: 403 };
      }
      if (isMember && booking.starts_at.getTime() <= Date.now() + 2 * 60 * 60 * 1000) {
        return { error: 'Solo puedes cancelar hasta 2 horas antes de la clase', status: 400 };
      }
      if (booking.status !== 'booked' && booking.status !== 'waitlisted') {
        return { error: 'La reserva no se puede cancelar', status: 400 };
      }

      const { rows: updatedRows } = await client.query(
        `UPDATE class_bookings
         SET status = 'cancelled', cancelled_at = NOW()
         WHERE id = $1 AND status IN ('booked', 'waitlisted')
         RETURNING id, session_id, user_id, status, created_at, cancelled_at`,
        [bookingId]
      );
      let promotedBooking:
        | { id: number; user_id: number; session_id: number; status: string; created_at: Date }
        | undefined;
      if (booking.status === 'booked') {
        const { rows: waitlistedRows } = await client.query<{
          id: number;
          user_id: number;
          session_id: number;
          status: string;
          created_at: Date;
        }>(
          `SELECT id, user_id, session_id, status, created_at
           FROM class_bookings
           WHERE session_id = $1 AND status = 'waitlisted'
           ORDER BY created_at ASC, id ASC
           LIMIT 1
           FOR UPDATE SKIP LOCKED`,
          [booking.session_id]
        );
        const next = waitlistedRows[0];
        if (next) {
          const { rows: promotedRows } = await client.query<{
            id: number;
            user_id: number;
            session_id: number;
            status: string;
            created_at: Date;
          }>(
            `UPDATE class_bookings
             SET status = 'booked'
             WHERE id = $1 AND status = 'waitlisted'
             RETURNING id, user_id, session_id, status, created_at`,
            [next.id]
          );
          promotedBooking = promotedRows[0];
        }
      }
      return {
        booking: updatedRows[0],
        classTypeName: booking.class_type_name,
        promotedBooking,
      };
    });

    if ('error' in result) {
      const failure = result as { error: string; status: number };
      res.status(failure.status).json({ error: failure.error });
      return;
    }

    notifyBooking(
      result.booking.user_id,
      'class_booking_cancelled',
      'Reserva cancelada',
      `Tu reserva para ${result.classTypeName} fue cancelada.`,
      result.booking.session_id,
      `class-booking-cancelled:${result.booking.id}`
    );
    if (result.promotedBooking) {
      notifyBooking(
        result.promotedBooking.user_id,
        'class_waitlist_promoted',
        'Cupo confirmado',
        `Se liberó un cupo para ${result.classTypeName}. Tu reserva ahora está confirmada.`,
        result.promotedBooking.session_id,
        `class-waitlist-promoted:${result.promotedBooking.id}`
      );
    }
    await logAudit(req.user!.id, 'class_booking.cancel', { booking_id: bookingId });
    res.json(result.booking);
  })
);

router.post(
  '/bookings/:id/attend',
  authorize(STAFF_ROLES),
  asyncHandler(async (req: AuthRequest, res) => {
    const bookingId = parseId(req.params.id);
    if (!bookingId) {
      res.status(400).json({ error: 'ID de reserva inválido' });
      return;
    }

    const { rows } = await query(
      `UPDATE class_bookings cb
       SET status = 'attended'
       FROM class_sessions cs
       WHERE cb.id = $1
         AND cb.session_id = cs.id
         AND cb.status = 'booked'
         AND ($2 <> 'trainer' OR cs.instructor_id = $3)
       RETURNING cb.id, cb.session_id, cb.user_id, cb.status, cb.created_at, cb.cancelled_at`,
      [bookingId, req.user!.role, req.user!.id]
    );
    if (!rows[0]) {
      res.status(404).json({ error: 'Reserva no encontrada o no puede marcarse como asistida' });
      return;
    }
    await logAudit(req.user!.id, 'class_booking.attend', { booking_id: bookingId });
    res.json(rows[0]);
  })
);

router.post(
  '/bookings/:id/no-show',
  authorize(STAFF_ROLES),
  asyncHandler(async (req: AuthRequest, res) => {
    const bookingId = parseId(req.params.id);
    if (!bookingId) {
      res.status(400).json({ error: 'ID de reserva inválido' });
      return;
    }

    const { rows } = await query(
      `UPDATE class_bookings cb
       SET status = 'no_show'
       FROM class_sessions cs
       WHERE cb.id = $1
         AND cb.session_id = cs.id
         AND cb.status = 'booked'
         AND ($2 <> 'trainer' OR cs.instructor_id = $3)
       RETURNING cb.id, cb.session_id, cb.user_id, cb.status, cb.created_at, cb.cancelled_at`,
      [bookingId, req.user!.role, req.user!.id]
    );
    if (!rows[0]) {
      res
        .status(404)
        .json({ error: 'Reserva no encontrada o no puede marcarse como inasistencia' });
      return;
    }
    await logAudit(req.user!.id, 'class_booking.no_show', { booking_id: bookingId });
    res.json(rows[0]);
  })
);

router.get(
  '/sessions/:id/bookings',
  authorize(STAFF_ROLES),
  asyncHandler(async (req: AuthRequest, res) => {
    const sessionId = parseId(req.params.id);
    if (!sessionId) {
      res.status(400).json({ error: 'ID de sesión inválido' });
      return;
    }
    const { rows } = await query<{
      id: number;
      user_id: number;
      member_name: string;
      status: string;
      created_at: Date;
    }>(
      `SELECT cb.id, cb.user_id, u.full_name AS member_name, cb.status, cb.created_at
       FROM class_bookings cb
       JOIN class_sessions cs ON cs.id = cb.session_id
       JOIN users u ON u.id = cb.user_id
       WHERE cb.session_id = $1
         AND ($2 <> 'trainer' OR cs.instructor_id = $3)
       ORDER BY CASE cb.status WHEN 'booked' THEN 0 WHEN 'waitlisted' THEN 1 ELSE 2 END,
                cb.created_at ASC, cb.id ASC`,
      [sessionId, req.user!.role, req.user!.id]
    );
    res.json(rows);
  })
);

export default router;
