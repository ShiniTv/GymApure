/**
 * Vacía todos los datos operativos (usuarios, rutinas, pagos, chat, etc.)
 * sin tocar el esquema ni schema_migrations.
 *
 * Uso:
 *   npm run db:reset-data              # pide escribir RESET
 *   npm run db:reset-data -- --yes     # sin confirmación interactiva
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
} from '../src/lib/supabaseAdmin.ts';

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error('Falta DATABASE_URL en .env');
  process.exit(1);
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
  'workout_logs',
  'workout_sessions',
  'audit_logs',
  'attendance',
  'user_measurements',
  'user_routines',
  'routine_exercises',
  'payments',
  'subscriptions',
  'routines',
  'exercises',
  'users',
  'memberships',
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

async function main() {
  const autoYes = process.argv.includes('--yes');

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

  console.log('\nListo. Siguiente paso: npm run db:create-admin\n');
}

main().catch((err) => {
  console.error('\nError:', err instanceof Error ? err.message : err);
  process.exit(1);
}).finally(async () => {
  await pool.end();
});
