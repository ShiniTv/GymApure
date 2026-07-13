/**
 * Valida .env.dev y recuerda usar npm run dev (ya no escribe en .env).
 * Uso: npm run env:use-dev
 */
import { config } from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { DEV_REF, PROD_REF } from '../lib/supabase-refs.ts';

const devPath = path.resolve('.env.dev');

if (!fs.existsSync(devPath)) {
  console.error('✗ Falta .env.dev — ejecuta npm run env:init && npm run db:setup:dev');
  process.exit(1);
}

config({ path: devPath });
const devDb = process.env.DATABASE_URL?.trim();
const devKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!devDb || devDb.includes(PROD_REF) || devDb.includes('CHANGEME')) {
  console.error('✗ .env.dev no tiene DATABASE_URL de desarrollo válida');
  console.error(`  Debe usar el proyecto ${DEV_REF}`);
  process.exit(1);
}
if (!devKey || devKey.includes('CHANGEME')) {
  console.error('✗ .env.dev no tiene SUPABASE_SERVICE_ROLE_KEY válida');
  process.exit(1);
}

console.log('✓ .env.dev válido para desarrollo');
console.log(`  ref: ${devDb.match(/postgres\.([^:]+)/)?.[1] ?? '?'}`);
console.log('\n  Usa npm run dev (carga .env.dev automáticamente).');
console.log('  No uses .env — está deprecado. Ver npm run env:check.\n');
