import { query } from '../db/index.ts';
import {
  defaultPaymentDestinations,
  normalizePaymentDestinations,
  type PaymentDestinations,
} from './paymentDestinationsCore.ts';

export async function getTrainerPaymentDestinations(
  trainerId: number
): Promise<PaymentDestinations> {
  const { rows } = await query<{ payload: unknown }>(
    `SELECT payload FROM trainer_payment_destinations WHERE trainer_id = $1`,
    [trainerId]
  );
  if (!rows[0]) return defaultPaymentDestinations();
  return normalizePaymentDestinations(rows[0].payload);
}

export async function upsertTrainerPaymentDestinations(
  trainerId: number,
  partial: Partial<PaymentDestinations>
): Promise<PaymentDestinations> {
  const current = await getTrainerPaymentDestinations(trainerId);
  const next = normalizePaymentDestinations({
    ...current,
    ...partial,
    pago_movil: { ...current.pago_movil, ...(partial.pago_movil ?? {}) },
    transferencia: { ...current.transferencia, ...(partial.transferencia ?? {}) },
    zelle: { ...current.zelle, ...(partial.zelle ?? {}) },
    efectivo_usd: { ...current.efectivo_usd, ...(partial.efectivo_usd ?? {}) },
  });

  await query(
    `INSERT INTO trainer_payment_destinations (trainer_id, payload, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (trainer_id) DO UPDATE
       SET payload = EXCLUDED.payload, updated_at = NOW()`,
    [trainerId, JSON.stringify(next)]
  );
  return next;
}
