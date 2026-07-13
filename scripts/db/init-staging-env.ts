/**
 * Bootstrap .env.staging desde plantilla.
 * Uso: npm run env:init-staging
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const example = path.join(root, '.env.staging.example');
const staging = path.join(root, '.env.staging');

function main() {
  console.log('\n=== Inicialización staging ===\n');

  if (!fs.existsSync(example)) {
    console.error('✗ Falta .env.staging.example');
    process.exit(1);
  }

  if (fs.existsSync(staging)) {
    console.log('  · .env.staging ya existe — no se sobrescribió');
  } else {
    fs.copyFileSync(example, staging);
    console.log('  ✓ Creado .env.staging desde plantilla');
  }

  console.log('\n--- Próximos pasos ---');
  console.log('  1. Crea proyecto Supabase staging en Dashboard');
  console.log('  2. Completa .env.staging (ref, password, service_role, JWT)');
  console.log('  3. npm run db:migrate:staging');
  console.log('  4. npm run db:create-admin:staging');
  console.log('\nVer docs/tecnico/STAGING.md\n');
}

main();
