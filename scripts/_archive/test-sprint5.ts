/**
 * Prueba Sprint 5: check-out recepción y reportes CSV.
 * Requiere servidor en marcha y DEMO_PASSWORD en .env.
 */
import 'dotenv/config';
import { loginReceptionStaff, receptionCheckIn, receptionCheckOut } from '../lib/test-reception-auth.ts';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD;
const MEMBER_CEDULA = 'V-11223344';

if (!DEMO_PASSWORD) {
  console.error('Falta DEMO_PASSWORD en .env');
  process.exit(1);
}

let cookie = '';
let receptionCookie = '';
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

async function parseJson(res: Response) {
  return res.json().catch(() => ({}));
}

/** Cierra ingresos abiertos de corridas anteriores (p. ej. smoke tests). */
async function closeOpenSessionIfAny() {
  for (let attempt = 0; attempt < 5; attempt++) {
    const out = await receptionCheckOut(receptionCookie, MEMBER_CEDULA);
    if (out.status === 400) return;

    const data = await parseJson(out);
    if ((data as { already_checked_out?: boolean }).already_checked_out) return;
    if (out.status === 200 && (data as { success?: boolean }).success) continue;

    return;
  }
}

async function main() {
  console.log('=== Sprint 5 — Check-out + Reportes ===\n');

  receptionCookie = await loginReceptionStaff();

  await closeOpenSessionIfAny();

  const noCheckIn = await receptionCheckOut(receptionCookie, MEMBER_CEDULA);
  const noData = await parseJson(noCheckIn);
  ok(
    'Check-out sin ingreso activo',
    noCheckIn.status === 400 ||
      (noCheckIn.status === 200 && (noData as { already_checked_out?: boolean }).already_checked_out === true),
    `status ${noCheckIn.status} ${JSON.stringify(noData)}`
  );

  const checkIn = await receptionCheckIn(receptionCookie, MEMBER_CEDULA);
  const ci = await parseJson(checkIn);
  ok('Check-in recepción', checkIn.status === 200 && (ci as { success?: boolean }).success === true);

  const checkOut = await receptionCheckOut(receptionCookie, MEMBER_CEDULA);
  const co = await parseJson(checkOut);
  ok('Check-out recepción', checkOut.status === 200 && (co as { success?: boolean }).success === true);
  ok(
    'Check-out incluye duración',
    typeof (co as { duration_minutes?: number }).duration_minutes === 'number' &&
      (co as { duration_minutes: number }).duration_minutes >= 1
  );

  const again = await receptionCheckOut(receptionCookie, MEMBER_CEDULA);
  const againData = await parseJson(again);
  ok(
    'Segundo check-out → already_checked_out',
    again.status === 200 && (againData as { already_checked_out?: boolean }).already_checked_out === true
  );

  const reentry = await receptionCheckIn(receptionCookie, MEMBER_CEDULA);
  const reData = await parseJson(reentry);
  ok(
    'Re-ingreso tras salida permitido',
    reentry.status === 200 &&
      (reData as { success?: boolean }).success === true &&
      !(reData as { already_checked_in?: boolean }).already_checked_in
  );

  cookie = '';
  const adminLogin = await api('POST', '/api/auth/login', { email: 'admin@gym.com', password: DEMO_PASSWORD });
  ok('Login admin', adminLogin.res.status === 200);
  saveCookie(adminLogin.res);

  const reports = ['payments', 'attendance', 'members'] as const;
  for (const type of reports) {
    const res = await fetch(`${BASE}/api/reports/${type}`, {
      headers: { Cookie: cookie },
    });
    const text = await res.text();
    ok(`GET /api/reports/${type}`, res.status === 200 && res.headers.get('content-type')?.includes('csv') === true);
    ok(`CSV ${type} no vacío`, text.length > 20);
  }

  console.log(`\n=== Resultado: ${passed} OK, ${failed} FAIL ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
