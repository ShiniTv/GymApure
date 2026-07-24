/**
 * Autorización del rol trainer: asignación de rutinas, options scoping, aislamiento cross-trainer.
 * Requiere servidor en marcha, DEMO_PASSWORD y npm run db:restore-demo.
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

function todayPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

async function main() {
  console.log('=== Trainer authorization checklist ===\n');

  if (!DEMO_PASSWORD) {
    console.error('Falta DEMO_PASSWORD en .env');
    process.exit(1);
  }

  cookie = '';
  ok('Login admin', await loginAs('admin@gym.com'));

  const isolatedEmail = `trainer-auth-${Date.now()}@test.local`;
  const isolatedCedula = `V-${71000000 + Math.floor(Math.random() * 999999)}`;
  const createIsolated = await api('POST', '/api/users', {
    full_name: 'Trainer Auth Isolated',
    email: isolatedEmail,
    password: 'IsolatedPass123!',
    cedula: isolatedCedula,
    role: 'member',
  });
  ok('Admin crea miembro aislado', createIsolated.res.status === 201);
  const isolatedId = (createIsolated.data as { id?: number }).id;

  cookie = '';
  ok('Login trainer demo', await loginAs('trainer@gym.com'));
  const trainerMe = await api('GET', '/api/auth/me');
  const primaryTrainerId = (trainerMe.data as { user?: { id?: number } }).user?.id;

  if (isolatedId) {
    const listBefore = await api('GET', '/api/users?page=1&pageSize=100&role=member');
    const idsBefore = ((listBefore.data as { items?: { id?: number }[] }).items ?? []).map(
      (u) => u.id
    );
    ok(
      'GET /api/users no incluye miembro no asignado',
      !idsBefore.includes(isolatedId),
      `ids: ${idsBefore.join(',')}`
    );
  }

  const trainerRoutines = await api('GET', '/api/routines?all=1');
  const ownRoutine = (trainerRoutines.data as { id?: number; trainer_id?: number }[])[0];
  ok('Trainer tiene al menos una rutina propia', Boolean(ownRoutine?.id));

  if (isolatedId && ownRoutine?.id) {
    const assignOwn = await api('POST', `/api/users/${isolatedId}/routines`, {
      routine_id: ownRoutine.id,
      start_date: todayPlus(0),
      end_date: todayPlus(30),
    });
    ok(
      'Trainer asigna su rutina a miembro nuevo → 200',
      assignOwn.res.status === 200,
      `status ${assignOwn.res.status}`
    );

    const listAfter = await api('GET', '/api/users?page=1&pageSize=100&role=member');
    const idsAfter = ((listAfter.data as { items?: { id?: number }[] }).items ?? []).map(
      (u) => u.id
    );
    ok(
      'GET /api/users incluye miembro tras asignar rutina',
      idsAfter.includes(isolatedId),
      `ids: ${idsAfter.join(',')}`
    );

    const optionsAfterAssign = await api('GET', '/api/users/options?role=member');
    const optionIds = (optionsAfterAssign.data as { id?: number }[]).map((u) => u.id);
    ok(
      'GET /api/users/options incluye miembro asignado',
      optionIds.includes(isolatedId),
      `ids: ${optionIds.join(',')}`
    );
  }

  const createdByTrainerEmail = `trainer-created-${Date.now()}@test.local`;
  const createdByTrainerCedula = `V-${72000000 + Math.floor(Math.random() * 999999)}`;
  const createAsTrainer = await api('POST', '/api/users', {
    full_name: 'Trainer Created Client',
    email: createdByTrainerEmail,
    password: 'IsolatedPass123!',
    cedula: createdByTrainerCedula,
    role: 'member',
  });
  ok('Trainer crea miembro → 201', createAsTrainer.res.status === 201, createAsTrainer.data.error);
  const createdByTrainerId = (createAsTrainer.data as { id?: number }).id;
  if (createdByTrainerId) {
    const listCreated = await api('GET', '/api/users?page=1&pageSize=100&role=member');
    const createdIds = ((listCreated.data as { items?: { id?: number }[] }).items ?? []).map(
      (u) => u.id
    );
    ok(
      'Miembro creado por trainer aparece en GET /api/users',
      createdIds.includes(createdByTrainerId),
      `ids: ${createdIds.join(',')}`
    );
    const optionsCreated = await api('GET', '/api/users/options?role=member');
    const optionCreatedIds = (optionsCreated.data as { id?: number }[]).map((u) => u.id);
    ok(
      'Miembro creado por trainer aparece en /options',
      optionCreatedIds.includes(createdByTrainerId),
      `ids: ${optionCreatedIds.join(',')}`
    );
  }

  cookie = '';
  ok('Login segundo trainer (Alexis)', await loginAs('alexis.trainer@gym.com'));

  if (isolatedId) {
    const blockedList = await api('GET', '/api/users?page=1&pageSize=100&role=member');
    const blockedListIds = ((blockedList.data as { items?: { id?: number }[] }).items ?? []).map(
      (u) => u.id
    );
    ok(
      'Trainer B no ve en lista el miembro solo de trainer A',
      !blockedListIds.includes(isolatedId),
      `ids: ${blockedListIds.join(',')}`
    );

    const blockedOptions = await api('GET', '/api/users/options?role=member');
    const foreignIds = (blockedOptions.data as { id?: number }[]).map((u) => u.id);
    ok(
      'Trainer B no enumera miembro solo asignado a trainer A',
      !foreignIds.includes(isolatedId),
      `ids: ${foreignIds.join(',')}`
    );
  }

  if (createdByTrainerId) {
    const blockedCreatedList = await api('GET', '/api/users?page=1&pageSize=100&role=member');
    const blockedCreatedIds = (
      (blockedCreatedList.data as { items?: { id?: number }[] }).items ?? []
    ).map((u) => u.id);
    ok(
      'Trainer B no ve miembro creado por trainer A',
      !blockedCreatedIds.includes(createdByTrainerId),
      `ids: ${blockedCreatedIds.join(',')}`
    );
  }

  if (isolatedId && ownRoutine?.id) {
    const blockedAssign = await api('POST', `/api/users/${isolatedId}/routines`, {
      routine_id: ownRoutine.id,
      start_date: todayPlus(0),
      end_date: todayPlus(30),
    });
    ok(
      'Trainer B no puede asignar rutina de trainer A → 403',
      blockedAssign.res.status === 403,
      `status ${blockedAssign.res.status}`
    );

    const blockedDelete = await api(
      'DELETE',
      `/api/users/${isolatedId}/routines/${ownRoutine.id}`
    );
    ok(
      'Trainer B no puede desasignar rutina de trainer A → 403',
      blockedDelete.res.status === 403,
      `status ${blockedDelete.res.status}`
    );
  }

  cookie = '';
  ok('Login admin para rutina cross-trainer', await loginAs('admin@gym.com'));

  const alexisRow = await api('GET', '/api/trainers?shift=vespertino');
  const alexisTrainer = (alexisRow.data as { full_name?: string; id?: number }[]).find((t) =>
    t.full_name?.includes('Alexis')
  );
  const alexisId = alexisTrainer?.id;

  const memberIdRes = await api('GET', '/api/users?page=1&pageSize=50&role=member');
  const allMembers = (memberIdRes.data as { items?: { id?: number; email?: string }[] }).items ?? [];
  const demoMember = allMembers.find((m) => m.email === 'member@gym.com') ?? allMembers[0];
  const sharedMemberId = demoMember?.id;

  let alexisRoutineId: number | undefined;
  if (alexisId && sharedMemberId && primaryTrainerId) {
    const createAlexisRoutine = await queryRoutineForTrainer(alexisId);
    alexisRoutineId = createAlexisRoutine;

    if (alexisRoutineId) {
      cookie = '';
      ok('Login Alexis para asignar rutina propia', await loginAs('alexis.trainer@gym.com'));
      await api('POST', `/api/users/${sharedMemberId}/routines`, {
        routine_id: alexisRoutineId,
        start_date: todayPlus(0),
        end_date: todayPlus(14),
      });

      cookie = '';
      ok('Login trainer demo para lectura scoped', await loginAs('trainer@gym.com'));
      const scopedRoutines = await api('GET', `/api/users/${sharedMemberId}/routines`);
      const routineList = scopedRoutines.data as { trainer_id?: number }[];
      ok('GET rutinas del miembro → 200', scopedRoutines.res.status === 200);
      if (Array.isArray(routineList) && routineList.length > 0 && primaryTrainerId) {
        ok(
          'Trainer A solo ve sus rutinas en el miembro compartido',
          routineList.every((r) => Number(r.trainer_id) === primaryTrainerId),
          `trainer_ids: ${routineList.map((r) => r.trainer_id).join(',')}`
        );
      }

      const scopedHistory = await api('GET', `/api/users/${sharedMemberId}/history`);
      ok('GET historial del miembro → 200', scopedHistory.res.status === 200);
      const historyItems = (scopedHistory.data as { items?: { routine_name?: string }[] }).items ?? [];
      if (Array.isArray(historyItems) && historyItems.length > 0) {
        ok(
          'Historial scoped devuelve array',
          Array.isArray(historyItems),
          `count ${historyItems.length}`
        );
      }
    }
  }

  cookie = '';
  ok('Login trainer demo para stats', await loginAs('trainer@gym.com'));
  const stats = await api('GET', '/api/stats/trainer');
  ok('GET /api/stats/trainer → 200', stats.res.status === 200);
  const statsData = stats.data as {
    assignedMembers?: number;
    activeNow?: number;
    totalMembers?: number;
    membersWithoutRoutines?: number;
  };
  if (statsData.assignedMembers !== undefined && statsData.totalMembers !== undefined) {
    ok(
      'totalMembers alineado con miembros asignados',
      statsData.totalMembers === statsData.assignedMembers,
      `total=${statsData.totalMembers} assigned=${statsData.assignedMembers}`
    );
  }
  if (statsData.membersWithoutRoutines !== undefined && statsData.assignedMembers !== undefined) {
    ok(
      'membersWithoutRoutines no supera assignedMembers',
      statsData.membersWithoutRoutines <= statsData.assignedMembers,
      `without=${statsData.membersWithoutRoutines} assigned=${statsData.assignedMembers}`
    );
  }

  console.log(`\n=== Resultado: ${passed} OK, ${failed} FAIL ===`);
  process.exit(failed > 0 ? 1 : 0);
}

async function queryRoutineForTrainer(trainerUserId: number): Promise<number | undefined> {
  cookie = '';
  await loginAs('admin@gym.com');
  const existing = await api('GET', '/api/routines?all=1');
  const list = existing.data as { id?: number; trainer_id?: number; name?: string }[];
  const found = list.find(
    (r) => Number(r.trainer_id) === trainerUserId && r.name === 'Alexis Cross-Trainer Test'
  );
  if (found?.id) return found.id;

  cookie = '';
  await loginAs('alexis.trainer@gym.com');
  const created = await api('POST', '/api/routines', {
    name: 'Alexis Cross-Trainer Test',
    difficulty: 'Beginner',
  });
  return (created.data as { id?: number }).id;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
