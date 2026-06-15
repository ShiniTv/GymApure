/**
 * Checklist: membresías + check-in kiosk.
 * Requiere servidor en marcha y admin de checklist (npm run test:auth-checklist primero).
 */
import 'dotenv/config';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const ADMIN_EMAIL = process.env.CHECKLIST_ADMIN_EMAIL ?? 'checklist-admin@test.local';
const ADMIN_PASSWORD = process.env.CHECKLIST_ADMIN_PASSWORD ?? 'ChecklistAdmin123!';
const KIOSK_KEY = process.env.KIOSK_API_KEY ?? process.env.VITE_KIOSK_KEY;

const MEMBER_EMAIL = `mc-member-${Date.now()}@test.local`;
const MEMBER_PASSWORD = 'MemberCheck123!';
const MEMBER_CEDULA = `V-${70000000 + Math.floor(Math.random() * 999999)}`;

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

async function api(method: string, path: string, body?: unknown, headers?: Record<string, string>) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const contentType = res.headers.get('content-type') ?? '';
  const data = contentType.includes('json') ? await res.json().catch(() => ({})) : await res.text();
  return { res, data };
}

function saveCookie(res: Response) {
  const cookies =
    typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  const fromArr = cookies.find((c) => c.startsWith('token='));
  if (fromArr) cookie = fromArr.split(';')[0];
}

async function kiosk(method: string, path: string, body: unknown) {
  return api(method, path, body, { 'X-Kiosk-Key': KIOSK_KEY! });
}

async function main() {
  console.log('=== Membresías + Check-in checklist ===\n');

  if (!KIOSK_KEY) {
    console.error('Falta KIOSK_API_KEY o VITE_KIOSK_KEY en .env');
    process.exit(1);
  }

  const adminLogin = await api('POST', '/api/auth/login', {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  ok('Login admin', adminLogin.res.status === 200);
  if (adminLogin.res.status !== 200) process.exit(1);
  saveCookie(adminLogin.res);

  const plans = await api('GET', '/api/memberships');
  const planList = plans.data as { id: number; name: string }[];
  ok('GET /api/memberships (planes)', plans.res.status === 200 && Array.isArray(planList));

  let planId = planList[0]?.id;
  if (!planId) {
    const created = await api('POST', '/api/memberships', {
      name: 'Plan Checklist',
      duration_days: 30,
      price_usd: 25,
    });
    ok('Crear plan si no existía', created.res.status === 201);
    planId = (created.data as { id: number }).id;
  }

  cookie = '';
  const reg = await api('POST', '/api/auth/register', {
    full_name: 'Member Checklist',
    email: MEMBER_EMAIL,
    password: MEMBER_PASSWORD,
    cedula: MEMBER_CEDULA,
  });
  ok('Registro miembro para check-in', reg.res.status === 201);
  const memberId = (reg.data as { user?: { id: number } }).user?.id;

  cookie = '';
  const adminAgain = await api('POST', '/api/auth/login', {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  saveCookie(adminAgain.res);

  const beforeKiosk = await kiosk('POST', '/api/attendance/check-in', { cedula: MEMBER_CEDULA });
  ok('Check-in sin membresía → 403', beforeKiosk.res.status === 403);

  const assign = await api('POST', '/api/memberships/assign', {
    user_id: memberId,
    membership_id: planId,
  });
  ok('Admin asigna membresía', assign.res.status === 201);

  const sub = await api('GET', `/api/memberships/user/${memberId}`);
  ok('GET membresía del miembro', sub.res.status === 200 && sub.data != null);

  const checkIn = await kiosk('POST', '/api/attendance/check-in', { cedula: MEMBER_CEDULA });
  const ci = checkIn.data as { success?: boolean; days_remaining?: number };
  ok('Check-in con membresía activa', checkIn.res.status === 200 && ci.success === true);
  ok('Check-in incluye days_remaining', typeof ci.days_remaining === 'number');

  const checkOut = await kiosk('POST', '/api/attendance/check-out', { cedula: MEMBER_CEDULA });
  const co = checkOut.data as { success?: boolean };
  ok('Check-out kiosk', checkOut.res.status === 200 && co.success === true);

  const expiring = await api('GET', '/api/memberships/expiring');
  ok('GET /api/memberships/expiring', expiring.res.status === 200);

  cookie = '';
  const memberStats = await api('GET', '/api/stats/member');
  ok('Stats member sin login → 401', memberStats.res.status === 401);

  cookie = '';
  const memberLogin = await api('POST', '/api/auth/login', {
    email: MEMBER_EMAIL,
    password: MEMBER_PASSWORD,
  });
  saveCookie(memberLogin.res);
  const memberStatsOk = await api('GET', '/api/stats/member');
  ok('GET /api/stats/member autenticado', memberStatsOk.res.status === 200);

  console.log(`\n=== Resultado: ${passed} OK, ${failed} FAIL ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
