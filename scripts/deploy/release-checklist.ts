/**
 * Checklist de release: staging (si existe) → migrate prod.
 *
 * Uso:
 *   npm run deploy:release              # solo imprime pasos
 *   npm run deploy:release -- --run     # ejecuta staging migrate+smoke si .env.staging listo
 *   npm run deploy:release -- --migrate-prod  # además aplica migraciones prod (requiere .env.prod)
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const run = process.argv.includes('--run');
const migrateProd = process.argv.includes('--migrate-prod');

function hasStagingEnv(): boolean {
  const p = path.join(root, '.env.staging');
  if (!fs.existsSync(p)) return false;
  const raw = fs.readFileSync(p, 'utf8');
  return !raw.includes('CHANGEME_STAGING_REF') && !raw.includes('CHANGEME_STAGING_SERVICE');
}

function npmRun(script: string): boolean {
  console.log(`\n→ npm run ${script}`);
  const result = spawnSync('npm', ['run', script], {
    cwd: root,
    stdio: 'inherit',
    shell: true,
  });
  return result.status === 0;
}

function main() {
  console.log('\n=== GymApure release checklist ===\n');
  console.log('1. Preflight prod (secretos / Redis / avisos SSL·Sentry·SMTP)');
  console.log('2. Migrar + smoke en staging (si .env.staging está completo)');
  console.log('3. Migrar producción: npm run db:migrate:prod');
  console.log('4. Deploy Render (main) + health check\n');

  if (!run && !migrateProd) {
    console.log('Modo dry-run. Para ejecutar staging: npm run deploy:release -- --run');
    console.log('Para migrar prod tras staging OK: npm run deploy:release -- --run --migrate-prod\n');
    console.log('Ver docs/tecnico/STAGING.md y docs/DEPLOY.md\n');
    return;
  }

  if (!npmRun('deploy:preflight:prod')) {
    console.error('\n✗ Preflight falló. Abortando.');
    process.exit(1);
  }

  if (hasStagingEnv()) {
    if (!npmRun('db:migrate:staging')) {
      console.error('\n✗ Migración staging falló.');
      process.exit(1);
    }
    if (!npmRun('db:health:staging')) {
      console.error('\n✗ Health staging falló.');
      process.exit(1);
    }
    console.log(
      '\n· Smoke staging: arranca el servidor contra .env.staging y ejecuta npm run test:smoke:staging'
    );
  } else {
    console.warn(
      '\n⚠ .env.staging ausente o con CHANGEME — saltando staging. Provisiona según docs/tecnico/STAGING.md'
    );
  }

  if (migrateProd) {
    if (!npmRun('db:migrate:prod')) {
      console.error('\n✗ Migración producción falló.');
      process.exit(1);
    }
    console.log('\n✓ Migraciones prod aplicadas. Haz deploy en Render y verifica /api/health.\n');
  } else {
    console.log('\n✓ Checklist parcial OK. Cuando estés listo: npm run db:migrate:prod\n');
  }
}

main();
