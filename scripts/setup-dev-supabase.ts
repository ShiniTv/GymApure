/**
 * Inicializa el proyecto Supabase de desarrollo: valida .env.dev, migra y verifica salud.
 * Uso: npm run db:setup:dev
 */
import { config } from 'dotenv';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const PROD_REF = 'ffjwvlcwhyskddqqojnp';
const DEV_ENV = path.resolve('.env.dev');

if (!fs.existsSync(DEV_ENV)) {
  console.error(`\n✗ Falta ${DEV_ENV}`);
  console.error('  1. Copia .env.dev.example → .env.dev');
  console.error('  2. Crea un proyecto en https://supabase.com/dashboard/new');
  console.error('  3. Pega DATABASE_URL y SUPABASE_SERVICE_ROLE_KEY de dev\n');
  process.exit(1);
}

config({ path: DEV_ENV, override: true });

const databaseUrl = process.env.DATABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!databaseUrl || databaseUrl.includes('[DEV_REF]') || databaseUrl.includes('CHANGEME')) {
  console.error('\n✗ DATABASE_URL en .env.dev no está configurada.\n');
  process.exit(1);
}

if (!serviceKey || serviceKey.includes('CHANGEME')) {
  console.error('\n✗ SUPABASE_SERVICE_ROLE_KEY en .env.dev no está configurada.\n');
  process.exit(1);
}

if (databaseUrl.includes(PROD_REF)) {
  console.error(`\n✗ .env.dev apunta al proyecto de producción (${PROD_REF}).`);
  console.error('  Usa un proyecto Supabase distinto para desarrollo.\n');
  process.exit(1);
}

console.log('\n✓ .env.dev válido (proyecto distinto de producción)\n');

function run(label: string, script: string): void {
  console.log(`── ${label} ──`);
  const result = spawnSync(process.execPath, ['--import', 'tsx', script], {
    stdio: 'inherit',
    env: process.env,
  });
  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
  console.log('');
}

run('Migraciones', 'scripts/apply-migrations.ts');
run('DB health', 'scripts/db-health.ts');

const activate = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/activate-dev-env.ts'], {
  stdio: 'inherit',
  env: process.env,
});
if ((activate.status ?? 1) !== 0) process.exit(activate.status ?? 1);

console.log('Listo. npm run dev usa .env.dev; producción sigue en .env.prod / Render.\n');
