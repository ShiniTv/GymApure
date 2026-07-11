/**
 * Inventario de tablas, integridad y datos legacy.
 * Uso:
 *   npm run db:audit-tables
 *   npm run db:audit-tables:dev
 *   npm run db:audit-tables:prod
 */
import 'dotenv/config';
import {
  auditQuery,
  createAuditPool,
  INTEGRITY_CHECKS,
  LEGACY_GYM_SETTINGS_KEYS,
  listMigrationFiles,
  loadConnectionString,
  maskDatabaseUrl,
  printChecks,
  resolveEnvLabel,
  type AuditCheck,
} from './audit-shared.ts';

const label = resolveEnvLabel(process.argv.slice(2));
const databaseUrl = loadConnectionString(label);
const pool = createAuditPool(databaseUrl);

const checks: AuditCheck[] = [];

try {
  console.log(`Entorno: ${label}`);
  console.log(`DB: ${maskDatabaseUrl(databaseUrl)}`);

  const latencyStart = process.hrtime.bigint();
  await auditQuery(pool, 'SELECT 1');
  const latencyMs = Number(process.hrtime.bigint() - latencyStart) / 1_000_000;
  checks.push({
    name: 'Conectividad',
    ok: true,
    detail: `SELECT 1 en ${latencyMs.toFixed(1)}ms`,
  });

  const usesPooler = databaseUrl.includes(':6543/');
  checks.push({
    name: 'Pooler Supabase (6543)',
    ok: !databaseUrl.includes('supabase') || usesPooler,
    detail: usesPooler ? 'puerto 6543' : 'sin pooler — riesgo de agotar conexiones',
  });

  const migrationFiles = listMigrationFiles();
  const applied = await auditQuery<{ filename: string }>(
    pool,
    `SELECT filename FROM schema_migrations ORDER BY filename`
  );
  const appliedSet = new Set(applied.map((r) => r.filename));
  const pending = migrationFiles.filter((f) => !appliedSet.has(f));
  checks.push({
    name: 'Migraciones aplicadas',
    ok: pending.length === 0,
    detail:
      pending.length === 0
        ? `${applied.length}/${migrationFiles.length} al día`
        : `${pending.length} pendientes: ${pending.slice(0, 3).join(', ')}${pending.length > 3 ? '…' : ''}`,
    value: pending.length,
  });

  for (const integrity of INTEGRITY_CHECKS) {
    const rows = await auditQuery<{ count: string }>(pool, integrity.sql);
    const count = parseInt(rows[0]?.count ?? '0', 10);
    checks.push({
      name: integrity.name,
      ok: count === 0,
      detail: count === 0 ? '0' : `${count} filas`,
      value: count,
    });
  }

  const legacySettings = await auditQuery<{ key: string; value: string }>(
    pool,
    `SELECT key, value FROM gym_settings WHERE key = ANY($1::text[])`,
    [LEGACY_GYM_SETTINGS_KEYS]
  );
  checks.push({
    name: 'gym_settings legacy',
    ok: legacySettings.length === 0,
    detail:
      legacySettings.length === 0
        ? 'sin keys obsoletas'
        : `${legacySettings.length} keys sin uso en código`,
    value: legacySettings.length,
  });

  const systemExercisesNoVideo = await auditQuery<{ count: string }>(
    pool,
    `SELECT COUNT(*)::text AS count FROM exercises WHERE is_system = true AND video_url IS NULL`
  );
  const noVideoCount = parseInt(systemExercisesNoVideo[0]?.count ?? '0', 10);
  checks.push({
    name: 'Ejercicios system sin video',
    ok: noVideoCount === 0,
    detail: `${noVideoCount} sin video_url`,
    value: noVideoCount,
  });

  const readNotifications = await auditQuery<{
    count: string;
    min_created: string | null;
    max_created: string | null;
  }>(
    pool,
    `SELECT COUNT(*)::text AS count, MIN(created_at)::text AS min_created, MAX(created_at)::text AS max_created
     FROM user_notifications WHERE read_at IS NOT NULL`
  );
  const readCount = parseInt(readNotifications[0]?.count ?? '0', 10);
  checks.push({
    name: 'Notificaciones leídas acumuladas',
    ok: readCount < 10_000,
    detail: `${readCount} leídas (${readNotifications[0]?.min_created ?? '—'} → ${readNotifications[0]?.max_created ?? '—'})`,
    value: readCount,
  });

  console.log('\n--- Tamaño por tabla (top 15) ---');
  const sizes = await auditQuery<{ relname: string; total: string }>(
    pool,
    `SELECT c.relname, pg_size_pretty(pg_total_relation_size(c.oid)) AS total
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind = 'r'
     ORDER BY pg_total_relation_size(c.oid) DESC
     LIMIT 15`
  );
  for (const row of sizes) {
    console.log(`  ${row.relname.padEnd(32)} ${row.total}`);
  }

  console.log('\n--- Filas por tabla (top 15) ---');
  const rowCounts = await auditQuery<{
    relname: string;
    n_live_tup: string;
    n_dead_tup: string;
  }>(
    pool,
    `SELECT relname, n_live_tup::text, n_dead_tup::text
     FROM pg_stat_user_tables
     WHERE schemaname = 'public'
     ORDER BY n_live_tup DESC
     LIMIT 15`
  );
  for (const row of rowCounts) {
    console.log(
      `  ${row.relname.padEnd(32)} live=${row.n_live_tup.padStart(8)} dead=${row.n_dead_tup}`
    );
  }

  const unusedIndexes = await auditQuery<{
    indexrelname: string;
    idx_scan: string;
    size: string;
  }>(
    pool,
    `SELECT indexrelname, idx_scan::text, pg_size_pretty(pg_relation_size(indexrelid)) AS size
     FROM pg_stat_user_indexes
     WHERE schemaname = 'public' AND idx_scan = 0
     ORDER BY pg_relation_size(indexrelid) DESC
     LIMIT 10`
  );
  if (unusedIndexes.length > 0) {
    console.log('\n--- Índices sin uso (muestra) ---');
    for (const row of unusedIndexes) {
      console.log(`  ${row.indexrelname.padEnd(40)} ${row.size}`);
    }
  }
} finally {
  await pool.end();
}

const failed = printChecks(`Auditoría tablas (${label})`, checks);
process.exit(failed === 0 ? 0 : 1);
