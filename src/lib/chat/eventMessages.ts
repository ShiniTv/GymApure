import { query } from '../../db/index.ts';
import { postSystemMessage } from './systemMessages.ts';
import { BRAND } from '../../config/brand.ts';

async function fetchMemberName(userId: number): Promise<string | null> {
  const { rows } = await query<{ full_name: string }>(
    'SELECT full_name FROM users WHERE id = $1 AND role = $2',
    [userId, 'member']
  );
  return rows[0]?.full_name ?? null;
}

export async function notifyPaymentReported(
  paymentId: number,
  userId: number,
  amountUsd: number
): Promise<void> {
  const fullName = await fetchMemberName(userId);
  if (!fullName) return;

  await postSystemMessage({
    memberId: userId,
    eventType: 'payment_reported',
    body: `${fullName} reportó un pago de $${amountUsd} USD (ID #${paymentId}). Revisa el panel de pagos para aprobarlo.`,
    metadataKey: String(paymentId),
    metadata: { payment_id: paymentId, amount_usd: amountUsd },
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
    metadata: { amount_usd: amountUsd, membership_name: membershipName ?? null, payment_id: paymentId ?? null },
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
}

export async function notifyRoutineAssigned(userId: number, routineId: number): Promise<void> {
  const fullName = await fetchMemberName(userId);
  if (!fullName) return;

  const { rows } = await query<{ name: string }>('SELECT name FROM routines WHERE id = $1', [routineId]);
  const routineName = rows[0]?.name ?? 'tu nueva rutina';

  const message = `Hola ${fullName}, tu entrenador te asignó la rutina "${routineName}" en ${BRAND.name}. Entra a la app para ver los ejercicios y empezar a entrenar.`;

  await postSystemMessage({
    memberId: userId,
    eventType: 'routine_assigned',
    body: message,
    metadataKey: String(routineId),
    metadata: { routine_id: routineId, routine_name: routineName },
  });
}
