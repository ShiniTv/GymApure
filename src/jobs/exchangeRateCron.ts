import { getActiveUsdRate, refreshBcvUsdRate } from '../lib/exchangeRate.ts';
import { logger } from '../lib/logger.ts';

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000;
const STARTUP_DEFER_MS = 30_000;

function resolveIntervalMs(): number {
  const raw = parseInt(
    process.env.EXCHANGE_RATE_CRON_INTERVAL_MS ?? String(DEFAULT_INTERVAL_MS),
    10
  );
  return Number.isFinite(raw) && raw >= 60_000 ? raw : DEFAULT_INTERVAL_MS;
}

let running = false;

async function tick(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const active = await getActiveUsdRate();
    const today = new Date().toISOString().slice(0, 10);
    const needsRefresh = !active || (active.source === 'bcv' && active.effective_date < today);

    if (needsRefresh) {
      const result = await refreshBcvUsdRate();
      logger.info('Cron tasa BCV', { message: result.message, inserted: result.inserted });
    }
  } catch (err) {
    logger.error('Cron tasa BCV falló', {
      error: err instanceof Error ? err.message : String(err),
    });
  } finally {
    running = false;
  }
}

export function startExchangeRateCron(): void {
  if (process.env.NODE_ENV !== 'production' && process.env.EXCHANGE_RATE_CRON_IN_DEV !== 'true') {
    return;
  }

  const intervalMs = resolveIntervalMs();
  logger.info('Cron tasa BCV activo', { intervalMinutes: Math.round(intervalMs / 60_000) });
  setTimeout(() => void tick(), STARTUP_DEFER_MS);
  setInterval(() => void tick(), intervalMs);
}

export async function runExchangeRateRefreshNow(): Promise<
  Awaited<ReturnType<typeof refreshBcvUsdRate>>
> {
  return refreshBcvUsdRate();
}

export function ensureExchangeRateOnStartup(): void {
  setTimeout(() => {
    void (async () => {
      try {
        const active = await getActiveUsdRate();
        if (!active) {
          const result = await refreshBcvUsdRate();
          logger.info('Tasa BCV inicial cargada al arranque', { message: result.message });
        }
      } catch (err) {
        logger.warn('No se pudo cargar tasa BCV al arranque', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })();
  }, STARTUP_DEFER_MS);
}
