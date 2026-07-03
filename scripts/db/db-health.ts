/**
 * Verifica hardening de Supabase/Postgres (RLS, FK indexes, índices redundantes).
 * Uso: npm run db:health
 */
import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase')
    ? { rejectUnauthorized: false }
    : undefined,
});

type Check = { name: string; ok: boolean; detail: string };

const checks: Check[] = [];

async function q<T extends pg.QueryResultRow>(sql: string, params?: unknown[]) {
  const { rows } = await pool.query<T>(sql, params);
  return rows;
}

try {
  const noRls = await q<{ count: string }>(`
    SELECT COUNT(*)::text AS count
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity
  `);
  checks.push({
    name: 'RLS en tablas public',
    ok: parseInt(noRls[0].count, 10) === 0,
    detail: noRls[0].count === '0' ? 'todas con RLS' : `${noRls[0].count} sin RLS`,
  });

  const noPolicy = await q<{ count: string }>(`
    SELECT COUNT(*)::text AS count
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity
      AND NOT EXISTS (
        SELECT 1 FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = c.relname
      )
  `);
  checks.push({
    name: 'Políticas RLS definidas',
    ok: parseInt(noPolicy[0].count, 10) === 0,
    detail: noPolicy[0].count === '0' ? 'todas con policy' : `${noPolicy[0].count} sin policy`,
  });

  const unindexedFk = await q<{ count: string }>(`
    SELECT COUNT(*)::text AS count
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
    WHERE c.contype = 'f' AND c.connamespace = 'public'::regnamespace
      AND NOT EXISTS (
        SELECT 1 FROM pg_index i
        WHERE i.indrelid = c.conrelid AND a.attnum = ANY (i.indkey) AND i.indisvalid
      )
  `);
  checks.push({
    name: 'FK indexadas',
    ok: parseInt(unindexedFk[0].count, 10) === 0,
    detail: unindexedFk[0].count === '0' ? 'ninguna FK huérfana' : `${unindexedFk[0].count} sin índice`,
  });

  const redundant = await q<{ exists: boolean }>(`
    SELECT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public' AND indexname = 'idx_subscriptions_user_id'
    ) AS exists
  `);
  checks.push({
    name: 'Sin índice redundante subscriptions',
    ok: !redundant[0].exists,
    detail: redundant[0].exists ? 'idx_subscriptions_user_id aún existe' : 'ok',
  });

  const grants = await q<{ count: string }>(`
    SELECT COUNT(*)::text AS count
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated')
  `);
  checks.push({
    name: 'API pública bloqueada',
    ok: parseInt(grants[0].count, 10) === 0,
    detail: grants[0].count === '0' ? 'sin grants anon/authenticated' : `${grants[0].count} grants`,
  });
} finally {
  await pool.end();
}

let failed = 0;
for (const c of checks) {
  const icon = c.ok ? '✓' : '✗';
  console.log(`${icon} ${c.name} — ${c.detail}`);
  if (!c.ok) failed += 1;
}

console.log(failed === 0 ? '\nDB health: OK' : `\nDB health: ${failed} problema(s)`);
process.exit(failed === 0 ? 0 : 1);
