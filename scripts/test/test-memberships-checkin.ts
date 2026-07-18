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
  const contentType = res.headers.get('content-type') ?? '';
  const data = contentType.includes('json') ? await res.json().catch(() => ({})) : await res.text();
  return { res, data };
}

function saveCookie(res: Response) {
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

async function login(email: string, password: string) {
  cookie = '';
  csrfToken = '';
  const res = await api('POST', '/api/auth/login', { email, password });
  saveCookie(res.res);
  return res;
}

async function main() {
  console.log('=== Membresías + Check-in checklist ===\n');

  const receptionCookie = await loginReceptionStaff();

  const adminLogin = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  ok('Login admin', adminLogin.res.status === 200);
  if (adminLogin.res.status !== 200) process.exit(1);

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
  csrfToken = '';
  const reg = await api('POST', '/api/auth/register', {
    full_name: 'Member Checklist',
    email: MEMBER_EMAIL,
    password: MEMBER_PASSWORD,
    cedula: MEMBER_CEDULA,
  });
  ok('Registro miembro para check-in', reg.res.status === 201);
  const memberId = (reg.data as { user?: { id: number } }).user?.id;

  await login(ADMIN_EMAIL, ADMIN_PASSWORD);

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
  ok(
    'Check-in incluye days_remaining',
    typeof (ci as { days_remaining?: number }).days_remaining === 'number'
  );

  const todayList = await api('GET', '/api/attendance/today');
  ok(
    'Lista asistencia de hoy',
    todayList.res.status === 200 && Array.isArray(todayList.data),
    JSON.stringify(todayList.data)?.slice(0, 120)
  );
  const todaySearch = await api(
    'GET',
    `/api/attendance/today?q=${encodeURIComponent('Member Checklist')}`
  );
  const todayHits = (todaySearch.data as { full_name?: string; cedula?: string }[]) ?? [];
  ok(
    'Buscar asistencia por nombre',
    todaySearch.res.status === 200 &&
      Array.isArray(todayHits) &&
      todayHits.some((r) => r.cedula === MEMBER_CEDULA),
    JSON.stringify(todayHits.map((r) => r.cedula))
  );

  const inactive = await api('GET', '/api/attendance/inactive?days=14');
  ok(
    'GET miembros inactivos',
    inactive.res.status === 200 &&
      Array.isArray((inactive.data as { members?: unknown[] }).members),
    JSON.stringify(inactive.data)?.slice(0, 120)
  );

  const checkOut = await receptionCheckOut(receptionCookie, MEMBER_CEDULA);
  const co = await checkOut.json().catch(() => ({}));
  ok(
    'Check-out recepción',
    checkOut.status === 200 && (co as { success?: boolean }).success === true
  );

  const pauseWithoutReason = await api('POST', '/api/memberships/pause', { user_id: memberId });
  ok(
    'Pausar sin motivo → 400',
    pauseWithoutReason.res.status === 400,
    JSON.stringify(pauseWithoutReason.data)
  );

  const pauseReason = 'Viaje checklist membresía';
  const pause = await api('POST', '/api/memberships/pause', {
    user_id: memberId,
    reason: pauseReason,
  });
  ok('Admin pausa membresía', pause.res.status === 200, JSON.stringify(pause.data));

  const lookupPaused = await api(
    'GET',
    `/api/reception/lookup?cedula=${encodeURIComponent(MEMBER_CEDULA)}`
  );
  ok(
    'Lookup muestra membresía pausada',
    lookupPaused.res.status === 200 &&
      lookupPaused.data.access_status === 'paused' &&
      lookupPaused.data.subscription?.status === 'paused' &&
      lookupPaused.data.subscription?.pause_reason === pauseReason &&
      lookupPaused.data.can_check_in === false,
    JSON.stringify({
      access_status: lookupPaused.data.access_status,
      subscription: lookupPaused.data.subscription,
      can_check_in: lookupPaused.data.can_check_in,
    })
  );

  const checkInPaused = await receptionCheckIn(receptionCookie, MEMBER_CEDULA);
  const pausedData = await checkInPaused.json().catch(() => ({}));
  ok(
    'Check-in con membresía pausada → 403',
    checkInPaused.status === 403 &&
      String((pausedData as { error?: string }).error ?? '').toLowerCase().includes('pausad'),
    JSON.stringify(pausedData)
  );

  const resume = await api('POST', '/api/memberships/resume', { user_id: memberId });
  ok('Admin reanuda membresía', resume.res.status === 200, JSON.stringify(resume.data));

  const lookupResumed = await api(
    'GET',
    `/api/reception/lookup?cedula=${encodeURIComponent(MEMBER_CEDULA)}`
  );
  ok(
    'Lookup tras reanudar permite ingreso',
    lookupResumed.res.status === 200 &&
      lookupResumed.data.access_status === 'allowed' &&
      lookupResumed.data.can_check_in === true,
    JSON.stringify({
      access_status: lookupResumed.data.access_status,
      can_check_in: lookupResumed.data.can_check_in,
    })
  );

  const checkInResumed = await receptionCheckIn(receptionCookie, MEMBER_CEDULA);
  const ciResumed = await checkInResumed.json().catch(() => ({}));
  ok(
    'Check-in tras reanudar',
    checkInResumed.status === 200 && (ciResumed as { success?: boolean }).success === true
  );

  const expiring = await api('GET', '/api/memberships/expiring');
  ok('GET /api/memberships/expiring', expiring.res.status === 200);

  cookie = '';
  csrfToken = '';
  const memberStats = await api('GET', '/api/stats/member');
  ok('Stats member sin login → 401', memberStats.res.status === 401);

  const memberLogin = await login(MEMBER_EMAIL, MEMBER_PASSWORD);
  ok('Login miembro', memberLogin.res.status === 200);
  const memberStatsOk = await api('GET', '/api/stats/member');
  ok('GET /api/stats/member autenticado', memberStatsOk.res.status === 200);

  console.log(`\n=== Resultado: ${passed} OK, ${failed} FAIL ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
