/**
 * Checklist: clases grupales y reservas (staff + miembro).
 * Requiere servidor en marcha, admin checklist y demo trainer/reception.
 */
import { loadEnvForScripts } from '../dev/load-env-file.ts';

loadEnvForScripts();
import { resolveDemoPassword } from '../../src/lib/passwordPolicy.ts';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const ADMIN_EMAIL = process.env.CHECKLIST_ADMIN_EMAIL ?? 'checklist-admin@test.local';
const ADMIN_PASSWORD = process.env.CHECKLIST_ADMIN_PASSWORD ?? 'ChecklistAdmin123!';
const RECEPTION_EMAIL = process.env.SMOKE_RECEPTION_EMAIL ?? 'receptionist@gym.com';
const RECEPTION_PASSWORD = process.env.SMOKE_RECEPTION_PASSWORD ?? resolveDemoPassword();
const TRAINER_EMAIL = process.env.SMOKE_TRAINER_EMAIL ?? 'trainer@gym.com';
const TRAINER_PASSWORD = process.env.SMOKE_TRAINER_PASSWORD ?? resolveDemoPassword();

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

async function jsonApi(method: string, path: string, body?: unknown) {
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

function saveCookie(res: Response) {
  const cookies =
    typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  const parts: string[] = [];
  for (const entry of cookies) {
    if (entry.startsWith('token=')) parts.push(entry.split(';')[0]);
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
  const result = await jsonApi('POST', '/api/auth/login', { email, password });
  saveCookie(result.res);
  return result;
}

function dayRangeIso() {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

async function main() {
  console.log('=== Clases / reservas checklist ===\n');

  const adminLogin = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  ok('Login admin', adminLogin.res.status === 200);
  if (adminLogin.res.status !== 200) process.exit(1);

  let types = await jsonApi('GET', '/api/classes/types');
  let typeList = (types.data as { id: number; name: string; is_active?: boolean }[]) ?? [];
  ok('GET tipos de clase', types.res.status === 200 && Array.isArray(typeList));

  let typeId = typeList.find((t) => t.is_active !== false)?.id;
  if (!typeId) {
    const createdType = await jsonApi('POST', '/api/classes/types', {
      name: `Clase Checklist ${Date.now()}`,
      duration_minutes: 45,
      default_capacity: 8,
    });
    ok('Crear tipo de clase', createdType.res.status === 201, JSON.stringify(createdType.data));
    typeId = (createdType.data as { id?: number }).id;
  }

  const trainers = await jsonApi('GET', '/api/trainers');
  const trainerList = Array.isArray(trainers.data)
    ? (trainers.data as { id: number; full_name: string }[])
    : ((trainers.data as { items?: { id: number; full_name: string }[] }).items ?? []);
  ok('GET entrenadores', trainers.res.status === 200 && trainerList.length > 0);
  const instructorId = trainerList[0]?.id;

  const starts = new Date();
  starts.setHours(starts.getHours() + 3, 0, 0, 0);
  const created = await jsonApi('POST', '/api/classes/sessions', {
    class_type_id: typeId,
    starts_at: starts.toISOString(),
    capacity: 5,
    instructor_id: instructorId,
  });
  ok(
    'Admin programa sesión con instructor',
    created.res.status === 201 &&
      Number((created.data as { instructor_id?: number }).instructor_id) === Number(instructorId),
    JSON.stringify(created.data)
  );
  const sessionId = Number((created.data as { id?: number }).id);

  const { from, to } = dayRangeIso();
  const todaySessions = await jsonApi(
    'GET',
    `/api/classes/sessions?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  );
  const todayItems = (todaySessions.data as { id?: number; waitlisted_count?: number }[]) ?? [];
  ok(
    'GET sesiones del día incluye waitlisted_count',
    todaySessions.res.status === 200 &&
      Array.isArray(todayItems) &&
      todayItems.some((s) => Number(s.id) === sessionId) &&
      typeof todayItems.find((s) => Number(s.id) === sessionId)?.waitlisted_count === 'number',
    JSON.stringify(todayItems.find((s) => Number(s.id) === sessionId))
  );

  const receptionLogin = await login(RECEPTION_EMAIL, RECEPTION_PASSWORD);
  if (receptionLogin.res.status === 200) {
    const receptionSessions = await jsonApi(
      'GET',
      `/api/classes/sessions?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    );
    ok('Recepción ve sesiones del día', receptionSessions.res.status === 200);

    const cancelAsReception = await jsonApi('POST', `/api/classes/sessions/${sessionId}/cancel`, {});
    ok(
      'Recepción no puede cancelar sesión → 403',
      cancelAsReception.res.status === 403,
      JSON.stringify(cancelAsReception.data)
    );
  } else {
    console.log('  SKIP recepción (db:restore-demo)');
  }

  const trainerLogin = await login(TRAINER_EMAIL, TRAINER_PASSWORD);
  if (trainerLogin.res.status === 200) {
    const trainerMe = await jsonApi('GET', '/api/auth/me');
    const trainerUserId = Number((trainerMe.data as { user?: { id?: number } }).user?.id);
    const foreignCancel = await jsonApi('POST', `/api/classes/sessions/${sessionId}/cancel`, {});
    if (Number(instructorId) === trainerUserId) {
      ok(
        'Entrenador instructor puede cancelar su sesión',
        foreignCancel.res.status === 200,
        JSON.stringify(foreignCancel.data)
      );
    } else {
      ok(
        'Entrenador no cancela sesión de otro → 403',
        foreignCancel.res.status === 403,
        JSON.stringify(foreignCancel.data)
      );

      await login(ADMIN_EMAIL, ADMIN_PASSWORD);
      const adminCancel = await jsonApi('POST', `/api/classes/sessions/${sessionId}/cancel`, {});
      ok('Admin cancela sesión', adminCancel.res.status === 200, JSON.stringify(adminCancel.data));
    }
  } else {
    await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    const adminCancel = await jsonApi('POST', `/api/classes/sessions/${sessionId}/cancel`, {});
    ok('Admin cancela sesión', adminCancel.res.status === 200, JSON.stringify(adminCancel.data));
    console.log('  SKIP entrenador (db:restore-demo)');
  }

  console.log(`\n=== Resultado: ${passed} OK, ${failed} FAIL ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
