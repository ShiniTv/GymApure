/**
 * Aplica migraciones SQL pendientes en supabase/migrations/.
 * Uso: npm run db:migrate
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import pg from 'pg';

const MIGRATIONS_DIR = path.join(process.cwd(), 'supabase', 'migrations');

/** Si el objeto principal de la migración ya existe, se marca como aplicada sin re-ejecutar. */
const MIGRATION_MARKERS: Record<string, string> = {
  '20260518000000_init_gym_schema.sql': `
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users' LIMIT 1`,
  '20260615000000_security_improvements.sql': `
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_cedula' LIMIT 1`,
  '20260615000001_expiry_alerts_index.sql': `
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_subscriptions_end_date_active' LIMIT 1`,
  '20260615000002_expiry_notifications.sql': `
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'gym_settings' LIMIT 1`,
  '20260615000003_event_notifications.sql': `
    SELECT 1 FROM gym_settings WHERE key = 'whatsapp_notifications_enabled' LIMIT 1`,
  '20260616000000_payment_proofs_storage.sql': `
    SELECT 1 FROM storage.buckets WHERE id = 'payment-proofs' LIMIT 1`,
};

/** Migraciones que solo aplican en Supabase (p. ej. storage.buckets). */
const SUPABASE_ONLY_MIGRATIONS = new Set(['20260616000000_payment_proofs_storage.sql']);

async function hasSupabaseStorage(pool: pg.Pool): Promise<boolean> {
  try {
    const { rows } = await pool.query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'storage' AND table_name = 'buckets' LIMIT 1`
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}

async function isAlreadyPresent(pool: pg.Pool, file: string): Promise<boolean> {
  const marker = MIGRATION_MARKERS[file];
  if (!marker) return false;
  try {
    const { rows } = await pool.query(marker);
    return rows.length > 0;
  } catch {
    return false;
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.error('Falta DATABASE_URL en .env');
    process.exit(1);
  }

  const pool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('supabase') ? { rejectUnauthorized: false } : undefined,
  });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('No hay archivos de migración.');
      return;
    }

    const { rows: applied } = await pool.query<{ filename: string }>(
      'SELECT filename FROM schema_migrations'
    );
    const appliedSet = new Set(applied.map((r) => r.filename));

    let ran = 0;
    let baselined = 0;
    let skipped = 0;
    const supabaseStorageAvailable = await hasSupabaseStorage(pool);

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`  · ${file} (ya aplicada)`);
        continue;
      }

      if (SUPABASE_ONLY_MIGRATIONS.has(file) && !supabaseStorageAvailable) {
        await pool.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING',
          [file]
        );
        console.log(`  ⊘ ${file} (omitida — Supabase Storage no disponible)`);
        skipped += 1;
        continue;
      }

      if (await isAlreadyPresent(pool, file)) {
        await pool.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING',
          [file]
        );
        console.log(`  ↳ ${file} (baseline — ya existía en la BD)`);
        baselined += 1;
        continue;
      }

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      console.log(`→ Aplicando ${file}...`);

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`  ✓ ${file}`);
        ran += 1;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    if (ran === 0 && baselined === 0 && skipped === 0) {
      console.log('\nBase de datos al día. No había migraciones pendientes.');
    } else {
      const parts = [];
      if (ran > 0) parts.push(`${ran} aplicada(s)`);
      if (baselined > 0) parts.push(`${baselined} reconocida(s) como ya existentes`);
      if (skipped > 0) parts.push(`${skipped} omitida(s) (Supabase-only)`);
      console.log(`\nListo. ${parts.join(', ')}.`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('\nError aplicando migraciones:', err instanceof Error ? err.message : err);
  process.exit(1);
});
