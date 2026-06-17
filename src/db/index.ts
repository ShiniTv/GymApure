import pg from 'pg';
import { env } from '../config/env.ts';
import { isSupabaseStorageConfigured } from '../lib/supabaseAdmin.ts';
import { logger } from '../lib/logger.ts';

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
    logger.info('Storage de comprobantes configurado', {
      backend: 'supabase',
      bucket: 'payment-proofs',
    });
  } else {
    logger.warn('Storage de comprobantes en disco local', {
      path: 'uploads/proofs',
      recommendation: 'Definir SUPABASE_SERVICE_ROLE_KEY',
    });
  }
}

export default { query, withTransaction };
