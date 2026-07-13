import { query } from '../db/index.ts';
import { fetchBcvUsdRate } from './bcvScraper.ts';
import { logger } from './logger.ts';

export type ExchangeRateSource = 'bcv' | 'manual';

export interface ActiveUsdRate {
  currency: 'USD';
  rate: number;
  effective_date: string;
  source: ExchangeRateSource;
  fetched_at: string;
}

export interface ExchangeRateOverride {
  rate: number | null;
  note: string;
}

export interface RefreshBcvResult {
  inserted: boolean;
  rate: BcvUsdRateRow | null;
  message: string;
}

interface BcvUsdRateRow {
  id: number;
  currency: string;
  rate: number;
  effective_date: string;
  source: string;
  fetched_at: string;
}

const OVERRIDE_RATE_KEY = 'exchange_rate_usd_override';
const OVERRIDE_NOTE_KEY = 'exchange_rate_usd_override_note';
const CACHE_TTL_MS = 60_000;

let cache: { value: ActiveUsdRate | null; expiresAt: number } | null = null;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function invalidateCache(): void {
  cache = null;
}

async function readOverride(): Promise<ExchangeRateOverride> {
  const { rows } = await query<{ key: string; value: string }>(
    `SELECT key, value FROM gym_settings WHERE key = ANY($1::text[])`,
    [[OVERRIDE_RATE_KEY, OVERRIDE_NOTE_KEY]]
  );
  const map = new Map(rows.map((row) => [row.key, row.value]));
  const rawRate = map.get(OVERRIDE_RATE_KEY)?.trim() ?? '';
  const parsedRate = rawRate ? Number.parseFloat(rawRate) : Number.NaN;
  return {
    rate: Number.isFinite(parsedRate) && parsedRate > 0 ? parsedRate : null,
    note: map.get(OVERRIDE_NOTE_KEY)?.trim() ?? '',
  };
}

async function getLatestBcvUsdRate(): Promise<BcvUsdRateRow | null> {
  const { rows } = await query<BcvUsdRateRow>(
    `SELECT id, currency, rate, effective_date::text, source, fetched_at::text
     FROM exchange_rates
     WHERE currency = 'USD' AND source = 'bcv'
     ORDER BY effective_date DESC, fetched_at DESC
     LIMIT 1`
  );
  return rows[0] ?? null;
}

export async function getActiveUsdRate(): Promise<ActiveUsdRate | null> {
  if (cache && Date.now() < cache.expiresAt) {
    return cache.value;
  }

  try {
    const override = await readOverride();
    if (override.rate != null) {
      const active: ActiveUsdRate = {
        currency: 'USD',
        rate: override.rate,
        effective_date: todayIso(),
        source: 'manual',
        fetched_at: new Date().toISOString(),
      };
      cache = { value: active, expiresAt: Date.now() + CACHE_TTL_MS };
      return active;
    }

    const latest = await getLatestBcvUsdRate();
    if (!latest) {
      cache = { value: null, expiresAt: Date.now() + CACHE_TTL_MS };
      return null;
    }

    const active: ActiveUsdRate = {
      currency: 'USD',
      rate: Number(latest.rate),
      effective_date: latest.effective_date,
      source: 'bcv',
      fetched_at: latest.fetched_at,
    };
    cache = { value: active, expiresAt: Date.now() + CACHE_TTL_MS };
    return active;
  } catch (err) {
    logger.error('Error al obtener tasa USD activa', {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export async function getRecentBcvUsdRates(limit = 7): Promise<BcvUsdRateRow[]> {
  const { rows } = await query<BcvUsdRateRow>(
    `SELECT id, currency, rate, effective_date::text, source, fetched_at::text
     FROM exchange_rates
     WHERE currency = 'USD' AND source = 'bcv'
     ORDER BY effective_date DESC, fetched_at DESC
     LIMIT $1`,
    [limit]
  );
  return rows;
}

export async function getExchangeRateAdminView() {
  const [active, override, history] = await Promise.all([
    getActiveUsdRate(),
    readOverride(),
    getRecentBcvUsdRates(),
  ]);
  return { active, override, history };
}

export async function refreshBcvUsdRate(): Promise<RefreshBcvResult> {
  const scraped = await fetchBcvUsdRate();

  const existing = await query<{ id: number; rate: number }>(
    `SELECT id, rate FROM exchange_rates
     WHERE currency = 'USD' AND source = 'bcv' AND effective_date = $1::date
     LIMIT 1`,
    [scraped.effectiveDate]
  );

  const hadExisting = Boolean(existing.rows[0]);
  const sameRate = hadExisting && Math.abs(Number(existing.rows[0].rate) - scraped.rate) < 0.0001;

  const { rows } = await query<BcvUsdRateRow>(
    `INSERT INTO exchange_rates (currency, rate, effective_date, source)
     VALUES ('USD', $1, $2::date, 'bcv')
     ON CONFLICT (currency, effective_date, source) DO UPDATE
       SET rate = EXCLUDED.rate, fetched_at = NOW()
     RETURNING id, currency, rate, effective_date::text, source, fetched_at::text`,
    [scraped.rate, scraped.effectiveDate]
  );

  invalidateCache();
  logger.info('Tasa BCV USD registrada', {
    rate: scraped.rate,
    effectiveDate: scraped.effectiveDate,
    hadExisting,
  });

  return {
    inserted: !hadExisting,
    rate: rows[0] ?? null,
    message: sameRate
      ? `Tasa BCV del ${scraped.effectiveDate} ya registrada`
      : `Tasa BCV ${hadExisting ? 'actualizada' : 'registrada'}: ${scraped.rate} Bs/USD (${scraped.effectiveDate})`,
  };
}

export async function setManualUsdOverride(rate: number, note = ''): Promise<ActiveUsdRate> {
  if (!Number.isFinite(rate) || rate <= 0 || rate > 10_000) {
    throw new Error('Tasa manual inválida');
  }

  await query(
    `INSERT INTO gym_settings (key, value, updated_at)
     VALUES ($1, $2, NOW()), ($3, $4, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [OVERRIDE_RATE_KEY, String(rate), OVERRIDE_NOTE_KEY, note.trim()]
  );

  invalidateCache();
  const active = await getActiveUsdRate();
  if (!active) {
    throw new Error('No se pudo activar la tasa manual');
  }
  return active;
}

export async function clearManualUsdOverride(): Promise<void> {
  await query(
    `INSERT INTO gym_settings (key, value, updated_at)
     VALUES ($1, '', NOW()), ($2, '', NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [OVERRIDE_RATE_KEY, OVERRIDE_NOTE_KEY]
  );
  invalidateCache();
}

export function roundBsAmount(amountUsd: number, rate: number): number {
  return Math.round(amountUsd * rate * 100) / 100;
}

export const BS_PAYMENT_METHODS = new Set(['pago_movil', 'transferencia']);
