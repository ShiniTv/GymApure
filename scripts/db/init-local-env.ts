/**
 * Bootstrap de entornos locales: separa dev y prod en archivos distintos.
 * Uso: npm run env:init
 */
import fs from 'node:fs';
import path from 'node:path';
import { PROD_REF } from '../lib/supabase-refs.ts';

const ROOT = process.cwd();
const envPath = path.join(ROOT, '.env');
const envDevPath = path.join(ROOT, '.env.dev');
const envProdPath = path.join(ROOT, '.env.prod');
const envBackupPath = path.join(ROOT, '.env.backup');
const devExamplePath = path.join(ROOT, '.env.dev.example');
const prodExamplePath = path.join(ROOT, '.env.prod.example');

function readFile(file: string): string | null {
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, 'utf8');
}

function hasProdRef(content: string): boolean {
  return content.includes(PROD_REF);
}

function copyIfMissing(source: string, dest: string, label: string): boolean {
  if (fs.existsSync(dest)) {
    console.log(`  · ${label} ya existe (${path.basename(dest)})`);
    return false;
  }
  if (!fs.existsSync(source)) {
    console.error(`  ✗ Falta plantilla ${path.basename(source)}`);
    return false;
  }
  fs.copyFileSync(source, dest);
  console.log(`  ✓ Creado ${path.basename(dest)} desde ${path.basename(source)}`);
  return true;
}

function main() {
  console.log('\n=== Inicialización de entornos locales ===\n');

  const envContent = readFile(envPath);
  const envHasProd = envContent ? hasProdRef(envContent) : false;

  if (envContent && envHasProd) {
    if (!fs.existsSync(envProdPath)) {
      fs.writeFileSync(envProdPath, envContent);
      console.log('  ✓ Credenciales de producción copiadas a .env.prod');
    } else {
      console.log('  · .env.prod ya existe — no se sobrescribió');
    }
  }

  copyIfMissing(devExamplePath, envDevPath, 'Desarrollo');

  if (!fs.existsSync(prodExamplePath)) {
    console.warn('  ⚠ Falta .env.prod.example en el repo');
  } else if (!fs.existsSync(envProdPath) && !envHasProd) {
    copyIfMissing(prodExamplePath, envProdPath, 'Producción');
  }

  if (envContent) {
    if (fs.existsSync(envBackupPath)) {
      console.log('  · .env.backup ya existe — .env no se renombró');
    } else {
      fs.renameSync(envPath, envBackupPath);
      console.log('  ✓ .env renombrado a .env.backup (deprecado, no usar)');
    }
  } else {
    console.log('  · No hay .env activo (correcto)');
  }

  console.log('\n--- Próximos pasos ---\n');
  if (fs.existsSync(envDevPath)) {
    const devText = readFile(envDevPath) ?? '';
    if (devText.includes('CHANGEME')) {
      console.log('  1. npm run env:configure-dev -- <password-dev-supabase>');
    } else {
      console.log('  1. .env.dev parece configurado');
    }
    console.log('  2. npm run db:setup:dev');
    console.log('  3. npm run db:create-admin:dev');
    console.log('  4. npm run dev');
  }
  console.log('  5. npm run env:check   (verificar refs dev/prod)\n');
}

main();
