/**
 * Verifica gates ops locales (.env.prod) sin imprimir secretos.
 * Uso: npx tsx scripts/dev/run-with-env.ts .env.prod scripts/deploy/verify-ops-local.ts
 */
import { config } from 'dotenv';

config({ path: '.env.prod' });

function looksDsn(s: string) {
  return /^https:\/\/.+@.+\/\d+/.test(s);
}
function looksMailto(s: string) {
  return /^mailto:[^\s<>]+@[^\s<>]+$/.test(s.trim());
}

const sentry = (process.env.SENTRY_DSN || '').trim();
const vite = (process.env.VITE_SENTRY_DSN || '').trim();
const mfa = (process.env.MFA_ENCRYPTION_KEY || '').trim();
const jwt = (process.env.JWT_SECRET || '').trim();
const vapidPub = (process.env.VAPID_PUBLIC_KEY || '').trim();
const vapidPriv = (process.env.VAPID_PRIVATE_KEY || '').trim();
const vapidSub = (process.env.VAPID_SUBJECT || '').trim();

const report = {
  SENTRY_DSN: sentry ? (looksDsn(sentry) ? 'ok' : 'bad_format') : 'missing',
  VITE_SENTRY_DSN: vite ? (looksDsn(vite) ? 'ok' : 'bad_format') : 'missing',
  same_sentry: Boolean(sentry) && sentry === vite,
  MFA_ENCRYPTION_KEY: mfa.length >= 32 ? (mfa === jwt ? 'same_as_jwt' : 'ok') : 'missing',
  VAPID_SUBJECT: vapidSub ? (looksMailto(vapidSub) ? 'ok' : 'bad_format') : 'missing',
  VAPID_PUBLIC_KEY: vapidPub.length >= 80 ? 'ok' : vapidPub ? 'short' : 'missing',
  VAPID_PRIVATE_KEY: vapidPriv.length >= 40 ? 'ok' : vapidPriv ? 'short' : 'missing',
};

console.log('=== Ops local (.env.prod) ===');
for (const [k, v] of Object.entries(report)) {
  const pass = v === true || v === 'ok';
  console.log(`  ${pass ? 'OK ' : '!! '} ${k}: ${v}`);
}

const failed = Object.values(report).some((v) => v !== true && v !== 'ok');
process.exit(failed ? 1 : 0);
