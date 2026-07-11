/**
 * Auditoría completa: tablas + storage + comparativa dev/prod.
 * Uso:
 *   npm run db:audit              # entorno activo (.env)
 *   npm run db:audit:compare      # dev vs prod (requiere .env.dev y .env.prod)
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { config } from 'dotenv';

function runScript(envFile: string | null, script: string, label: string): number {
  if (envFile && !fs.existsSync(path.resolve(envFile))) {
    console.error(`\n✗ No existe ${envFile} — omitiendo ${label}`);
    return 1;
  }

  const env = { ...process.env, AUDIT_ENV_LABEL: label };
  if (envFile) {
    config({ path: path.resolve('.env') });
    config({ path: path.resolve(envFile), override: true });
    Object.assign(env, process.env, { AUDIT_ENV_LABEL: label });
  }

  console.log(`\n${'='.repeat(60)}\n  ${label}\n${'='.repeat(60)}`);
  const result = spawnSync(process.execPath, ['--import', 'tsx', script], {
    stdio: 'inherit',
    env,
    cwd: process.cwd(),
  });
  return result.status ?? 1;
}

const mode = process.argv[2] ?? 'single';
const tablesScript = path.resolve('scripts/db/audit-table-usage.ts');
const storageScript = path.resolve('scripts/db/audit-storage-integrity.ts');
const healthScript = path.resolve('scripts/db/db-health.ts');

let failed = 0;

if (mode === 'compare') {
  for (const envFile of ['.env.dev', '.env.prod']) {
    failed += runScript(envFile, healthScript, `db:health (${envFile})`);
    failed += runScript(envFile, tablesScript, `audit-table-usage (${envFile})`);
    failed += runScript(envFile, storageScript, `audit-storage-integrity (${envFile})`);
  }
} else {
  failed += runScript(null, healthScript, 'db:health');
  failed += runScript(null, tablesScript, 'audit-table-usage');
  const hasStorage =
    Boolean(process.env.SUPABASE_URL) && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (hasStorage) {
    failed += runScript(null, storageScript, 'audit-storage-integrity');
  } else {
    console.log('\n→ Storage audit omitida (sin SUPABASE_SERVICE_ROLE_KEY)');
  }
}

console.log(
  failed === 0
    ? '\n=== Auditoría completa: OK ==='
    : `\n=== Auditoría completa: ${failed} paso(s) con problemas ===`
);
process.exit(failed === 0 ? 0 : 1);
