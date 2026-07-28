/**
 * Purge password_reset_tokens that are expired or already used.
 * Matches db:health integrity check.
 *
 *   npm run db:purge-reset-tokens:dev
 *   npm run db:purge-reset-tokens:prod -- --allow-prod
 */
import { query, pool } from '../../src/db/index.ts';

async function main() {
  const allowProd = process.argv.includes('--allow-prod');
  const dbUrl = process.env.DATABASE_URL ?? '';
  const looksProd =
    dbUrl.includes('ffjwvlcwhyskddqqojnp') || process.env.NODE_ENV === 'production';

  if (looksProd && !allowProd) {
    console.error('✗ Refusing prod purge without --allow-prod');
    process.exit(1);
  }

  const r = await query(
    `DELETE FROM password_reset_tokens
     WHERE expires_at < NOW() OR used_at IS NOT NULL`
  );
  console.log(`✓ Purged ${r.rowCount ?? 0} password_reset_tokens (expired/used)`);
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await pool.end();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
