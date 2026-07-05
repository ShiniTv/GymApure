import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import type { Response } from 'express';
import { withTransaction } from '../../db/index.ts';
import { logAudit } from '../../lib/audit.ts';
import { canonicalCedula, cedulaWhereClause } from '../../lib/cedulaUtils.ts';
import { assignSubscription } from '../../lib/subscriptions.ts';
import { invalidateAdminStatsCache } from '../../lib/adminStatsCache.ts';
import { formatZodError } from '../../lib/passwordPolicy.ts';
import { performCheckIn } from '../attendance/attendanceCore.ts';
import { notifyPaymentApproved } from '../../lib/chat/eventMessages.ts';
import { isTrainingShift } from '../../lib/trainingShift.ts';
import type { AuthRequest } from '../middleware/auth.ts';
import { sendEmail, walkInWelcomeEmail } from '../../lib/email.ts';
import {
  buildPasswordSetupUrl,
  createPasswordSetupToken,
  WALK_IN_SETUP_EXPIRY_HOURS,
} from '../../lib/passwordSetupToken.ts';
import { logger } from '../../lib/logger.ts';

export const walkInSchema = z.object({
  full_name: z.string().trim().min(1, 'Nombre requerido').max(200),
  email: z.string().trim().email('Email inválido'),
  cedula: z.string().trim().min(1, 'Cédula requerida').max(50),
  phone: z.string().trim().max(20).optional().nullable(),
  membership_id: z.coerce.number().int().positive('Seleccione un plan'),
  amount_usd: z.coerce.number().positive('Monto inválido').optional(),
  method: z.string().trim().min(1, 'Método requerido').max(50).default('efectivo'),
  reference: z.string().trim().max(200).optional().nullable(),
  check_in: z.boolean().optional().default(true),
  training_shift: z.enum(['diurno', 'vespertino', 'nocturno']).optional().nullable(),
});

function generateTempPassword(): string {
  return crypto.randomBytes(9).toString('base64url');
}

export async function walkInHandler(req: AuthRequest, res: Response): Promise<void> {
  const parsed = walkInSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }

  const data = parsed.data;
  const normalizedCedula = canonicalCedula(data.cedula);
  if (!normalizedCedula) {
    res.status(400).json({ error: 'Cédula inválida' });
    return;
  }

  const normalizedEmail = data.email.toLowerCase().trim();
  const tempPassword = generateTempPassword();
  const hashedPassword = await bcrypt.hash(tempPassword, 10);

  try {
    const result = await withTransaction(async (client) => {
      const existingEmail = await client.query('SELECT id FROM users WHERE email = $1', [
        normalizedEmail,
      ]);
      if (existingEmail.rows[0]) {
        throw Object.assign(new Error('Este correo ya está registrado'), { statusCode: 400 });
      }

      const existingCedula = await client.query(
        `SELECT id FROM users WHERE ${cedulaWhereClause('cedula', 1)}`,
        [normalizedCedula]
      );
      if (existingCedula.rows[0]) {
        throw Object.assign(new Error('Esta cédula ya está registrada'), { statusCode: 400 });
      }

      const membershipResult = await client.query<{ id: number; name: string; price_usd: number }>(
        'SELECT id, name, price_usd FROM memberships WHERE id = $1',
        [data.membership_id]
      );
      const membership = membershipResult.rows[0];
      if (!membership) {
        throw Object.assign(new Error('Plan de membresía no encontrado'), { statusCode: 404 });
      }

      const amountUsd = data.amount_usd ?? Number(membership.price_usd);
      const memberShift =
        data.training_shift && isTrainingShift(data.training_shift) ? data.training_shift : null;

      const userResult = await client.query<{ id: number }>(
        `INSERT INTO users (full_name, email, cedula, phone, role, password, status, training_shift)
         VALUES ($1, $2, $3, $4, 'member', $5, 'active', $6)
         RETURNING id`,
        [
          data.full_name,
          normalizedEmail,
          normalizedCedula,
          data.phone?.trim() || null,
          hashedPassword,
          memberShift,
        ]
      );
      const userId = userResult.rows[0].id;

      const paymentResult = await client.query<{ id: number }>(
        `INSERT INTO payments (user_id, amount_usd, method, reference, status)
         VALUES ($1, $2, $3, $4, 'approved')
         RETURNING id`,
        [userId, amountUsd, data.method, data.reference?.trim() || null]
      );

      const subscription = await assignSubscription(client, userId, data.membership_id);

      return {
        userId,
        paymentId: paymentResult.rows[0].id,
        membershipName: membership.name,
        amountUsd,
        subscription,
      };
    });

    let checkedIn = false;
    let checkInMessage: string | undefined;

    if (data.check_in) {
      const checkInResult = await performCheckIn(normalizedCedula);
      checkedIn = checkInResult.ok;
      if (checkInResult.ok) {
        checkInMessage =
          typeof checkInResult.body.message === 'string'
            ? checkInResult.body.message
            : 'Entrada autorizada';
        await logAudit(req.user!.id, 'reception.check_in', {
          cedula: normalizedCedula,
          walk_in: true,
          ...checkInResult.body,
        });
      }
    }

    let emailSent = false;
    try {
      const rawToken = await createPasswordSetupToken(result.userId, WALK_IN_SETUP_EXPIRY_HOURS);
      const setupUrl = buildPasswordSetupUrl(rawToken);
      emailSent = await sendEmail({
        to: normalizedEmail,
        subject: 'Bienvenido a GymApure — crea tu contraseña',
        html: walkInWelcomeEmail(data.full_name, setupUrl, result.membershipName),
      });
      if (!emailSent) {
        logger.error('Walk-in: no se pudo enviar correo de bienvenida', {
          userId: result.userId,
        });
      }
    } catch (err) {
      logger.error('Walk-in: error enviando correo de bienvenida', {
        userId: result.userId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    await logAudit(req.user!.id, 'reception.walk_in', {
      user_id: result.userId,
      payment_id: result.paymentId,
      membership_id: data.membership_id,
      check_in: data.check_in && checkedIn,
      email_sent: emailSent,
      setup_email: true,
    });

    invalidateAdminStatsCache();

    void notifyPaymentApproved(
      result.userId,
      result.amountUsd,
      result.membershipName,
      result.paymentId
    ).catch((err) => {
      console.error('[notify] walk-in payment', err);
    });

    res.status(201).json({
      success: true,
      user: {
        id: result.userId,
        full_name: data.full_name,
        email: normalizedEmail,
        cedula: normalizedCedula,
      },
      payment_id: result.paymentId,
      membership_name: result.membershipName,
      subscription: result.subscription,
      email_sent: emailSent,
      ...(emailSent ? {} : { temporary_password: tempPassword }),
      checked_in: checkedIn,
      check_in_message: checkInMessage,
    });
  } catch (err: unknown) {
    const statusCode =
      err && typeof err === 'object' && 'statusCode' in err && typeof err.statusCode === 'number'
        ? err.statusCode
        : 500;
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(statusCode).json({ error: message });
  }
}
