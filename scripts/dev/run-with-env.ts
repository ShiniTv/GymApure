/**
 * Ejecuta un script npm/tsx cargando variables desde un archivo .env concreto.
 * Uso: tsx scripts/dev/run-with-env.ts .env.dev scripts/db/apply-migrations.ts
 */
import { config } from 'dotenv';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const envFile = process.argv[2];
const scriptPath = process.argv[3];
const scriptArgs = process.argv.slice(4);

if (!envFile || !scriptPath) {
  console.error('Uso: tsx scripts/dev/run-with-env.ts <.env.dev|.env.prod> <script.ts> [args...]');
  process.exit(1);
}

const resolvedEnv = path.resolve(envFile);
if (!fs.existsSync(resolvedEnv)) {
  console.error(`No existe ${resolvedEnv}`);
  process.exit(1);
}

config({ path: path.resolve('.env') });
config({ path: resolvedEnv, override: true });

const resolvedScript = path.resolve(scriptPath);
if (!fs.existsSync(resolvedScript)) {
  console.error(`No existe ${resolvedScript}`);
  process.exit(1);
}

console.log(`→ ${path.basename(resolvedEnv)} + ${path.basename(resolvedScript)}\n`);

const result = spawnSync(process.execPath, ['--import', 'tsx', resolvedScript, ...scriptArgs], {
  stdio: 'inherit',
  env: process.env,
  shell: false,
});

process.exit(result.status ?? 1);
