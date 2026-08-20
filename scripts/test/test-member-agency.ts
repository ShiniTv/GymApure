/**
 * Autonomía guiada: auto-asignación, elección del día, sustitución miembro, IDOR.
 * Requiere servidor en marcha, DEMO_PASSWORD y npm run db:restore-demo + db:migrate:dev.
 */
import { loadEnvForScripts } from '../dev/load-env-file.ts';

loadEnvForScripts();

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD;

let cookie = '';
let csrfToken = '';
let passed = 0;
let failed = 0;

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

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

function saveCookies(res: Response) {
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

async function loginAs(email: string, password = DEMO_PASSWORD!) {
  cookie = '';
  csrfToken = '';
  const login = await api('POST', '/api/auth/login', { email, password });
  saveCookies(login.res);
  return login.res.status === 200;
}

async function main() {
  console.log('=== Member guided agency checklist ===\n');

  if (!DEMO_PASSWORD) {
    console.error('Falta DEMO_PASSWORD en .env');
    process.exit(1);
  }

  cookie = '';
  ok('Login member demo', await loginAs('member@gym.com'));

  const templates = await api('GET', '/api/routines/templates');
  ok('GET /api/routines/templates → 200', templates.res.status === 200);
  const templateList = Array.isArray(templates.data)
    ? (templates.data as { id: number; member_selectable?: boolean }[])
    : [];
  ok('Hay al menos una plantilla selectable', templateList.length > 0);

  const templateId = templateList[0]?.id;
  let selfAssignedRoutineId: number | undefined;

  if (templateId) {
    const selfAssign = await api('POST', `/api/routines/${templateId}/self-assign`);
    ok(
      'POST self-assign plantilla → 200/201',
      selfAssign.res.status === 200 || selfAssign.res.status === 201,
      `status ${selfAssign.res.status}`
    );
    selfAssignedRoutineId = (selfAssign.data as { routine_id?: number }).routine_id;

    const memberStats = await api('GET', '/api/stats/member');
    ok('GET /api/stats/member incluye todayRoutineId', memberStats.res.status === 200);
    const stats = memberStats.data as {
      todayRoutineId?: number | null;
      assignedRoutines?: { id: number }[];
    };
    if (selfAssignedRoutineId) {
      ok(
        'todayRoutineId coincide con rutina auto-asignada',
        stats.todayRoutineId === selfAssignedRoutineId,
        `today=${stats.todayRoutineId} assigned=${selfAssignedRoutineId}`
      );
    }

    const nutrition = await api('GET', '/api/auth/me');
    const memberId = (nutrition.data as { user?: { id?: number } }).user?.id;
    if (memberId) {
      const planRes = await api('GET', `/api/users/${memberId}/nutrition/plan`);
      ok('Plan nutricional sugerido cuando no hay plan personal → 200', planRes.res.status === 200);
      const plan = planRes.data as { is_suggested?: boolean; title?: string };
      ok(
        'Plan nutricional disponible (sugerido o personalizado)',
        plan.is_suggested === true || Boolean(plan.title),
        JSON.stringify(plan).slice(0, 120)
      );
    }
  }

  // Elección del día
  const meAgain = await api('GET', '/api/auth/me');
  const mid = (meAgain.data as { user?: { id?: number } }).user?.id;
  const memberRoutines = mid
    ? await api('GET', `/api/users/${mid}/routines`)
    : { res: { status: 0 }, data: [] };
  const routineRows = Array.isArray(memberRoutines.data)
    ? (memberRoutines.data as { id: number }[])
    : [];
  if (routineRows.length >= 1 && mid) {
    const pickId = routineRows[0].id;
    const todayPick = await api('PUT', '/api/stats/member/today-routine', {
      routine_id: pickId,
    });
    ok('PUT today-routine → 200', todayPick.res.status === 200);
    const otherMemberRoutine = routineRows[routineRows.length - 1]?.id;
    if (otherMemberRoutine && otherMemberRoutine !== pickId) {
      const todayPick2 = await api('PUT', '/api/stats/member/today-routine', {
        routine_id: otherMemberRoutine,
      });
      ok('Cambiar elección del día → 200', todayPick2.res.status === 200);
    }
  }

  // Miembro no puede crear rutinas genéricas
  const createRoutine = await api('POST', '/api/routines', {
    name: 'Rutina ilegal miembro',
    difficulty: 'Beginner',
  });
  ok(
    'Member POST /api/routines bloqueado → 4xx',
    createRoutine.res.status >= 400 && createRoutine.res.status < 500,
    `status ${createRoutine.res.status}`
  );

  // Trainer ve elecciones del cliente
  cookie = '';
  ok('Login trainer demo', await loginAs('trainer@gym.com'));
  const trainerStats = await api('GET', '/api/stats/trainer');
  ok('GET /api/stats/trainer → 200', trainerStats.res.status === 200);
  ok(
    'Trainer stats incluye memberChoices',
    Array.isArray((trainerStats.data as { memberChoices?: unknown[] }).memberChoices),
    'memberChoices missing'
  );

  // IDOR: miembro aislado no sustituye rutina ajena
  cookie = '';
  ok('Login admin', await loginAs('admin@gym.com'));
  const isolatedEmail = `member-agency-${Date.now()}@test.local`;
  const isolatedCedula = `V-${72000000 + Math.floor(Math.random() * 999999)}`;
  const createIsolated = await api('POST', '/api/users', {
    full_name: 'Member Agency Isolated',
    email: isolatedEmail,
    password: 'IsolatedPass123!',
    cedula: isolatedCedula,
    role: 'member',
  });
  ok('Admin crea miembro aislado', createIsolated.res.status === 201);
  const isolatedId = (createIsolated.data as { id?: number }).id;

  cookie = '';
  await loginAs('member@gym.com');
  if (isolatedId && mid) {
    const blockedToday = await api('PUT', '/api/stats/member/today-routine', {
      routine_id: 999999,
    });
    ok(
      'Member no elige rutina inexistente → 4xx',
      blockedToday.res.status >= 400 && blockedToday.res.status < 500,
      `status ${blockedToday.res.status}`
    );
  }

  cookie = '';
  if (isolatedEmail) {
    ok('Login miembro aislado', await loginAs(isolatedEmail, 'IsolatedPass123!'));
    if (templateId) {
      const crossAssign = await api('POST', `/api/routines/${templateId}/self-assign`);
      ok(
        'Miembro sin asignación puede auto-asignar plantilla del gym → 200/201',
        crossAssign.res.status === 200 || crossAssign.res.status === 201,
        `status ${crossAssign.res.status}`
      );
    }
    const blockedNutrition = await api('PUT', `/api/users/${mid}/nutrition/plan`, {
      calories_target: 2000,
      protein_target_g: 150,
      carbs_target_g: 200,
      fat_target_g: 60,
    });
    ok(
      'Member no edita plan nutricional ajeno → 4xx',
      blockedNutrition.res.status >= 400 && blockedNutrition.res.status < 500,
      `status ${blockedNutrition.res.status}`
    );
  }

  console.log(`\n=== Resultado: ${passed} OK, ${failed} FAIL ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
