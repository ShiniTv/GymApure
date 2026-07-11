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
    SELECT 1 FROM gym_settings WHERE key = 'whatsapp_notifications_enabled' LIMIT 1
    UNION ALL
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'chat_system_log' LIMIT 1`,
  '20260616000000_payment_proofs_storage.sql': `
    SELECT 1 FROM storage.buckets WHERE id = 'payment-proofs' LIMIT 1`,
  '20260620000000_media_storage_buckets.sql': `
    SELECT 1 FROM storage.buckets WHERE id = 'avatars' LIMIT 1`,
  '20260617000000_enable_rls_internal_tables.sql': `
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'gym_settings' AND c.relrowsecurity = true
    LIMIT 1`,
  '20260617000001_lockdown_public_api_tables.sql': `
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'backend_only'
    LIMIT 1`,
  '20260617000002_unindexed_foreign_keys.sql': `
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_subscriptions_membership_id' LIMIT 1`,
  '20260617000003_drop_redundant_subscription_index.sql': `
    SELECT 1 WHERE NOT EXISTS (
      SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_subscriptions_user_id'
    )`,
  '20260619000000_add_receptionist_role.sql': `
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'receptionist'
    LIMIT 1`,
  '20260621000000_auth_token_version.sql': `
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'token_version'
    LIMIT 1`,
  '20260622000000_chat_messages.sql': `
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'chat_conversations' LIMIT 1`,
  '20260623000000_chat_message_edited_at.sql': `
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'chat_messages' AND column_name = 'edited_at'
    LIMIT 1`,
  '20260624000000_nutrition.sql': `
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'nutrition_plans' LIMIT 1`,
  '20260705000000_user_notifications.sql': `
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_notifications' LIMIT 1`,
  '20260708130000_exchange_rates.sql': `
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'exchange_rates' LIMIT 1`,
  '20260711120000_cleanup_legacy_settings.sql': `
    SELECT 1 WHERE NOT EXISTS (
      SELECT 1 FROM gym_settings WHERE key = 'email_notifications_enabled'
    )`,
  '20260711120100_drop_equipment_catalog_image_url.sql': `
    SELECT 1 WHERE NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'equipment_catalog' AND column_name = 'image_url'
    )`,
};

/** ALTER TYPE ... ADD VALUE must commit before the new label is usable. */
function requiresNonTransactionalApply(sql: string): boolean {
  return /\bALTER\s+TYPE\b[\s\S]*\bADD\s+VALUE\b/i.test(sql);
}

/** Supabase creates these roles; plain Postgres (CI/local) needs stubs for RLS migrations. */
async function ensureSupabaseApiRoles(pool: pg.Pool): Promise<void> {
  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOLOGIN;
      END IF;
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN;
      END IF;
    END $$;
  `);
}

/** Migraciones que solo aplican en Supabase (p. ej. storage.buckets). */
const SUPABASE_ONLY_MIGRATIONS = new Set([
  '20260616000000_payment_proofs_storage.sql',
  '20260620000000_media_storage_buckets.sql',
  '20260701100000_exercise_videos_poster_mime.sql',
  '20260708120200_equipment_photos_bucket.sql',
]);

function referencesSupabaseStorage(sql: string): boolean {
  return /\bstorage\./i.test(sql);
}

function shouldSkipSupabaseStorageMigration(
  file: string,
  sql: string,
  supabaseStorageAvailable: boolean
): boolean {
  return (
    !supabaseStorageAvailable &&
    (SUPABASE_ONLY_MIGRATIONS.has(file) || referencesSupabaseStorage(sql))
  );
}

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

function migrationVersionFromFile(file: string): string {
  const match = file.match(/^(\d+)/);
  return match?.[1] ?? '';
}

/** Si la BD fue migrada con Supabase CLI (`db push` / `db reset`), alinear schema_migrations local. */
async function syncFromSupabaseMigrations(pool: pg.Pool, files: string[]): Promise<number> {
  try {
    const { rows } = await pool.query<{ version: string }>(
      'SELECT version FROM supabase_migrations.schema_migrations'
    );
    if (rows.length === 0) return 0;

    const remoteVersions = new Set(rows.map((r) => r.version));
    let synced = 0;

    for (const file of files) {
      const version = migrationVersionFromFile(file);
      if (!version || !remoteVersions.has(version)) continue;

      const result = await pool.query(
        'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING RETURNING filename',
        [file]
      );
      if (result.rowCount && result.rowCount > 0) {
        console.log(`  ⇄ ${file} (sincronizada desde supabase_migrations)`);
        synced += 1;
      }
    }

    return synced;
  } catch {
    return 0;
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

    await ensureSupabaseApiRoles(pool);

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

    const synced = await syncFromSupabaseMigrations(pool, files);
    if (synced > 0) {
      const { rows: refreshed } = await pool.query<{ filename: string }>(
        'SELECT filename FROM schema_migrations'
      );
      appliedSet.clear();
      for (const row of refreshed) appliedSet.add(row.filename);
    }

    let ran = 0;
    let baselined = 0;
    let skipped = 0;
    const supabaseStorageAvailable = await hasSupabaseStorage(pool);

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`  · ${file} (ya aplicada)`);
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

      if (shouldSkipSupabaseStorageMigration(file, sql, supabaseStorageAvailable)) {
        await pool.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING',
          [file]
        );
        console.log(`  ⊘ ${file} (omitida — Supabase Storage no disponible)`);
        skipped += 1;
        continue;
      }

      console.log(`→ Aplicando ${file}...`);

      const client = await pool.connect();
      try {
        if (requiresNonTransactionalApply(sql)) {
          await client.query(sql);
          await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        } else {
          await client.query('BEGIN');
          await client.query(sql);
          await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
          await client.query('COMMIT');
        }
        console.log(`  ✓ ${file}`);
        ran += 1;
      } catch (err) {
        try {
          await client.query('ROLLBACK');
        } catch {
          /* no active transaction */
        }
        throw err;
      } finally {
        client.release();
      }
    }

    if (ran === 0 && baselined === 0 && skipped === 0 && synced === 0) {
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
