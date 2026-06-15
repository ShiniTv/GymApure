/**
 * Prueba Sprint 6: notificaciones email/WhatsApp (mock o real).
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
  console.log('=== Sprint 6 — Notificaciones ===\n');

  const login = await api('POST', '/api/auth/login', { email: 'admin@gym.com', password: DEMO_PASSWORD });
  ok('Login admin', login.res.status === 200);
  saveCookie(login.res);

  const settings = await api('GET', '/api/settings/expiry');
  const s = settings.data as {
    notify_payment_events?: boolean;
    notify_routine_assigned?: boolean;
    whatsapp_notifications_enabled?: boolean;
    providers?: {
      email: boolean;
      whatsapp: boolean;
      whatsappProvider?: string | null;
      whatsappProviderLabel?: string | null;
    };
  };
  ok('GET settings', settings.res.status === 200);
  ok('Settings incluye notify_payment_events', typeof s.notify_payment_events === 'boolean');
  ok('Settings incluye providers', typeof s.providers === 'object');
  ok('Settings incluye whatsappProvider', 'whatsappProvider' in (s.providers ?? {}));

  const testEmail = await api('POST', '/api/settings/notifications/test', {
    channel: 'email',
    target: 'admin@gym.com',
  });
  ok('POST test email', testEmail.res.status === 200);

  const update = await api('PUT', '/api/settings/expiry', {
    notify_payment_events: true,
    notify_routine_assigned: true,
    whatsapp_notifications_enabled: false,
  });
  ok('PUT settings notificaciones', update.res.status === 200);

  console.log(`\n=== Resultado: ${passed} OK, ${failed} FAIL ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
