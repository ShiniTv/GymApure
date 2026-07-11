import pg from 'pg';
import { env } from '../config/env.ts';
import { isSupabaseStorageConfigured, getSupabaseServiceKey } from '../lib/supabaseAdmin.ts';
import { logger } from '../lib/logger.ts';
import { getPgSslConfig } from '../lib/dbSsl.ts';

// BIGINT (OID 20) → number — ids del gym caben en Number.MAX_SAFE_INTEGER
pg.types.setTypeParser(20, (value) => parseInt(value, 10));

const SLOW_QUERY_MS = parseInt(process.env.SLOW_QUERY_MS ?? '2000', 10);

const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  // Supabase pooler (cold start / red lenta) puede tardar >5s; 5s provocaba timeout al arrancar dev.
  connectionTimeoutMillis: env.NODE_ENV === 'development' ? 30_000 : 10_000,
  ssl: getPgSslConfig(env.DATABASE_URL),
});

pool.on('connect', (client) => {
  void client.query('SET statement_timeout = 30000');
});

let lastPoolWaitLogAt = 0;

export function getPoolMetrics(): {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
} {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
}

async function reportSlowQuery(durationMs: number, text: string): Promise<void> {
  const preview = text.replace(/\s+/g, ' ').trim().slice(0, 120);
  logger.warn('Consulta lenta', { durationMs: Math.round(durationMs), query: preview });

  if (env.SENTRY_DSN) {
    try {
      const Sentry = await import('@sentry/node');
      Sentry.captureMessage('Slow database query', {
        level: 'warning',
        extra: { durationMs: Math.round(durationMs), query: preview },
      });
    } catch {
      /* Sentry no disponible */
    }
  }
}

async function reportPoolPressure(): Promise<void> {
  const { waitingCount, totalCount } = getPoolMetrics();
  if (waitingCount <= 0) return;

  const now = Date.now();
  if (now - lastPoolWaitLogAt < 30_000) return;
  lastPoolWaitLogAt = now;

  logger.warn('Pool de BD bajo presión', { waitingCount, totalCount });

  if (env.SENTRY_DSN) {
    try {
      const Sentry = await import('@sentry/node');
      Sentry.captureMessage('Database pool waiting', {
        level: 'warning',
        extra: { waitingCount, totalCount },
      });
    } catch {
      /* Sentry no disponible */
    }
  }
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
) {
  if (pool.waitingCount > 0) {
    void reportPoolPressure();
  }

  const start = performance.now();
  try {
    return await pool.query<T>(text, params);
  } finally {
    const durationMs = performance.now() - start;
    if (durationMs >= SLOW_QUERY_MS) {
      void reportSlowQuery(durationMs, text);
    }
  }
}

export async function withTransaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function initDb() {
  await query('SELECT 1');

  if (env.DATABASE_URL.includes('supabase') && !env.DATABASE_URL.includes(':6543/')) {
    logger.warn('DATABASE_URL no usa el pooler de Supabase (puerto 6543)', {
      hint: 'En producción usa Transaction mode pooler para evitar agotar conexiones directas.',
    });
  }

  const { rows } = await query<{ count: string }>('SELECT COUNT(*)::text AS count FROM users');
  if (parseInt(rows[0].count, 10) === 0) {
    logger.warn('Base de datos sin usuarios', {
      action: 'npm run db:create-admin',
    });
  }

  if (env.NODE_ENV === 'production' && !isSupabaseStorageConfigured()) {
    if (process.env.CI === 'true') {
      logger.warn('CI: servidor sin Supabase Storage — uploads en disco local para tests', {
        hint: 'En Render/producción real sigue siendo obligatorio SUPABASE_SERVICE_ROLE_KEY.',
      });
    } else {
      logger.error('SUPABASE_SERVICE_ROLE_KEY es obligatorio en producción', {
        hint: 'Los archivos deben ir a Supabase Storage; el disco de Render es efímero.',
      });
      process.exit(1);
    }
  } else if (isSupabaseStorageConfigured()) {
    logger.debug('Storage de comprobantes configurado', {
      backend: 'supabase',
      bucket: 'payment-proofs',
    });
  } else if (getSupabaseServiceKey()) {
    logger.warn('SUPABASE_SERVICE_ROLE_KEY no parece válida; comprobantes en disco local', {
      hint: 'Usa service_role (eyJ…) o sb_secret_… sin comillas. Ver Supabase → Project Settings → API Keys.',
      path: 'uploads/proofs',
    });
  } else {
    logger.debug('Storage de comprobantes en disco local', {
      path: 'uploads/proofs',
      recommendation: 'Definir SUPABASE_SERVICE_ROLE_KEY para producción',
    });
  }
}

export { pool };
export default { query, withTransaction };
