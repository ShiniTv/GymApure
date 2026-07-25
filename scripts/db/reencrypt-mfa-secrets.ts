/**
 * Cifra secretos MFA legacy (texto plano) con MFA_ENCRYPTION_KEY.
 * Uso: npm run security:reencrypt-mfa:dev
 *      npm run security:reencrypt-mfa:prod
 */
import 'dotenv/config';
import { query, withTransaction } from '../../src/db/index.ts';
import { encryptMfaSecret } from '../../src/lib/mfaCrypto.ts';
import { assertProductionExplicit, describeDatabaseTarget } from '../lib/db-env-guard.ts';

interface LegacyMfaRow {
  id: number;
  mfa_secret: string;
}

async function main() {
  assertProductionExplicit({ scriptName: 'security:reencrypt-mfa' });

  if (!process.env.MFA_ENCRYPTION_KEY?.trim()) {
    throw new Error(
      'MFA_ENCRYPTION_KEY es obligatoria para re-encriptar; no se usará JWT_SECRET como fallback.'
    );
  }

  const target = describeDatabaseTarget();
  const { rows } = await query<LegacyMfaRow>(
    `SELECT id, mfa_secret
     FROM users
     WHERE mfa_secret IS NOT NULL
       AND mfa_secret <> ''
       AND mfa_secret NOT LIKE 'enc:v1:%'
     ORDER BY id`
  );

  console.log(`\n=== Re-encriptación MFA (${target.label}) ===`);
  console.log(`  Secretos legacy encontrados: ${rows.length}`);

  if (rows.length === 0) {
    console.log('  ✓ No hay secretos pendientes.\n');
    return;
  }

  let updated = 0;
  await withTransaction(async (client) => {
    for (const row of rows) {
      const encrypted = encryptMfaSecret(row.mfa_secret);
      const result = await client.query(
        `UPDATE users
         SET mfa_secret = $1
         WHERE id = $2 AND mfa_secret = $3`,
        [encrypted, row.id, row.mfa_secret]
      );
      updated += result.rowCount ?? 0;
    }
  });

  console.log(`  ✓ Secretos re-encriptados: ${updated}`);
  if (updated !== rows.length) {
    console.log(`  ℹ Omitidos por cambio concurrente: ${rows.length - updated}`);
  }
  console.log('');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
