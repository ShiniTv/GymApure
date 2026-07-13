/**
 * Verifica que el panel de alertas responde bien (API).
 * Uso: npm run dev && npm run test:alerts
 */
import { loadEnvForScripts } from '../dev/load-env-file.ts';

loadEnvForScripts();

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD;

function assert(name: string, ok: boolean, detail?: string) {
  if (ok) console.log(`  OK  ${name}`);
  else {
    console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
    process.exitCode = 1;
  }
}

function extractTokenCookie(res: Response): string | undefined {
  const cookies = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  const fromArray = cookies.find((c) => c.startsWith('token='));
  if (fromArray) return fromArray.split(';')[0];
  const raw = res.headers.get('set-cookie');
  if (!raw) return undefined;
  return raw.match(/token=[^;]+/)?.[0];
}

async function main() {
  console.log(`Verificación panel alertas → ${BASE}\n`);

  if (!DEMO_PASSWORD) {
    console.error('Falta DEMO_PASSWORD en .env');
    process.exit(1);
  }

  const login = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@gym.com', password: DEMO_PASSWORD }),
  });
  const cookie = extractTokenCookie(login);
  assert('login admin', login.status === 200 && Boolean(cookie));
  if (!cookie) return;

  const headers = { Cookie: cookie };

  const statsRes = await fetch(`${BASE}/api/stats/admin`, { headers });
  const stats = await statsRes.json();
  assert('GET /api/stats/admin', statsRes.status === 200);
  assert('expiringSoon es número', typeof stats.expiringSoon === 'number');
  assert('expiryAlertDays es número', typeof stats.expiryAlertDays === 'number');
  assert('expiringList es array', Array.isArray(stats.expiringList));
  assert('totalUsers no incluido', stats.totalUsers === undefined);

  const settingsRes = await fetch(`${BASE}/api/settings/expiry`, { headers });
  const settings = await settingsRes.json();
  assert('GET /api/settings/expiry', settingsRes.status === 200);
  assert('settings expiry_alert_days', typeof settings.expiry_alert_days === 'number');

  const expiringRes = await fetch(`${BASE}/api/memberships/expiring`, { headers });
  const expiring = await expiringRes.json();
  assert('GET /api/memberships/expiring', expiringRes.status === 200);
  assert('expiring array', Array.isArray(expiring.expiring));
  assert('days en respuesta', typeof expiring.days === 'number');

  console.log('\nResumen:', {
    expiringSoon: stats.expiringSoon,
    expiryAlertDays: stats.expiryAlertDays,
    expiringList: stats.expiringList.length,
    settingsDays: settings.expiry_alert_days,
  });

  if (process.exitCode) {
    console.error('\nVerificación fallida.');
    process.exit(1);
  }
  console.log('\nPanel de alertas: APIs OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
