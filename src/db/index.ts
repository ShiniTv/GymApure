import pg from 'pg';
import { env } from '../config/env.ts';
import { isSupabaseStorageConfigured } from '../lib/supabaseAdmin.ts';

const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
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
    console.warn(
      '[db] Base de datos sin usuarios. Ejecuta: npm run db:restore-demo (requiere DEMO_PASSWORD en .env).'
    );
  }

  if (isSupabaseStorageConfigured()) {
    console.log('[storage] Comprobantes de pago → Supabase Storage (payment-proofs)');
  } else {
    console.warn(
      '[storage] Comprobantes en disco local (uploads/proofs). Define SUPABASE_SERVICE_ROLE_KEY para persistencia en Supabase.'
    );
  }
}

export default { query, withTransaction };
