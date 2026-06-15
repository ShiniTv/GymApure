/**
 * One-time migration: copies data from local gym.db (SQLite) to Supabase/Postgres.
 *
 * Prerequisites:
 *   1. Run supabase/migrations SQL on your Supabase project (SQL Editor or CLI).
 *   2. Set DATABASE_URL in .env to your Supabase connection string.
 *   3. Keep gym.db in the project root (or set SQLITE_PATH).
 *
 * Usage: npm run db:migrate-from-sqlite
 */
import 'dotenv/config';
import Database from 'better-sqlite3';
import pg from 'pg';
import path from 'path';

const SQLITE_PATH = process.env.SQLITE_PATH || path.join(process.cwd(), 'gym.db');
const TABLES_ORDER = [
  'users',
  'memberships',
  'subscriptions',
  'payments',
  'exercises',
  'routines',
  'routine_exercises',
  'user_routines',
  'user_measurements',
  'attendance',
  'audit_logs',
  'workout_sessions',
  'workout_logs',
] as const;

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required in .env');
    process.exit(1);
  }

  const sqlite = new Database(SQLITE_PATH, { readonly: true });
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('supabase')
      ? { rejectUnauthorized: false }
      : undefined,
  });

  const client = await pool.connect();

  try {
    const { rows: existing } = await client.query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM users'
    );
    if (parseInt(existing[0].count, 10) > 0) {
      console.warn('Postgres already has users. Aborting to avoid duplicates.');
      console.warn('Truncate tables manually if you want to re-import.');
      process.exit(1);
    }

    await client.query('BEGIN');

    for (const table of TABLES_ORDER) {
      const rows = sqlite.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[];
      if (rows.length === 0) {
        console.log(`  ${table}: (empty)`);
        continue;
      }

      const columns = Object.keys(rows[0]);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;

      for (const row of rows) {
        const values = columns.map((col) => row[col]);
        await client.query(sql, values);
      }

      const pk = 'id';
      await client.query(
        `SELECT setval(pg_get_serial_sequence($1, $2), COALESCE((SELECT MAX(id) FROM ${table}), 1))`,
        [table, pk]
      );

      console.log(`  ${table}: ${rows.length} rows`);
    }

    await client.query('COMMIT');
    console.log('Migration completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
    sqlite.close();
  }
}

main();
