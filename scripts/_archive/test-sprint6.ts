/**
 * Prueba Sprint 6: chat in-app y settings de vencimiento.
 * Requiere servidor en marcha y DEMO_PASSWORD en .env.
 */
import 'dotenv/config';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD;

if (!DEMO_PASSWORD) {
  console.error('Falta DEMO_PASSWORD en .env');
  process.exit(1);
}

let cookie = '';
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

async function api(method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

function saveCookie(res: Response) {
  const cookies =
    typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  const fromArr = cookies.find((c) => c.startsWith('token='));
  if (fromArr) cookie = fromArr.split(';')[0];
}

async function main() {
  console.log('=== Sprint 6 — Chat in-app ===\n');

  const login = await api('POST', '/api/auth/login', { email: 'admin@gym.com', password: DEMO_PASSWORD });
  ok('Login admin', login.res.status === 200);
  saveCookie(login.res);

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
