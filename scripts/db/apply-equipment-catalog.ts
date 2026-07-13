import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { readFileSync } from 'node:fs';
import { query } from '../../src/db/index.ts';

const JSON_PATH = path.join(process.cwd(), 'scripts/db/data/system-equipment-catalog.json');
const MIGRATION_PATH = path.join(
  process.cwd(),
  'supabase/migrations/20260708120100_equipment_catalog_seed.sql'
);

function sqlEscape(value: string): string {
  return value.replace(/'/g, "''");
}

function generateMigrationSql(
  items: { name: string; category: string; description: string; typical_brands?: string }[]
): string {
  const lines = ['-- Catálogo de equipamiento del sistema (idempotente)', ''];
  for (const item of items) {
    const brands = item.typical_brands ? `'${sqlEscape(item.typical_brands)}'` : 'NULL';
    lines.push(
      `INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
SELECT '${sqlEscape(item.name)}', '${item.category}'::equipment_category, '${sqlEscape(item.description)}', ${brands}, true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER('${sqlEscape(item.name)}') AND is_system = true
);`
    );
  }
  lines.push('');
  return lines.join('\n');
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const generateMigration = process.argv.includes('--generate-migration');

  const items = JSON.parse(readFileSync(JSON_PATH, 'utf8')) as {
    name: string;
    category: string;
    description: string;
    typical_brands?: string;
  }[];

  if (generateMigration) {
    fs.writeFileSync(MIGRATION_PATH, generateMigrationSql(items), 'utf8');
    console.log(`Migración generada: ${MIGRATION_PATH} (${items.length} items)`);
  }

  let updated = 0;
  for (const item of items) {
    if (dryRun) {
      const { rows } = await query<{ id: number }>(
        `SELECT id FROM equipment_catalog WHERE LOWER(name) = LOWER($1) AND is_system = true LIMIT 1`,
        [item.name]
      );
      if (!rows[0]) updated++;
      continue;
    }
    const { rowCount } = await query(
      `INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
       SELECT $1, $2::equipment_category, $3, $4, true
       WHERE NOT EXISTS (
         SELECT 1 FROM equipment_catalog WHERE LOWER(name) = LOWER($1) AND is_system = true
       )`,
      [item.name, item.category, item.description, item.typical_brands ?? null]
    );
    if ((rowCount ?? 0) > 0) updated++;
  }

  console.log(`Catálogo${dryRun ? ' (dry-run)' : ''}: ${updated} nuevos de ${items.length}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
