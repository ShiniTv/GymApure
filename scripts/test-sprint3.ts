/**
 * Prueba Sprint 3: trainer filtrado, admin stats reales, mediciones corporales.
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

async function loginAs(email: string) {
  cookie = '';
  const login = await api('POST', '/api/auth/login', { email, password: DEMO_PASSWORD });
  saveCookie(login.res);
  return login.res.status === 200;
}

async function main() {
  console.log('=== Sprint 3 — Trainer + Admin + Mediciones ===\n');

  // Admin stats
  ok('Login admin', await loginAs('admin@gym.com'));
  const adminStats = await api('GET', '/api/stats/admin');
  const a = adminStats.data as {
    activeSubscriptions?: number;
    todayCheckIns?: number;
    totalRevenue?: number;
  };
  ok('GET /api/stats/admin', adminStats.res.status === 200);
  ok('Admin incluye activeSubscriptions', typeof a.activeSubscriptions === 'number');
  ok('Admin incluye todayCheckIns', typeof a.todayCheckIns === 'number');

  // Trainer stats filtradas
  ok('Login trainer', await loginAs('trainer@gym.com'));
  const trainerStats = await api('GET', '/api/stats/trainer');
  const t = trainerStats.data as {
    assignedMembers?: number;
    routinesCreated?: number;
    todayWorkouts?: number;
  };
  ok('GET /api/stats/trainer', trainerStats.res.status === 200);
  ok('Trainer incluye assignedMembers', typeof t.assignedMembers === 'number');
  ok('Trainer incluye routinesCreated', typeof t.routinesCreated === 'number');

  const routines = await api('GET', '/api/routines');
  ok('GET /api/routines (trainer)', routines.res.status === 200);
  const routineList = routines.data as { trainer_id?: number }[];
  ok('Rutinas es array', Array.isArray(routineList));

  const me = await api('GET', '/api/auth/me');
  const trainerId = (me.data as { user?: { id?: number } }).user?.id;
  if (trainerId && Array.isArray(routineList) && routineList.length > 0) {
    const allMine = routineList.every((r) => Number(r.trainer_id) === trainerId);
    ok('Rutinas filtradas por trainer_id', allMine);
  }

  // Mediciones
  const memberLogin = await loginAs('member@gym.com');
  ok('Login member', memberLogin);
  const memberMe = await api('GET', '/api/auth/me');
  const memberId = (memberMe.data as { user?: { id?: number } }).user?.id;

  if (memberId) {
    ok('Login trainer para mediciones', await loginAs('trainer@gym.com'));

    const getMeas = await api('GET', `/api/users/${memberId}/measurements`);
    ok('GET mediciones', getMeas.res.status === 200);

    const postMeas = await api('POST', `/api/users/${memberId}/measurements`, {
      date: new Date().toISOString().split('T')[0],
      weight: 75.5,
      body_fat_percentage: 18.2,
    });
    ok('POST medición', postMeas.res.status === 201);

    const after = await api('GET', `/api/users/${memberId}/measurements`);
    const list = after.data as { weight?: number }[];
    ok('Medición persistida', Array.isArray(list) && list.some((m) => m.weight === 75.5));

    const profile = await api('GET', `/api/users/${memberId}`);
    const p = profile.data as { initial_weight?: number; height?: number; goal?: string };
    ok('Perfil incluye campos extendidos', 'initial_weight' in p && 'height' in p && 'goal' in p);
  }

  console.log(`\n=== Resultado: ${passed} OK, ${failed} FAIL ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
