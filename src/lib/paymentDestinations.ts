import { query } from '../db/index.ts';
import {
  defaultPaymentDestinations,
  normalizePaymentDestinations,
  PAYMENT_DESTINATION_KEY,
  type PaymentDestinations,
} from './paymentDestinationsCore.ts';

export * from './paymentDestinationsCore.ts';

let cache: { value: PaymentDestinations; expiresAt: number } | null = null;
const CACHE_TTL_MS = 20_000;

export function invalidatePaymentDestinationsCache(): void {
  cache = null;
}

export async function getPaymentDestinations(): Promise<PaymentDestinations> {
  if (cache && Date.now() < cache.expiresAt) return cache.value;

  try {
    const { rows } = await query<{ value: string }>(
      `SELECT value FROM gym_settings WHERE key = $1 LIMIT 1`,
      [PAYMENT_DESTINATION_KEY]
    );
    const parsed = rows[0]?.value ? (JSON.parse(rows[0].value) as unknown) : null;
    const value = normalizePaymentDestinations(parsed);
    cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
    return value;
  } catch {
    return defaultPaymentDestinations();
  }
}

export async function updatePaymentDestinations(
  partial: Partial<PaymentDestinations>
): Promise<PaymentDestinations> {
  const current = await getPaymentDestinations();
  const next = normalizePaymentDestinations({
    ...current,
    ...partial,
    pago_movil: { ...current.pago_movil, ...(partial.pago_movil ?? {}) },
    transferencia: { ...current.transferencia, ...(partial.transferencia ?? {}) },
    zelle: { ...current.zelle, ...(partial.zelle ?? {}) },
    efectivo_usd: { ...current.efectivo_usd, ...(partial.efectivo_usd ?? {}) },
  });

  await query(
    `INSERT INTO gym_settings (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [PAYMENT_DESTINATION_KEY, JSON.stringify(next)]
  );

  invalidatePaymentDestinationsCache();
  return next;
}
