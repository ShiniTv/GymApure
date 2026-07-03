/**
 * Vacía todos los datos operativos (usuarios, rutinas, pagos, chat, etc.)
 * sin tocar el esquema ni schema_migrations.
 *
 * Uso:
 *   npm run db:reset-data              # pide escribir RESET
 *   npm run db:reset-data -- --yes       # sin confirmación interactiva
 *   npm run db:reset-data -- --dev --yes # usa DEV_DATABASE_URL (desarrollo)
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import pg from 'pg';
import {
  AVATARS_BUCKET,
  PAYMENT_PROOFS_BUCKET,
  VIDEOS_BUCKET,
  getSupabaseAdmin,
  isSupabaseStorageConfigured,
} from '../../src/lib/supabaseAdmin.ts';
import { PROD_REF as PROD_SUPABASE_PROJECT_REF } from '../lib/supabase-refs.ts';

const useDevDatabase = process.argv.includes('--dev');
const databaseUrl = (
  useDevDatabase ? process.env.DEV_DATABASE_URL?.trim() : process.env.DATABASE_URL?.trim()
)?.trim();

if (!databaseUrl) {
  if (useDevDatabase) {
    console.error('Falta DEV_DATABASE_URL en .env (o quita --dev para usar DATABASE_URL).');
  } else {
    console.error('Falta DATABASE_URL en .env');
  }
  process.exit(1);
}

if (useDevDatabase) {
  console.log(`Usando base de desarrollo (${databaseUrl.includes(PROD_SUPABASE_PROJECT_REF) ? '¡mismo ref que prod!' : 'DEV_DATABASE_URL'}).`);
}

const pool = new pg.Pool({
  connectionString: databaseUrl,
  max: 1,
  connectionTimeoutMillis: 30_000,
  ssl: databaseUrl.includes('supabase') ? { rejectUnauthorized: false } : undefined,
});

async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
) {
  return pool.query<T>(text, params);
}

const DATA_TABLES = [
  'nutrition_log_entries',
  'nutrition_plans',
  'chat_messages',
  'chat_conversations',
  'chat_system_log',
  'password_reset_tokens',
  'push_subscriptions',
  'workout_logs',
  'workout_sessions',
  'audit_logs',
  'attendance',
  'user_measurements',
  'user_routines',
  'routine_exercises',
  'trainer_profiles',
  'payments',
  'subscriptions',
  'routines',
  'exercises',
  'users',
  'memberships',
] as const;

/** Conteos de verificación post-reset (tablas que deben quedar en 0). */
const VERIFY_COUNT_TABLES = [
  'users',
  'exercises',
  'routines',
  'payments',
  'attendance',
  'chat_messages',
  'password_reset_tokens',
  'push_subscriptions',
  'trainer_profiles',
] as const;

const LOCAL_UPLOAD_DIRS = [
  'uploads/avatars',
  'uploads/proofs',
  'uploads',
] as const;

const STORAGE_BUCKETS = [AVATARS_BUCKET, PAYMENT_PROOFS_BUCKET, VIDEOS_BUCKET] as const;

