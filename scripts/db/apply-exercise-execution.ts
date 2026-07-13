/**
 * Aplica guías de ejecución desde system-exercise-execution.json a exercises.execution.
 *
 * Uso:
 *   npx tsx scripts/db/apply-exercise-execution.ts
 *   npx tsx scripts/db/apply-exercise-execution.ts --dry-run
 *   npx tsx scripts/db/apply-exercise-execution.ts --generate-migration
 *   npx tsx scripts/db/apply-exercise-execution.ts --update-csv
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { readFileSync } from 'node:fs';
import { query } from '../../src/db/index.ts';

const JSON_PATH = path.join(process.cwd(), 'scripts/db/data/system-exercise-execution.json');
const CSV_PATH = path.join(process.cwd(), 'scripts/db/data/system-exercises.csv');
const MIGRATION_PATH = path.join(
  process.cwd(),
  'supabase/migrations/20260707110000_exercise_execution_guides.sql'
);

function parseArgs(argv: string[]) {
  return {
    dryRun: argv.includes('--dry-run'),
    generateMigration: argv.includes('--generate-migration'),
    updateCsv: argv.includes('--update-csv'),
  };
}

function loadExecutionMap(): Record<string, string[]> {
  const raw = readFileSync(JSON_PATH, 'utf8');
  const data = JSON.parse(raw) as Record<string, string[]>;
  return data;
}

function stepsToDbText(steps: string[]): string {
  return steps.join('\n');
}

function stepsToCsvText(steps: string[]): string {
  return steps.join('|');
}

function sqlEscapeLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

function generateMigrationSql(map: Record<string, string[]>): string {
  const lines = [
    '-- Guías de ejecución para ejercicios del sistema (idempotente)',
    '',
  ];

  for (const [name, steps] of Object.entries(map)) {
    const execution = stepsToDbText(steps);
    lines.push(
      `UPDATE exercises SET execution = '${sqlEscapeLiteral(execution)}' WHERE name = '${sqlEscapeLiteral(name)}' AND is_system = true;`
    );
  }

  lines.push('');
  return lines.join('\n');
}

function updateCsv(map: Record<string, string[]>): number {
  const content = readFileSync(CSV_PATH, 'utf8');
  const lines = content.split(/\r?\n/);
  let updated = 0;

  const newLines = lines.map((line) => {
    if (!line.trim() || line.startsWith('#') || line.startsWith('filename,')) {
      return line;
    }
    const cols = line.split(',');
    if (cols.length < 5) return line;
    const name = cols[1]?.trim();
    const steps = name ? map[name] : undefined;
    if (!steps) return line;
    cols[4] = stepsToCsvText(steps);
    updated++;
    return cols.join(',');
  });

  fs.writeFileSync(CSV_PATH, newLines.join('\n'), 'utf8');
  return updated;
}

async function applyToDatabase(
  map: Record<string, string[]>,
  dryRun: boolean
): Promise<{ updated: number; missing: string[] }> {
  let updated = 0;
  const missing: string[] = [];

  for (const [name, steps] of Object.entries(map)) {
    const execution = stepsToDbText(steps);
    if (dryRun) {
      const { rows } = await query<{ id: number }>(
        `SELECT id FROM exercises WHERE name = $1 AND is_system = true LIMIT 1`,
        [name]
      );
      if (rows[0]) updated++;
      else missing.push(name);
      continue;
    }

    const { rowCount } = await query(
      `UPDATE exercises SET execution = $1 WHERE name = $2 AND is_system = true`,
      [execution, name]
    );
    if ((rowCount ?? 0) > 0) updated++;
    else missing.push(name);
  }

  return { updated, missing };
}

async function main() {
  const args = parseArgs(process.argv);

  if (!fs.existsSync(JSON_PATH)) {
    console.error(`JSON no encontrado: ${JSON_PATH}`);
    process.exit(1);
  }

  const map = loadExecutionMap();
  const count = Object.keys(map).length;
  console.log(`Cargados ${count} ejercicios desde ${JSON_PATH}`);

  if (args.generateMigration) {
    const sql = generateMigrationSql(map);
    fs.writeFileSync(MIGRATION_PATH, sql, 'utf8');
    console.log(`Migración generada: ${MIGRATION_PATH} (${count} UPDATE)`);
  }

  if (args.updateCsv) {
    const csvUpdated = updateCsv(map);
    console.log(`CSV actualizado: ${csvUpdated} filas en ${CSV_PATH}`);
  }

  const { updated, missing } = await applyToDatabase(map, args.dryRun);
  const mode = args.dryRun ? ' (dry-run)' : '';
  console.log(`Base de datos${mode}: ${updated} actualizaciones`);
  if (missing.length > 0) {
    console.warn(`Sin coincidencia en DB (${missing.length}):`);
    missing.forEach((name) => console.warn(`  - ${name}`));
  }

  if (missing.length > 0 && !args.dryRun) process.exit(1);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
