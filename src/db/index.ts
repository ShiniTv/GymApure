import pg from 'pg';
import { env } from '../config/env.ts';
import { isSupabaseStorageConfigured, getSupabaseServiceKey } from '../lib/supabaseAdmin.ts';
import { logger } from '../lib/logger.ts';

// BIGINT (OID 20) → number — ids del gym caben en Number.MAX_SAFE_INTEGER
pg.types.setTypeParser(20, (value) => parseInt(value, 10));

const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl: env.DATABASE_URL.includes('supabase')
    ? { rejectUnauthorized: false }
    : undefined,
});

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
) {
  return pool.query<T>(text, params);
}

export async function withTransaction<T>(
  fn: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
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
  const { rows } = await query<{ count: string }>('SELECT COUNT(*)::text AS count FROM users');
  if (parseInt(rows[0].count, 10) === 0) {
    logger.warn('Base de datos sin usuarios', {
      action: 'npm run db:create-admin',
    });
  }

  if (isSupabaseStorageConfigured()) {
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

export default { query, withTransaction };
