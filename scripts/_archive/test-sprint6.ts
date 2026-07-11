/**
 * Prueba Sprint 6: chat in-app y settings de vencimiento.
 * Requiere servidor en marcha y DEMO_PASSWORD en .env.
 */
import 'dotenv/config';
import { createApiSession } from '../test/lib/legacy-api-session.ts';

const DEMO_PASSWORD = process.env.DEMO_PASSWORD;

if (!DEMO_PASSWORD) {
  console.error('Falta DEMO_PASSWORD en .env');
  process.exit(1);
}

const { api, loginAs } = createApiSession();
let passed = 0;
let failed = 0;

function ok(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  OK  ${name}`);
    passed++;
  } else {
    console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

async function main() {
  console.log('=== Sprint 6 — Chat in-app ===\n');

  ok('Login admin', await loginAs('admin@gym.com'));

  const settings = await api('GET', '/api/settings/expiry');
  const s = settings.data as { expiry_alert_days?: number; providers?: unknown };
  ok('GET settings', settings.res.status === 200);
  ok('Settings incluye expiry_alert_days', typeof s.expiry_alert_days === 'number');
  ok('Settings sin providers outbound', s.providers === undefined);

  const unread = await api('GET', '/api/chat/unread-count');
  ok('GET chat unread', unread.res.status === 200);

  const update = await api('PUT', '/api/settings/expiry', {
    expiry_alert_days: 10,
  });
  ok('PUT settings expiry_alert_days', update.res.status === 200);

  console.log(`\n=== Resultado: ${passed} OK, ${failed} FAIL ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
