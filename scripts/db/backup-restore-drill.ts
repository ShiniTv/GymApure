/**
 * Drill documentado de restore (PITR / backup) — no restaura prod automáticamente.
 * Uso: npm run db:backup-restore-drill
 */
import fs from 'node:fs';
import path from 'node:path';

const steps = [
  {
    id: 'backup-check',
    label: 'Controles locales de backup',
    check: () => fs.existsSync(path.join(process.cwd(), 'scripts/db/verify-backup-readiness.ts')),
  },
  {
    id: 'privacy-runbook',
    label: 'Runbook DSR / privacy presente',
    check: () => fs.existsSync(path.join(process.cwd(), 'docs/tecnico/privacy.md')),
  },
  {
    id: 'isolation',
    label: 'Script de isolation de entornos presente',
    check: () => fs.existsSync(path.join(process.cwd(), 'scripts/db/verify-env-isolation.ts')),
  },
  {
    id: 'migrate',
    label: 'Aplicador de migraciones presente',
    check: () => fs.existsSync(path.join(process.cwd(), 'scripts/db/apply-migrations.ts')),
  },
];

function main() {
  console.log('\n=== Drill de restore (documentado) ===\n');
  console.log('RPO objetivo (gym único): ≤ 24 h (plan Supabase).');
  console.log('RTO objetivo: ≤ 4 h (recrear Render + apuntar DATABASE_URL + migrate + admin).\n');

  let failed = 0;
  for (const step of steps) {
    const ok = step.check();
    console.log(`  ${ok ? '✓' : '✗'} ${step.label}`);
    if (!ok) failed++;
  }

  console.log('\n--- Procedimiento manual (registrar evidencia) ---');
  console.log('  1. npm run db:backup-check');
  console.log('  2. Supabase Dashboard prod → Backups: confirmar PITR / última copia');
  console.log('  3. Crear o usar proyecto DEV; restaurar snapshot o dump de prueba');
  console.log('  4. Apuntar .env.dev a la BD restaurada');
  console.log('  5. npm run db:verify-isolation && npm run db:health:dev');
  console.log('  6. npm run test:smoke:dev');
  console.log('  7. Anotar fecha UTC, RPO observado y responsable en OPS-VERIFY-CHECKLIST\n');

  if (failed > 0) {
    console.log(`✗ ${failed} prerrequisito(s) faltan.\n`);
    process.exit(1);
  }
  console.log('✓ Prerrequisitos OK. Completa el procedimiento manual y archiva evidencia.\n');
}

main();
