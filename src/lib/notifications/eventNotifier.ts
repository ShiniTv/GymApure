import { query } from '../../db/index.ts';
import { getExpirySettings } from '../gymSettings.ts';
import { fetchMemberContact, notifyAdmins, notifyMember } from './memberNotify.ts';

export async function notifyPaymentReported(paymentId: number, userId: number, amountUsd: number): Promise<void> {
  const settings = await getExpirySettings();
  if (!settings.notify_admin_new_payment) return;

  const member = await fetchMemberContact(userId);
  if (!member) return;

  await notifyAdmins(
    `[Caribean Gym] Nuevo pago reportado`,
    `${member.full_name} reportó un pago de $${amountUsd} USD (ID #${paymentId}). Revisa el panel de pagos para aprobarlo.`
  );
}

export async function notifyPaymentApproved(
  userId: number,
  amountUsd: number,
  membershipName?: string
): Promise<void> {
  const settings = await getExpirySettings();
  if (!settings.notify_payment_events) return;

  const member = await fetchMemberContact(userId);
  if (!member) return;

  const planLine = membershipName ? ` Plan activado: ${membershipName}.` : '';
  const message = `Hola ${member.full_name}, tu pago de $${amountUsd} USD fue aprobado en Caribean Gym.${planLine} ¡Nos vemos en el gym!`;

  await notifyMember(member, 'Pago aprobado — Caribean Gym', message);
}

export async function notifyPaymentRejected(userId: number, amountUsd: number): Promise<void> {
  const settings = await getExpirySettings();
  if (!settings.notify_payment_events) return;

  const member = await fetchMemberContact(userId);
  if (!member) return;

  const message = `Hola ${member.full_name}, tu pago de $${amountUsd} USD no pudo ser verificado en Caribean Gym. Revisa el comprobante y vuelve a reportarlo, o contacta al administrador.`;

  await notifyMember(member, 'Pago rechazado — Caribean Gym', message);
}

export async function notifyRoutineAssigned(userId: number, routineId: number): Promise<void> {
  const settings = await getExpirySettings();
  if (!settings.notify_routine_assigned) return;

  const member = await fetchMemberContact(userId);
  if (!member) return;

  const { rows } = await query<{ name: string }>('SELECT name FROM routines WHERE id = $1', [routineId]);
  const routineName = rows[0]?.name ?? 'tu nueva rutina';

  const message = `Hola ${member.full_name}, tu entrenador te asignó la rutina "${routineName}" en Caribean Gym. Entra a la app para ver los ejercicios y empezar a entrenar.`;

  await notifyMember(member, 'Nueva rutina asignada — Caribean Gym', message);
}
