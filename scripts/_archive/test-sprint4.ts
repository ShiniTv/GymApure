/**
 * Prueba Sprint 4: alertas de vencimiento y cambio de contraseña.
 * Requiere servidor en marcha y DEMO_PASSWORD (.env.dev).
 */
import { loadEnvForScripts } from '../dev/load-env-file.ts';

loadEnvForScripts();

import { hashPassword } from '../../src/lib/passwordHash.ts';
import { pool, query } from '../../src/db/index.ts';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD;
/** Cumple passwordSchema (DEMO_PASSWORD puede no tener carácter especial). */
const TEMP_PASSWORD = 'Sprint4TempPass1!';

if (!DEMO_PASSWORD) {
  console.error('Falta DEMO_PASSWORD en .env.dev');
  process.exit(1);
}

let cookie = '';
let csrfToken = '';
let passed = 0;
let failed = 0;

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

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

async function loginAs(email: string, password = DEMO_PASSWORD!) {
  cookie = '';
  csrfToken = '';
  const login = await api('POST', '/api/auth/login', { email, password });
  saveCookies(login.res);
  return login.res.status === 200;
}

async function restoreDemoPasswordViaDb() {
  const hashed = await hashPassword(DEMO_PASSWORD!);
  await query(
    `UPDATE users
     SET password = $1, token_version = COALESCE(token_version, 0) + 1
     WHERE LOWER(email) = LOWER($2)`,
    [hashed, 'member@gym.com']
  );
}

async function main() {
  console.log('=== Sprint 4 — Alertas + Contraseña ===\n');

  try {
    // Admin expiring stats
    ok('Login admin', await loginAs('admin@gym.com'));
    const adminStats = await api('GET', '/api/stats/admin');
    const a = adminStats.data as {
      expiringSoon?: number;
      expiredThisWeek?: number;
      expiringList?: unknown[];
    };
    ok('GET /api/stats/admin', adminStats.res.status === 200);
    ok('Admin incluye expiringSoon', typeof a.expiringSoon === 'number');
    ok('Admin incluye expiringList', Array.isArray(a.expiringList));
    ok('Admin incluye expiredThisWeek', typeof a.expiredThisWeek === 'number');

    const expiringApi = await api('GET', '/api/memberships/expiring');
    ok('GET /api/memberships/expiring', expiringApi.res.status === 200);

    // Member subscription endpoint
    ok('Login member', await loginAs('member@gym.com'));
    const memberMe = await api('GET', '/api/auth/me');
    const memberId = (memberMe.data as { user?: { id?: number } }).user?.id;
    if (memberId) {
      const sub = await api('GET', `/api/memberships/user/${memberId}`);
      ok('GET membresía del miembro', sub.res.status === 200);
    }

    const memberStats = await api('GET', '/api/stats/member');
    ok('GET /api/stats/member', memberStats.res.status === 200);

    // Change password (restore after test)
    const change = await api('POST', '/api/auth/change-password', {
      current_password: DEMO_PASSWORD,
      new_password: TEMP_PASSWORD,
      confirm_password: TEMP_PASSWORD,
    });
    ok('POST change-password', change.res.status === 200, JSON.stringify(change.data));

    ok('Login con nueva contraseña', await loginAs('member@gym.com', TEMP_PASSWORD));

    // DEMO_PASSWORD puede no pasar passwordSchema (p. ej. sin carácter especial).
    await restoreDemoPasswordViaDb();
    ok('Restaurar contraseña demo', true);
    ok('Login con contraseña demo', await loginAs('member@gym.com'));

    const badChange = await api('POST', '/api/auth/change-password', {
      current_password: 'wrong-password',
      new_password: 'WrongPass123!',
      confirm_password: 'WrongPass123!',
    });
    ok('Rechaza contraseña actual incorrecta', badChange.res.status === 401);

    console.log(`\n=== Resultado: ${passed} OK, ${failed} FAIL ===`);
    process.exit(failed > 0 ? 1 : 0);
  } finally {
    await pool.end().catch(() => undefined);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
