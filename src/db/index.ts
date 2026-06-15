import pg from 'pg';
import { env } from '../config/env.ts';

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
}

export default { query, withTransaction };
