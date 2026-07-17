import { query } from '../../db/index.ts';
import { postSystemMessage } from './systemMessages.ts';
import { BRAND } from '../../config/brand.ts';
import { createStaffNotification, createUserNotification } from '../notifications/service.ts';
import { getExpirySeverity } from '../expiryUtils.ts';

async function fetchMemberName(userId: number): Promise<string | null> {
  const { rows } = await query<{ full_name: string }>(
    'SELECT full_name FROM users WHERE id = $1 AND role = $2',
    [userId, 'member']
  );
  return rows[0]?.full_name ?? null;
}

function expiryNotificationSeverity(days: number, alertDays = 7) {
  const s = getExpirySeverity(days, alertDays);
  return s === 'ok' ? 'info' : s;
}

export async function notifyPaymentReported(
  paymentId: number,
  userId: number,
  amountUsd: number
): Promise<void> {
  const fullName = await fetchMemberName(userId);
  if (!fullName) return;

  const body = `${fullName} reportó un pago de $${amountUsd} USD (ID #${paymentId}). Revisa el panel de pagos para aprobarlo.`;

  await postSystemMessage({
    memberId: userId,
    eventType: 'payment_reported',
    body,
    metadataKey: String(paymentId),
    metadata: { payment_id: paymentId, amount_usd: amountUsd },
  });

  void createStaffNotification({
    type: 'payment_reported',
    title: 'Nuevo pago reportado',
    body: `${fullName} reportó $${amountUsd} USD`,
    href: `/payments?status=pending&paymentId=${paymentId}`,
    severity: 'warning',
    metadata: { payment_id: paymentId, amount_usd: amountUsd, member_id: userId },
    dedupeKey: `payment_reported:${paymentId}`,
  }).catch((err) => {
    console.error('[notify] payment reported in-app', err);
  });
}

export async function notifyPaymentApproved(
  userId: number,
  amountUsd: number,
  membershipName?: string,
  paymentId?: number
): Promise<void> {
  const fullName = await fetchMemberName(userId);
  if (!fullName) return;

  const planLine = membershipName ? ` Plan activado: ${membershipName}.` : '';
  const message = `Hola ${fullName}, tu pago de $${amountUsd} USD fue aprobado en ${BRAND.name}.${planLine} ¡Nos vemos en el gym!`;

  await postSystemMessage({
    memberId: userId,
    eventType: 'payment_approved',
    body: message,
    metadataKey: paymentId != null ? String(paymentId) : `approved-${userId}-${amountUsd}`,
    metadata: {
      amount_usd: amountUsd,
      membership_name: membershipName ?? null,
      payment_id: paymentId ?? null,
    },
  });

  void createUserNotification({
    userId,
    type: 'payment_approved',
    title: 'Pago aprobado',
    body: `Tu pago de $${amountUsd} USD fue aprobado.${membershipName ? ` Plan: ${membershipName}.` : ''}`,
    href: '/payments',
    severity: 'info',
    metadata: {
      amount_usd: amountUsd,
      membership_name: membershipName ?? null,
      payment_id: paymentId ?? null,
    },
    dedupeKey:
      paymentId != null
        ? `payment:${paymentId}:approved`
        : `payment:approved:${userId}:${amountUsd}`,
  }).catch((err) => {
    console.error('[notify] payment approved in-app', err);
  });
}

export async function notifyPaymentRejected(
  userId: number,
  amountUsd: number,
  paymentId?: number
): Promise<void> {
  const fullName = await fetchMemberName(userId);
  if (!fullName) return;

  const message = `Hola ${fullName}, tu pago de $${amountUsd} USD no pudo ser verificado en ${BRAND.name}. Revisa el comprobante y vuelve a reportarlo, o escríbenos por este chat.`;

  await postSystemMessage({
    memberId: userId,
    eventType: 'payment_rejected',
    body: message,
    metadataKey: paymentId != null ? String(paymentId) : `rejected-${userId}-${amountUsd}`,
    metadata: { amount_usd: amountUsd, payment_id: paymentId ?? null },
  });

  void createUserNotification({
    userId,
    type: 'payment_rejected',
    title: 'Pago no verificado',
    body: `Tu pago de $${amountUsd} USD no pudo ser verificado. Revisa el comprobante.`,
    href: '/payments',
    severity: 'warning',
    metadata: { amount_usd: amountUsd, payment_id: paymentId ?? null },
    dedupeKey:
      paymentId != null
        ? `payment:${paymentId}:rejected`
        : `payment:rejected:${userId}:${amountUsd}`,
  }).catch((err) => {
    console.error('[notify] payment rejected in-app', err);
  });
}

export async function notifyRoutineAssigned(userId: number, routineId: number): Promise<void> {
  const fullName = await fetchMemberName(userId);
  if (!fullName) return;

  const { rows } = await query<{ name: string }>('SELECT name FROM routines WHERE id = $1', [
    routineId,
  ]);
  const routineName = rows[0]?.name ?? 'tu nueva rutina';

  const message = `Hola ${fullName}, tu entrenador te asignó la rutina "${routineName}" en ${BRAND.name}. Entra a la app para ver los ejercicios y empezar a entrenar.`;

  await postSystemMessage({
    memberId: userId,
    eventType: 'routine_assigned',
    body: message,
    metadataKey: String(routineId),
    metadata: { routine_id: routineId, routine_name: routineName },
  });

  void createUserNotification({
    userId,
    type: 'routine_assigned',
    title: 'Nueva rutina asignada',
    body: `Te asignaron la rutina "${routineName}".`,
    href: '/routines',
    severity: 'info',
    metadata: { routine_id: routineId, routine_name: routineName },
    dedupeKey: `routine:${routineId}`,
  }).catch((err) => {
    console.error('[notify] routine assigned in-app', err);
  });
}

export async function notifyMembershipExpiry(
  userId: number,
  eventType: 'expiring_soon' | 'expired',
  options: {
    membershipName: string;
    daysRemaining: number;
    subscriptionId: number;
    endDate: string;
    alertDays?: number;
  }
): Promise<boolean> {
  const { membershipName, daysRemaining, subscriptionId, endDate, alertDays = 7 } = options;

  const title = eventType === 'expired' ? 'Membresía vencida' : 'Membresía por vencer';
  let body: string;
  if (eventType === 'expired') {
    body = `Tu membresía "${membershipName}" ha vencido. Reporta tu pago para recuperar el acceso.`;
  } else if (daysRemaining === 0) {
    body = `Tu membresía "${membershipName}" vence hoy. Reporta tu pago para evitar interrupciones.`;
  } else if (daysRemaining === 1) {
    body = `Tu membresía "${membershipName}" vence mañana. Renueva desde Pagos para mantener tu acceso.`;
  } else {
    body = `Tu membresía "${membershipName}" vence en ${daysRemaining} días. Planifica tu renovación desde Pagos.`;
  }

  const dedupeKey =
    eventType === 'expiring_soon'
      ? `expiry:sub:${subscriptionId}:${endDate}:${daysRemaining}`
      : `expired:sub:${subscriptionId}`;

  try {
    return await createUserNotification({
      userId,
      type: eventType,
      title,
      body,
      href: '/payments',
      severity: expiryNotificationSeverity(daysRemaining, alertDays),
      metadata: {
        subscription_id: subscriptionId,
        membership_name: membershipName,
        end_date: endDate,
        days_remaining: daysRemaining,
      },
      dedupeKey,
    });
  } catch (err) {
    console.error('[notify] membership expiry in-app', err);
    return false;
  }
}