function askConfirm(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function tableExists(name: string): Promise<boolean> {
  const { rows } = await query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1
     ) AS exists`,
    [name]
  );
  return Boolean(rows[0]?.exists);
}

async function truncateDataTables(): Promise<void> {
  const present: string[] = [];
  for (const table of DATA_TABLES) {
    if (await tableExists(table)) present.push(table);
  }

  if (present.length === 0) {
    console.log('  · No hay tablas de datos que vaciar.');
    return;
  }

  await query(`SET statement_timeout = '120000'`);
  await query(`TRUNCATE TABLE ${present.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`);
  console.log(`  ✓ Tablas vaciadas (${present.length}): ${present.join(', ')}`);
}

async function resetGymSettings(): Promise<void> {
  if (!(await tableExists('gym_settings'))) return;

  await query(`DELETE FROM gym_settings`);
  await query(
    `INSERT INTO gym_settings (key, value, updated_at)
     VALUES ('expiry_alert_days', '7', NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`
  );
  console.log('  ✓ gym_settings restaurado (expiry_alert_days = 7)');
}

function clearLocalUploads(): void {
  for (const dir of LOCAL_UPLOAD_DIRS) {
    const full = path.join(process.cwd(), dir);
    if (!fs.existsSync(full)) continue;

    const entries = fs.readdirSync(full, { withFileTypes: true });
    let removed = 0;
    for (const entry of entries) {
      if (entry.name === '.gitkeep') continue;
      const target = path.join(full, entry.name);
      fs.rmSync(target, { recursive: true, force: true });
      removed++;
    }
    if (removed > 0) {
      console.log(`  ✓ ${dir}: ${removed} archivo(s) eliminado(s)`);
    }
  }
}

async function listAllObjects(bucket: string, prefix = ''): Promise<string[]> {
  const admin = getSupabaseAdmin();
  const keys: string[] = [];
  const limit = 100;
  let offset = 0;

  while (true) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const item of data) {
      const itemPath = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id == null) {
        const nested = await listAllObjects(bucket, itemPath);
        keys.push(...nested);
      } else {
        keys.push(itemPath);
      }
    }

    if (data.length < limit) break;
    offset += limit;
  }

  return keys;
}

async function clearSupabaseBuckets(): Promise<void> {
  if (!isSupabaseStorageConfigured()) {
    console.log('  · Supabase Storage no configurado — omitiendo buckets.');
    return;
  }

  const admin = getSupabaseAdmin();
  for (const bucket of STORAGE_BUCKETS) {
    try {
      const keys = await listAllObjects(bucket);
      if (keys.length === 0) {
        console.log(`  · ${bucket}: vacío`);
        continue;
      }

      const batchSize = 50;
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        const { error } = await admin.storage.from(bucket).remove(batch);
        if (error) throw error;
      }
      console.log(`  ✓ ${bucket}: ${keys.length} objeto(s) eliminado(s)`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`  ⚠ ${bucket}: no se pudo vaciar (${msg})`);
    }
  }
}

async function printRowCounts(): Promise<boolean> {
  console.log('\nVerificación de conteos:');
  let allZero = true;

  for (const table of VERIFY_COUNT_TABLES) {
    if (!(await tableExists(table))) continue;
    const { rows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM "${table}"`
    );
    const count = parseInt(rows[0]?.count ?? '0', 10);
    const ok = count === 0;
    if (!ok) allZero = false;
    console.log(`  ${ok ? '✓' : '✗'} ${table}: ${count}`);
  }

  const { rows: settingsRows } = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM gym_settings`
  );
  const settingsCount = parseInt(settingsRows[0]?.count ?? '0', 10);
  console.log(`  · gym_settings: ${settingsCount} fila(s) (solo defaults esperados)`);

  return allZero;
}

function assertNotProductionDatabase(): void {
  if (useDevDatabase) return;
  if (!databaseUrl!.includes(PROD_SUPABASE_PROJECT_REF)) return;
  if (process.argv.includes('--allow-prod')) return;

  console.error(
    `\n✗ DATABASE_URL apunta al proyecto Supabase de producción (${PROD_SUPABASE_PROJECT_REF}).`
  );
  console.error('  Usa un proyecto de desarrollo en .env o pasa --allow-prod si es intencional.\n');
  process.exit(1);
}

async function main() {
  const autoYes = process.argv.includes('--yes');

  assertNotProductionDatabase();

  console.log('\n⚠  RESET DE DATOS — se borrarán usuarios, rutinas, pagos, chat y archivos subidos.');
  console.log('   El esquema y las migraciones NO se tocan.\n');

  if (!autoYes) {
    const answer = await askConfirm('Escribe RESET para continuar: ');
    if (answer !== 'RESET') {
      console.log('Cancelado.');
      process.exit(0);
    }
  }

  console.log('\nVaciando base de datos…');
  await truncateDataTables();
  await resetGymSettings();

  console.log('\nLimpiando archivos locales…');
  clearLocalUploads();

  console.log('\nLimpiando Supabase Storage…');
  await clearSupabaseBuckets();

  const countsOk = await printRowCounts();
  if (!countsOk) {
    console.error('\n✗ Algunas tablas no quedaron vacías. Revisa los conteos arriba.\n');
    process.exit(1);
  }

  console.log('\nListo. Base operativa vacía. Siguiente paso: npm run db:create-admin\n');
}

main().catch((err) => {
  console.error('\nError:', err instanceof Error ? err.message : err);
  process.exit(1);
}).finally(async () => {
  await pool.end();
});
