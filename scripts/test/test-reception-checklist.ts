/**
 * Checklist del rol recepcionista y panel de acceso por cédula.
 * Requiere: npm run dev + npm run db:restore-demo (o usuario receptionist@gym.com)
 */
import 'dotenv/config';
import { resolveDemoPassword } from '../../src/lib/passwordPolicy.ts';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const RECEPTION_EMAIL = process.env.SMOKE_RECEPTION_EMAIL ?? 'receptionist@gym.com';
const RECEPTION_PASSWORD = process.env.SMOKE_RECEPTION_PASSWORD ?? resolveDemoPassword();
const MEMBER_CEDULA = process.env.SMOKE_MEMBER_CEDULA ?? 'V-11223344';

let cookie = '';
let csrfToken = '';
let passed = 0;
let failed = 0;

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function buildCookieHeader(): string {
  const parts = cookie ? [cookie] : [];
  if (csrfToken) parts.push(`csrf_token=${encodeURIComponent(csrfToken)}`);
  return parts.join('; ');
}

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
  const cookieHeader = buildCookieHeader();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(cookieHeader ? { Cookie: cookieHeader } : {}),
  };
  if (csrfToken && MUTATING_METHODS.has(method)) {
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

function saveCookie(res: Response) {
  const cookies =
    typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  for (const entry of cookies) {
    if (entry.startsWith('token=')) cookie = entry.split(';')[0];
    if (entry.startsWith('csrf_token=')) {
      const raw = entry.split(';')[0].slice('csrf_token='.length);
      csrfToken = decodeURIComponent(raw);
    }
  }
}

async function main() {
  console.log('=== Reception checklist ===\n');

  const login = await api('POST', '/api/auth/login', {
    email: RECEPTION_EMAIL,
    password: RECEPTION_PASSWORD,
  });
  if (login.res.status !== 200) {
    console.error(
      `No se pudo iniciar sesión como recepcionista (${RECEPTION_EMAIL}). Ejecuta npm run db:restore-demo`
    );
    process.exit(1);
  }
  ok('Login recepcionista', login.res.status === 200);
  saveCookie(login.res);

  const me = await api('GET', '/api/auth/me');
  ok('GET /api/auth/me → receptionist', me.res.status === 200 && me.data.user?.role === 'receptionist');

  const settings = await api('GET', '/api/settings/expiry');
  ok('Settings bloqueado para recepcionista (403)', settings.res.status === 403);

  const lookup = await api('GET', `/api/reception/lookup?cedula=${encodeURIComponent(MEMBER_CEDULA)}`);
  ok('Lookup por cédula demo member', lookup.res.status === 200 && lookup.data.found === true);

  const inside = await api('GET', '/api/attendance/inside');
  ok('GET /api/attendance/inside', inside.res.status === 200 && Array.isArray(inside.data.members));

  const stats = await api('GET', '/api/stats/reception');
  ok('GET /api/stats/reception', stats.res.status === 200 && typeof stats.data.todayCheckIns === 'number');

  const checkIn = await api('POST', '/api/reception/check-in', { cedula: MEMBER_CEDULA });
  ok(
    'POST /api/reception/check-in',
    checkIn.res.status === 200 && checkIn.data.success === true,
    checkIn.data.error
  );

  const lookupInside = await api('GET', `/api/reception/lookup?cedula=${encodeURIComponent(MEMBER_CEDULA)}`);
  ok(
    'Lookup refleja ingreso activo',
    lookupInside.res.status === 200 && lookupInside.data.attendance?.is_inside === true
  );

  const checkOut = await api('POST', '/api/reception/check-out', { cedula: MEMBER_CEDULA });
  ok(
    'POST /api/reception/check-out',
    checkOut.res.status === 200 && checkOut.data.success === true,
    checkOut.data.error
  );

  const insideAfterCheckout = await api('GET', '/api/attendance/inside');
  const stillInside = Array.isArray(insideAfterCheckout.data.members)
    ? insideAfterCheckout.data.members.some(
        (m: { cedula?: string | null }) =>
          m.cedula?.toUpperCase() === MEMBER_CEDULA.toUpperCase()
      )
    : true;
  ok(
    'Check-out remueve miembro de lista inside',
    insideAfterCheckout.res.status === 200 && !stillInside,
    stillInside ? 'miembro aún aparece dentro' : undefined
  );

  const lookupAfterCheckout = await api(
    'GET',
    `/api/reception/lookup?cedula=${encodeURIComponent(MEMBER_CEDULA)}`
  );
  ok(
    'Lookup refleja salida registrada',
    lookupAfterCheckout.res.status === 200 &&
      lookupAfterCheckout.data.attendance?.is_inside === false,
    lookupAfterCheckout.data.error
  );

  const payments = await api('GET', '/api/payments');
  ok('GET /api/payments como recepcionista', payments.res.status === 200);

  const members = await api('GET', '/api/users?role=member');
  ok('GET /api/users miembros', members.res.status === 200 && Array.isArray(members.data.items));

  const plans = await api('GET', '/api/memberships');
  const planId = Array.isArray(plans.data) && plans.data[0]?.id ? plans.data[0].id : null;
  ok('GET /api/memberships para walk-in', plans.res.status === 200 && planId != null);

  if (planId) {
    const suffix = Date.now();
    const walkCedula = `V-${91000000 + (suffix % 999999)}`;
    const walkIn = await api('POST', '/api/reception/walk-in', {
      full_name: 'Cliente Walk-In Test',
      email: `walkin-${suffix}@test.local`,
      cedula: walkCedula,
      membership_id: planId,
      method: 'efectivo',
      check_in: true,
    });
    ok(
      'POST /api/reception/walk-in',
      walkIn.res.status === 201 &&
        walkIn.data.success === true &&
        (walkIn.data.email_sent === true || !!walkIn.data.password_setup_url) &&
        !walkIn.data.temporary_password,
      walkIn.data.error
    );

    const walkLookup = await api('GET', `/api/reception/lookup?cedula=${encodeURIComponent(walkCedula)}`);
    ok(
      'Walk-in: lookup con membresía activa',
      walkLookup.res.status === 200 &&
        walkLookup.data.found === true &&
        walkLookup.data.subscription != null,
      walkLookup.data.error
    );
  }

  console.log(`\n=== Resultado: ${passed} OK, ${failed} FAIL ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
