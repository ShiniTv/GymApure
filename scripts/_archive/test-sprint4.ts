/**
 * Prueba Sprint 4: alertas de vencimiento y cambio de contraseña.
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

async function loginAs(email: string, password = DEMO_PASSWORD!) {
  cookie = '';
  const login = await api('POST', '/api/auth/login', { email, password });
  saveCookie(login.res);
  return login.res.status === 200;
}

async function main() {
  console.log('=== Sprint 4 — Alertas + Contraseña ===\n');

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
  const newPassword = `${DEMO_PASSWORD}x`;
  const change = await api('POST', '/api/auth/change-password', {
    current_password: DEMO_PASSWORD,
    new_password: newPassword,
    confirm_password: newPassword,
  });
  ok('POST change-password', change.res.status === 200);

  ok('Login con nueva contraseña', await loginAs('member@gym.com', newPassword));

  const restore = await api('POST', '/api/auth/change-password', {
    current_password: newPassword,
    new_password: DEMO_PASSWORD,
    confirm_password: DEMO_PASSWORD,
  });
  ok('Restaurar contraseña demo', restore.res.status === 200);
  ok('Login con contraseña demo', await loginAs('member@gym.com'));

  const badChange = await api('POST', '/api/auth/change-password', {
    current_password: 'wrong-password',
    new_password: 'WrongPass123!',
    confirm_password: 'WrongPass123!',
  });
  ok('Rechaza contraseña actual incorrecta', badChange.res.status === 401);

  console.log(`\n=== Resultado: ${passed} OK, ${failed} FAIL ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
