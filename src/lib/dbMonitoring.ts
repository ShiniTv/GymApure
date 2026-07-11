import * as Sentry from '@sentry/node';
import { env } from '../config/env.ts';
import { logger } from './logger.ts';

const SLOW_QUERY_MS = 2000;

let lastPoolWarnAt = 0;
const POOL_WARN_COOLDOWN_MS = 60_000;

export function reportPoolPressure(waitingCount: number, totalCount: number): void {
  if (waitingCount <= 0) return;

  const now = Date.now();
  if (now - lastPoolWarnAt < POOL_WARN_COOLDOWN_MS) return;
  lastPoolWarnAt = now;

  const meta = { waitingCount, totalCount };
  logger.warn('Pool de BD bajo presión', meta);

  if (env.SENTRY_DSN) {
    Sentry.withScope((scope) => {
      scope.setLevel('warning');
      scope.setTag('db.pool', 'pressure');
      scope.setExtra('waitingCount', waitingCount);
      scope.setExtra('totalCount', totalCount);
      Sentry.captureMessage('DB pool waiting for connections');
    });
  }
}

export function reportSlowQuery(durationMs: number, sqlPreview: string): void {
  if (durationMs < SLOW_QUERY_MS) return;

  const meta = { durationMs: Number(durationMs.toFixed(2)), sql: sqlPreview };
  logger.warn('Consulta SQL lenta', meta);

  if (env.SENTRY_DSN) {
    Sentry.withScope((scope) => {
      scope.setLevel('warning');
      scope.setTag('db.query', 'slow');
      scope.setExtra('durationMs', durationMs);
      scope.setExtra('sqlPreview', sqlPreview);
      Sentry.captureMessage('Slow SQL query');
    });
  }
}

export function sqlPreview(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, 120);
}
