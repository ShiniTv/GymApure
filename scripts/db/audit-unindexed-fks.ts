/**
 * Lista FK sin índice en public (para migraciones de rendimiento).
 * Uso: npm run db:audit-fks:dev
 */
import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase')
    ? { rejectUnauthorized: false }
    : undefined,
});

const SQL = `
  SELECT c.conname, t.relname AS table_name, a.attname AS column_name
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
  WHERE c.contype = 'f' AND c.connamespace = 'public'::regnamespace
    AND NOT EXISTS (
      SELECT 1 FROM pg_index i
      WHERE i.indrelid = c.conrelid AND a.attnum = ANY (i.indkey) AND i.indisvalid
    )
  ORDER BY t.relname, a.attname
`;

async function main() {
  const { rows } = await pool.query<{
    conname: string;
    table_name: string;
    column_name: string;
  }>(SQL);

  console.log('\n=== FK sin índice ===\n');
  if (rows.length === 0) {
    console.log('  ✓ Ninguna\n');
    await pool.end();
    return;
  }

  for (const row of rows) {
    const idx = `idx_${row.table_name}_${row.column_name}`;
    console.log(`  ${row.table_name}.${row.column_name} (${row.conname})`);
    console.log(`    CREATE INDEX IF NOT EXISTS ${idx} ON ${row.table_name} (${row.column_name});`);
  }
  console.log('');
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
