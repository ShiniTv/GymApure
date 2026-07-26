import { query } from '../db/index.ts';
import { getActiveUsdRate, roundBsAmount } from './exchangeRate.ts';
import {
  defaultPaymentDestinations,
  normalizePaymentDestinations,
  type PaymentDestinations,
} from './paymentDestinationsCore.ts';

export type TrainerRatePreference = 'bcv' | 'euro';

export interface TrainerRatePrefs {
  rate_preference: TrainerRatePreference;
  euro_rate: number | null;
  euro_rate_note: string;
}

export interface TrainerRateContext extends TrainerRatePrefs {
  /** Resolved Bs per 1 USD according to preference */
  active_bs_per_usd: number | null;
  active_label: string;
  bcv_bs_per_usd: number | null;
}

const defaultRatePrefs = (): TrainerRatePrefs => ({
  rate_preference: 'bcv',
  euro_rate: null,
  euro_rate_note: '',
});

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
    usdt: { ...current.usdt, ...(partial.usdt ?? {}) },
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

export async function getTrainerRatePrefs(trainerId: number): Promise<TrainerRatePrefs> {
  const { rows } = await query<{
    rate_preference: string;
    euro_rate: number | null;
    euro_rate_note: string | null;
  }>(
    `SELECT rate_preference, euro_rate, euro_rate_note
     FROM trainer_payment_destinations WHERE trainer_id = $1`,
    [trainerId]
  );
  if (!rows[0]) return defaultRatePrefs();
  const pref = rows[0].rate_preference === 'euro' ? 'euro' : 'bcv';
  const euro =
    rows[0].euro_rate != null && Number.isFinite(Number(rows[0].euro_rate))
      ? Number(rows[0].euro_rate)
      : null;
  return {
    rate_preference: pref,
    euro_rate: euro,
    euro_rate_note: (rows[0].euro_rate_note ?? '').trim(),
  };
}

export async function upsertTrainerRatePrefs(
  trainerId: number,
  input: Partial<TrainerRatePrefs>
): Promise<TrainerRatePrefs> {
  const current = await getTrainerRatePrefs(trainerId);
  const next: TrainerRatePrefs = {
    rate_preference: input.rate_preference === 'euro' ? 'euro' : 'bcv',
    euro_rate:
      input.euro_rate !== undefined
        ? input.euro_rate != null && Number.isFinite(input.euro_rate) && input.euro_rate > 0
          ? input.euro_rate
          : null
        : current.euro_rate,
    euro_rate_note:
      input.euro_rate_note !== undefined
        ? String(input.euro_rate_note).trim().slice(0, 300)
        : current.euro_rate_note,
  };

  if (next.rate_preference === 'euro' && (next.euro_rate == null || next.euro_rate <= 0)) {
    throw new Error('Indica la tasa euro (Bs por 1 USD)');
  }

  await query(
    `INSERT INTO trainer_payment_destinations
       (trainer_id, payload, rate_preference, euro_rate, euro_rate_note, updated_at)
     VALUES ($1, $2::jsonb, $3, $4, $5, NOW())
     ON CONFLICT (trainer_id) DO UPDATE
       SET rate_preference = EXCLUDED.rate_preference,
           euro_rate = EXCLUDED.euro_rate,
           euro_rate_note = EXCLUDED.euro_rate_note,
           updated_at = NOW()`,
    [
      trainerId,
      JSON.stringify(await getTrainerPaymentDestinations(trainerId)),
      next.rate_preference,
      next.euro_rate,
      next.euro_rate_note,
    ]
  );
  return next;
}

export async function getTrainerRateContext(trainerId: number): Promise<TrainerRateContext> {
  const prefs = await getTrainerRatePrefs(trainerId);
  const bcv = await getActiveUsdRate();
  const bcvRate = bcv?.rate ?? null;

  if (prefs.rate_preference === 'euro') {
    return {
      ...prefs,
      bcv_bs_per_usd: bcvRate,
      active_bs_per_usd: prefs.euro_rate,
      active_label: 'Tasa euro',
    };
  }

  return {
    ...prefs,
    bcv_bs_per_usd: bcvRate,
    active_bs_per_usd: bcvRate,
    active_label: bcv?.source === 'manual' ? 'Tasa manual (BCV override)' : 'Tasa BCV',
  };
}

export function formatPtBsEquivalent(amountUsd: number, ctx: TrainerRateContext): string | null {
  if (!ctx.active_bs_per_usd || !(amountUsd > 0)) return null;
  const bs = roundBsAmount(amountUsd, ctx.active_bs_per_usd);
  return `≈ ${bs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs (${ctx.active_label})`;
}
