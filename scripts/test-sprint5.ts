/**
 * Prueba Sprint 5: check-out kiosk y reportes CSV.
 * Requiere servidor en marcha, DEMO_PASSWORD y KIOSK_API_KEY en .env.
 */
import 'dotenv/config';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD;
const KIOSK_KEY = process.env.KIOSK_API_KEY ?? process.env.VITE_KIOSK_KEY;
const MEMBER_CEDULA = 'V-11223344';

if (!DEMO_PASSWORD) {
  console.error('Falta DEMO_PASSWORD en .env');
  process.exit(1);
}

if (!KIOSK_KEY) {
  console.error('Falta KIOSK_API_KEY o VITE_KIOSK_KEY en .env');
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

async function api(
  method: string,
  path: string,
  body?: unknown,
  headers?: Record<string, string>
) {
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

/** Cierra ingresos abiertos de corridas anteriores (p. ej. smoke tests). */
async function closeOpenSessionIfAny() {
  for (let attempt = 0; attempt < 5; attempt++) {
    const out = await kiosk('POST', '/api/attendance/check-out', { cedula: MEMBER_CEDULA });
    if (out.res.status === 400) return;

    const data = out.data as { success?: boolean; already_checked_out?: boolean };
    if (data.already_checked_out) return;
    if (out.res.status === 200 && data.success) continue;

    return;
  }
}

async function main() {
  console.log('=== Sprint 5 — Check-out + Reportes ===\n');

  await closeOpenSessionIfAny();

  // Sin ingreso activo: 400 si nunca entró hoy, o 200 already_checked_out si ya salió
  const noCheckIn = await kiosk('POST', '/api/attendance/check-out', { cedula: MEMBER_CEDULA });
  const noData = noCheckIn.data as { already_checked_out?: boolean };
  ok(
    'Check-out sin ingreso activo',
    noCheckIn.res.status === 400 ||
      (noCheckIn.res.status === 200 && noData.already_checked_out === true),
    `status ${noCheckIn.res.status} ${JSON.stringify(noCheckIn.data)}`
  );

  // Check-in
  const checkIn = await kiosk('POST', '/api/attendance/check-in', { cedula: MEMBER_CEDULA });
  const ci = checkIn.data as { success?: boolean; user_name?: string };
  ok('Check-in kiosk', checkIn.res.status === 200 && ci.success === true);

  // Check-out
  const checkOut = await kiosk('POST', '/api/attendance/check-out', { cedula: MEMBER_CEDULA });
  const co = checkOut.data as { success?: boolean; duration_minutes?: number };
  ok('Check-out kiosk', checkOut.res.status === 200 && co.success === true);
  ok('Check-out incluye duración', typeof co.duration_minutes === 'number' && co.duration_minutes >= 1);

  // Segundo check-out mismo día
  const again = await kiosk('POST', '/api/attendance/check-out', { cedula: MEMBER_CEDULA });
  const againData = again.data as { already_checked_out?: boolean };
  ok('Segundo check-out → already_checked_out', again.res.status === 200 && againData.already_checked_out === true);

  // Re-ingreso tras salida
  const reentry = await kiosk('POST', '/api/attendance/check-in', { cedula: MEMBER_CEDULA });
  const reData = reentry.data as { success?: boolean; already_checked_in?: boolean };
  ok('Re-ingreso tras salida permitido', reentry.res.status === 200 && reData.success === true && !reData.already_checked_in);

  // Reportes CSV (admin)
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
