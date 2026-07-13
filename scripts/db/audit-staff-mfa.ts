/**
 * Lista cuentas staff sin MFA activo (auditoría / pre-producción).
 * Uso: npm run security:audit-mfa:dev
 *      npm run security:audit-mfa:prod -- --allow-prod
 */
import 'dotenv/config';
import { query } from '../../src/db/index.ts';
import { MFA_STAFF_ROLES } from '../../src/lib/mfa.ts';
import { assertProductionExplicit } from '../lib/db-env-guard.ts';

async function main() {
  assertProductionExplicit({ scriptName: 'security:audit-mfa' });

  const { rows } = await query<{
    id: number;
    email: string;
    role: string;
    mfa_enabled: boolean;
  }>(
    `SELECT id, email, role::text AS role, mfa_enabled
     FROM users
     WHERE role::text = ANY($1::text[])
     ORDER BY role, email`,
    [MFA_STAFF_ROLES]
  );

  const withoutMfa = rows.filter((r) => !r.mfa_enabled);

  console.log('\n=== Auditoría MFA (staff) ===\n');
  console.log(`  Total staff: ${rows.length}`);
  console.log(`  Sin MFA:     ${withoutMfa.length}\n`);

  if (withoutMfa.length > 0) {
    for (const u of withoutMfa) {
      console.log(`  ⚠ ${u.role.padEnd(14)} ${u.email}`);
    }
    console.log('\n  Activa MFA en /security o exige REQUIRE_MFA_FOR_STAFF=true en prod.\n');
    process.exit(1);
  }

  console.log('  ✓ Todo el staff tiene MFA activo.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
