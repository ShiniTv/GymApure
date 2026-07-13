/**
 * Checklist operativo de respaldo (sin llamar APIs de Supabase).
 * Uso: npm run db:backup-check
 */
import fs from 'node:fs';
import path from 'node:path';

const checklist = [
  {
    id: 'supabase-dashboard',
    label: 'Backups automáticos activos en Supabase Dashboard (proyecto prod)',
    manual: true,
  },
  {
    id: 'env-prod-local',
    label: '.env.prod existe localmente para operaciones CLI de emergencia',
    check: () => fs.existsSync(path.join(process.cwd(), '.env.prod')),
  },
  {
    id: 'no-demo-prod',
    label: 'Script db:restore-demo bloqueado en producción',
    check: () => fs.existsSync(path.join(process.cwd(), 'scripts/lib/db-env-guard.ts')),
  },
  {
    id: 'rotation-doc',
    label: 'Runbook de rotación documentado',
    check: () => fs.existsSync(path.join(process.cwd(), 'docs/tecnico/ROTACION-SECRETOS.md')),
  },
  {
    id: 'rls-migrations',
    label: 'Migraciones RLS presentes en el repo',
    check: () =>
      fs.existsSync(
        path.join(process.cwd(), 'supabase/migrations/20260711100000_ensure_rls_lockdown_all_tables.sql')
      ),
  },
];

function main() {
  console.log('\n=== Verificación de preparación para backup / DR ===\n');

  let failed = 0;
  for (const item of checklist) {
    if (item.manual) {
      console.log(`  [ ] ${item.label}  ← verificar en Dashboard`);
      continue;
    }
    const ok = item.check?.() ?? false;
    console.log(`  ${ok ? '✓' : '✗'} ${item.label}`);
    if (!ok) failed++;
  }

  console.log('\n--- Prueba recomendada (manual) ---');
  console.log('  1. Supabase prod → Database → Backups → confirmar plan/retención');
  console.log('  2. Export puntual de tabla users (solo en ventana de mantenimiento)');
  console.log('  3. Restaurar export en proyecto DEV y validar npm run db:health:dev\n');

  if (failed > 0) {
    console.log(`✗ ${failed} control(es) local(es) fallaron.\n`);
    process.exit(1);
  }
  console.log('✓ Controles locales OK. Completa los ítems manuales del Dashboard.\n');
}

main();
