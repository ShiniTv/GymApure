/**
 * Inventario de tablas: tamaño, filas, índices no usados, integridad y config legacy.
 * Uso: npm run db:audit:tables
 *      npm run db:audit:tables:dev
 *      npm run db:audit:tables:prod
 */
import 'dotenv/config';
import {
  ACTIVE_GYM_SETTINGS_KEYS,
  LEGACY_GYM_SETTINGS_KEYS,
  createAuditPool,
  getPendingMigrations,
  listMigrationFiles,
  maskDatabaseUrl,
  runIntegrityChecks,
} from './audit-lib.ts';

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error('Falta DATABASE_URL');
  process.exit(1);
}

const dbUrl: string = databaseUrl;

const envLabel = process.env.AUDIT_ENV_LABEL ?? 'default';
const pool = createAuditPool(dbUrl);

async function main() {
  console.log(`\n=== Auditoría de tablas (${envLabel}) ===`);
  console.log(`DB: ${maskDatabaseUrl(dbUrl)}\n`);

  const migrationFiles = listMigrationFiles();
  const pending = await getPendingMigrations(pool);
  const { rows: applied } = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM schema_migrations`
  );
  const appliedCount = parseInt(applied[0]?.count ?? '0', 10);

  console.log('--- Migraciones ---');
  console.log(`Archivos en repo: ${migrationFiles.length}`);
  console.log(`Aplicadas en BD:  ${appliedCount}`);
  console.log(`Pendientes:       ${pending.length}`);
  if (pending.length > 0) {
    pending.forEach((f) => console.log(`  ✗ ${f}`));
  } else {
    console.log('  ✓ Todas aplicadas');
  }

  const usesPooler = dbUrl.includes(':6543/');
  console.log('\n--- Conexión ---');
  console.log(`${usesPooler ? '✓' : '✗'} Pooler Supabase (puerto 6543): ${usesPooler ? 'sí' : 'no'}`);

  const latencyStart = process.hrtime.bigint();
  await pool.query('SELECT 1');
  const latencyMs = Number(process.hrtime.bigint() - latencyStart) / 1_000_000;
  console.log(`Latencia SELECT 1: ${latencyMs.toFixed(2)} ms`);

  console.log('\n--- Tamaño por tabla (top 15) ---');
  const { rows: sizes } = await pool.query<{ relname: string; total: string }>(`
    SELECT c.relname, pg_size_pretty(pg_total_relation_size(c.oid)) AS total
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY pg_total_relation_size(c.oid) DESC
    LIMIT 15
  `);
  for (const row of sizes) {
    console.log(`  ${row.relname.padEnd(32)} ${row.total}`);
  }

  console.log('\n--- Filas por tabla (top 15) ---');
  const { rows: counts } = await pool.query<{
    relname: string;
    n_live_tup: string;
    n_dead_tup: string;
  }>(`
    SELECT relname, n_live_tup::text, n_dead_tup::text
    FROM pg_stat_user_tables
    ORDER BY n_live_tup DESC
    LIMIT 15
  `);
  for (const row of counts) {
    console.log(
      `  ${row.relname.padEnd(32)} live=${row.n_live_tup.padStart(8)} dead=${row.n_dead_tup}`
    );
  }

  console.log('\n--- Índices sin uso (idx_scan = 0) ---');
  const { rows: unusedIndexes } = await pool.query<{
    indexrelname: string;
    idx_scan: string;
    size: string;
  }>(`
    SELECT indexrelname, idx_scan::text, pg_size_pretty(pg_relation_size(indexrelid)) AS size
    FROM pg_stat_user_indexes
    WHERE idx_scan = 0 AND schemaname = 'public'
    ORDER BY pg_relation_size(indexrelid) DESC
    LIMIT 20
  `);
  if (unusedIndexes.length === 0) {
    console.log('  (ninguno o stats recientes)');
  } else {
    for (const row of unusedIndexes) {
      console.log(`  ${row.indexrelname.padEnd(40)} scans=${row.idx_scan} size=${row.size}`);
    }
  }

  console.log('\n--- Integridad referencial ---');
  const integrity = await runIntegrityChecks(pool);
  let integrityFailed = 0;
  for (const check of integrity) {
    const icon = check.ok ? '✓' : '✗';
    console.log(`  ${icon} ${check.name}: ${check.count}`);
    if (!check.ok) integrityFailed += 1;
  }

  console.log('\n--- gym_settings ---');
  const { rows: legacySettings } = await pool.query<{ key: string; value: string }>(
    `SELECT key, value FROM gym_settings WHERE key = ANY($1::text[]) ORDER BY key`,
    [LEGACY_GYM_SETTINGS_KEYS]
  );
  console.log(`Keys legacy (sin uso en código): ${legacySettings.length}`);
  for (const row of legacySettings) {
    console.log(`  ${row.key} = ${row.value}`);
  }

  const { rows: activeSettings } = await pool.query<{ key: string }>(
    `SELECT key FROM gym_settings WHERE key = ANY($1::text[]) ORDER BY key`,
    [ACTIVE_GYM_SETTINGS_KEYS]
  );
  console.log(`Keys activas presentes: ${activeSettings.map((r) => r.key).join(', ') || '(ninguna)'}`);

  const { rows: systemExercisesNoVideo } = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM exercises WHERE is_system = true AND video_url IS NULL`
  );
  console.log(`\nEjercicios system sin video: ${systemExercisesNoVideo[0]?.count ?? '0'}`);

  const failed = pending.length + (usesPooler ? 0 : 0) + integrityFailed;
  console.log(
    failed === 0
      ? '\nAuditoría de tablas: OK'
      : `\nAuditoría de tablas: ${failed} problema(s) detectado(s)`
  );
  process.exit(failed === 0 ? 0 : 1);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => pool.end());
