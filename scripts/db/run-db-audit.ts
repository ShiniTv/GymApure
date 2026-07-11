/**
 * Ejecuta auditoría completa (tablas + storage) en dev y/o prod y genera reporte comparativo.
 * Uso:
 *   npm run db:audit           # entorno activo (.env)
 *   npm run db:audit:both        # dev + prod si existen los archivos
 */
import { spawnSync } from 'node:child_process';
import fs from 'fs';
import path from 'path';

type EnvResult = {
  label: string;
  tablesExit: number;
  storageExit: number;
};

function runScript(script: string, flag: string): number {
  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', path.resolve(script), flag],
    { stdio: 'inherit', env: process.env }
  );
  return result.status ?? 1;
}

function runForEnv(label: string, flag: string): EnvResult {
  console.log(`\n${'='.repeat(60)}\n  AUDITORÍA: ${label.toUpperCase()}\n${'='.repeat(60)}`);
  const tablesExit = runScript('scripts/db/audit-table-usage.ts', flag);
  let storageExit = 1;
  try {
    storageExit = runScript('scripts/db/audit-storage-integrity.ts', flag);
  } catch {
    storageExit = 1;
  }
  return { label, tablesExit, storageExit };
}

const both = process.argv.includes('--both');
const results: EnvResult[] = [];

if (both) {
  if (fs.existsSync('.env.dev')) {
    results.push(runForEnv('dev', '--dev'));
  } else {
    console.warn('⚠ .env.dev no encontrado — omitiendo dev');
  }
  if (fs.existsSync('.env.prod')) {
    results.push(runForEnv('prod', '--prod'));
  } else {
    console.warn('⚠ .env.prod no encontrado — omitiendo prod');
  }
} else if (process.argv.includes('--dev')) {
  results.push(runForEnv('dev', '--dev'));
} else if (process.argv.includes('--prod')) {
  results.push(runForEnv('prod', '--prod'));
} else {
  results.push(runForEnv('active', ''));
}

console.log(`\n${'='.repeat(60)}\n  RESUMEN COMPARATIVO\n${'='.repeat(60)}`);
for (const r of results) {
  const tablesOk = r.tablesExit === 0 ? 'OK' : 'FALLÓ';
  const storageOk = r.storageExit === 0 ? 'OK' : 'FALLÓ';
  console.log(`  ${r.label.padEnd(8)} tablas=${tablesOk.padEnd(6)} storage=${storageOk}`);
}

const anyFailed = results.some((r) => r.tablesExit !== 0 || r.storageExit !== 0);
process.exit(anyFailed ? 1 : 0);
