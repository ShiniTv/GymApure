/**
 * Checklist: membresías + check-in recepción.
 * Requiere servidor en marcha y admin de checklist (npm run test:auth-checklist primero).
 */
import { loadEnvForScripts } from '../dev/load-env-file.ts';

loadEnvForScripts();
import { loginReceptionStaff, receptionCheckIn, receptionCheckOut } from '../lib/test-reception-auth.ts';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const ADMIN_EMAIL = process.env.CHECKLIST_ADMIN_EMAIL ?? 'checklist-admin@test.local';
const ADMIN_PASSWORD = process.env.CHECKLIST_ADMIN_PASSWORD ?? 'ChecklistAdmin123!';

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

async function api(method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
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

async function main() {
  console.log('=== Membresías + Check-in checklist ===\n');

  const receptionCookie = await loginReceptionStaff();

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

  const beforeCheckIn = await receptionCheckIn(receptionCookie, MEMBER_CEDULA);
  const beforeData = await beforeCheckIn.json().catch(() => ({}));
  ok('Check-in sin membresía → 403', beforeCheckIn.status === 403, JSON.stringify(beforeData));

  const assign = await api('POST', '/api/memberships/assign', {
    user_id: memberId,
    membership_id: planId,
  });
  ok('Admin asigna membresía', assign.res.status === 201);

  const sub = await api('GET', `/api/memberships/user/${memberId}`);
  ok('GET membresía del miembro', sub.res.status === 200 && sub.data != null);

  const checkIn = await receptionCheckIn(receptionCookie, MEMBER_CEDULA);
  const ci = await checkIn.json().catch(() => ({}));
  ok(
    'Check-in con membresía activa',
    checkIn.status === 200 && (ci as { success?: boolean }).success === true
  );
  ok('Check-in incluye days_remaining', typeof (ci as { days_remaining?: number }).days_remaining === 'number');

  const checkOut = await receptionCheckOut(receptionCookie, MEMBER_CEDULA);
  const co = await checkOut.json().catch(() => ({}));
  ok('Check-out recepción', checkOut.status === 200 && (co as { success?: boolean }).success === true);

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
