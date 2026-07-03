/**
 * Verifica que el reset local no toque producción:
 * - .env / .env.dev no deben usar el ref de prod
 * - db:reset-data debe poder ejecutarse sin --allow-prod
 */
import { config } from 'dotenv';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { PROD_REF } from '../lib/supabase-refs.ts';

const RENDER_HEALTH = 'https://caribean-gym.onrender.com/api/health';

function loadEnvFile(file: string): void {
  if (fs.existsSync(file)) config({ path: path.resolve(file), override: true });
}

async function countUsers(connectionString: string): Promise<number> {
  const pool = new pg.Pool({
    connectionString,
    max: 1,
    ssl: connectionString.includes('supabase') ? { rejectUnauthorized: false } : undefined,
  });
  try {
    const { rows } = await pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM users');
    return parseInt(rows[0]?.count ?? '0', 10);
  } finally {
    await pool.end();
  }
}

async function main() {
  if (!fs.existsSync('.env.dev')) {
    console.error('✗ Falta .env.dev — ejecuta primero npm run db:setup:dev');
    process.exit(1);
  }

  loadEnvFile('.env.dev');
  const devUrl = process.env.DATABASE_URL?.trim();
  if (!devUrl || devUrl.includes(PROD_REF)) {
    console.error('✗ .env.dev inválido o apunta a producción');
    process.exit(1);
  }

  loadEnvFile('.env.prod');
  const prodUrl = process.env.DATABASE_URL?.trim();
  if (!prodUrl?.includes(PROD_REF)) {
    console.error('✗ .env.prod no contiene el ref de producción esperado');
    process.exit(1);
  }

  console.log('Conteo usuarios en prod (antes)…');
  const prodUsersBefore = await countUsers(prodUrl);
  console.log(`  prod users: ${prodUsersBefore}`);

  console.log('\nEjecutando reset contra .env.dev (sin --allow-prod)…');
  const reset = spawnSync(
    process.execPath,
    [
      '--import',
      'tsx',
      'scripts/dev/run-with-env.ts',
      '.env.dev',
      'scripts/db/reset-database-data.ts',
      '--yes',
    ],
    { stdio: 'inherit', env: { ...process.env, DATABASE_URL: devUrl } }
  );
  if ((reset.status ?? 1) !== 0) {
    console.error('\n✗ Reset dev falló');
    process.exit(1);
  }

  const prodUsersAfter = await countUsers(prodUrl);
  console.log(`\nConteo usuarios en prod (después): ${prodUsersAfter}`);

  if (prodUsersBefore !== prodUsersAfter) {
    console.error('\n✗ AISLAMIENTO ROTO: el reset local cambió la base de producción');
    process.exit(1);
  }

  const health = await fetch(RENDER_HEALTH);
  const healthJson = (await health.json()) as { status?: string; db?: string };
  console.log(`Render /api/health: ${healthJson.status ?? 'unknown'}, db: ${healthJson.db ?? '?'}`);

  console.log('\nPASS: reset dev no afectó producción.\n');
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
