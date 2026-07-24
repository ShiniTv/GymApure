/**
 * Dominio notificaciones (ex Sprint 6): chat in-app y settings de vencimiento.
 * Requiere servidor en marcha y DEMO_PASSWORD (.env.dev).
 * Alias histórico: npm run test:sprint6
 */
import { loadEnvForScripts } from '../dev/load-env-file.ts';

loadEnvForScripts();

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD;
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

if (!DEMO_PASSWORD) {
  console.error('Falta DEMO_PASSWORD en .env.dev');
  process.exit(1);
}

let cookie = '';
let csrfToken = '';
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
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(cookie ? { Cookie: cookie } : {}),
  };
  if (csrfToken && MUTATING.has(method)) {
    headers['x-csrf-token'] = csrfToken;
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

function saveCookies(res: Response) {
  const cookies =
    typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  const parts: string[] = [];
  for (const entry of cookies) {
    if (entry.startsWith('token=')) {
      parts.push(entry.split(';')[0]);
    }
    if (entry.startsWith('csrf_token=')) {
      const raw = entry.split(';')[0].slice('csrf_token='.length);
      csrfToken = decodeURIComponent(raw);
      parts.push(entry.split(';')[0]);
    }
  }
  if (parts.length) cookie = parts.join('; ');
}

async function main() {
  console.log('=== Sprint 6 — Chat in-app ===\n');

  const login = await api('POST', '/api/auth/login', {
    email: 'admin@gym.com',
    password: DEMO_PASSWORD,
  });
  ok('Login admin', login.res.status === 200);
  saveCookies(login.res);

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
  ok('PUT settings expiry_alert_days', update.res.status === 200, JSON.stringify(update.data));

  console.log(`\n=== Resultado: ${passed} OK, ${failed} FAIL ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
