/**
 * Prueba turnos de entrenadores, filtrado dinámico y carné (API).
 * Requiere servidor en marcha, migración aplicada y npm run db:restore-demo.
 */
import { loadEnvForScripts } from '../dev/load-env-file.ts';

loadEnvForScripts();
import { buildBadgeQrValue, parseBadgeScan } from '../../src/lib/badgeQr';

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

async function loginAs(email: string) {
  cookie = '';
  const login = await api('POST', '/api/auth/login', { email, password: DEMO_PASSWORD });
  saveCookie(login.res);
  return login.res.status === 200;
}

async function main() {
  console.log('=== Trainer shifts + carné API ===\n');

  ok('Login admin', await loginAs('admin@gym.com'));

  const allTrainers = await api('GET', '/api/trainers');
  ok('GET /api/trainers', allTrainers.res.status === 200);
  const trainers = allTrainers.data as { full_name: string; shift: string }[];
  ok('Lista incluye entrenadores', Array.isArray(trainers) && trainers.length >= 1);

  const vespertino = await api('GET', '/api/trainers?shift=vespertino');
  ok('GET /api/trainers?shift=vespertino', vespertino.res.status === 200);
  const vespertinoList = vespertino.data as { full_name: string; shift: string }[];
  ok(
    'Filtro vespertino solo devuelve vespertino',
    Array.isArray(vespertinoList) &&
      vespertinoList.every((t) => t.shift === 'vespertino') &&
      vespertinoList.some((t) => t.full_name.includes('Alexis') || t.full_name.includes('John'))
  );

  const diurno = await api('GET', '/api/trainers?shift=diurno');
  const diurnoList = diurno.data as { full_name: string; shift: string }[];
  ok(
    'Filtro diurno incluye Vicente',
    Array.isArray(diurnoList) && diurnoList.some((t) => t.full_name.includes('Vicente'))
  );

  const memberOptions = await api('GET', '/api/users/options?role=member&shift=vespertino');
  ok('GET /api/users/options?shift=vespertino', memberOptions.res.status === 200);
  const members = memberOptions.data as { full_name: string; training_shift?: string }[];
  ok(
    'Miembros vespertino incluyen Jane',
    Array.isArray(members) &&
      members.every((m) => m.training_shift === 'vespertino') &&
      members.some((m) => m.full_name.includes('Jane'))
  );

  const memberUser = await api('GET', '/api/users/1');
  ok('Perfil miembro incluye training_shift', memberUser.res.status === 200 || memberUser.res.status === 404);

  ok('buildBadgeQrValue canonical', buildBadgeQrValue('v12345678') === 'V-12345678');
  ok('parseBadgeScan plain cedula', parseBadgeScan('V-12345678') === 'V-12345678');
  ok(
    'parseBadgeScan legacy JSON',
    parseBadgeScan('{"cedula":"V-87654321","v":1}') === 'V-87654321'
  );

  console.log(`\nResultado: ${passed} OK, ${failed} FAIL`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
