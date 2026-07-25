/**
 * Checklist de seguridad (Fases 1–3): kiosk eliminado, sesiones, IDOR trainers, rutinas.
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

async function api(
  method: string,
  path: string,
  body?: unknown,
  extraHeaders?: Record<string, string>,
  options?: { skipCsrf?: boolean }
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(cookie ? { Cookie: cookie } : {}),
    ...extraHeaders,
  };
  if (csrfToken && MUTATING_METHODS.has(method) && !options?.skipCsrf) {
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
  const cookies = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
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
  console.log('=== Security checklist (Fases 1–3) ===\n');

  if (!DEMO_PASSWORD) {
    console.error('Falta DEMO_PASSWORD en .env');
    process.exit(1);
  }

  // --- Fase 1: kiosk público eliminado ---
  {
    const checkIn = await api('POST', '/api/attendance/check-in', { cedula: 'V-11223344' });
    ok('POST /api/attendance/check-in sin sesión → 401', checkIn.res.status === 401);

    const checkOut = await api('POST', '/api/attendance/check-out', { cedula: 'V-11223344' });
    ok('POST /api/attendance/check-out sin sesión → 401', checkOut.res.status === 401);

    const kioskHeader = await api(
      'POST',
      '/api/attendance/check-in',
      { cedula: 'V-11223344' },
      { 'X-Kiosk-Key': 'fake-kiosk-key-should-not-work' }
    );
    ok('Kiosk header ignorado → sigue 401', kioskHeader.res.status === 401);
  }

  // --- Fase 2: IDOR trainers + filtrado rutinas ---
  ok('Login admin', await loginAs('admin@gym.com'));

  const adminRoutinesRes = await api('GET', '/api/routines?all=1');
  ok('Admin GET /api/routines → 200', adminRoutinesRes.res.status === 200);
  const adminRoutineList = adminRoutinesRes.data as unknown[];

  cookie = '';
  ok('Login member demo', await loginAs('member@gym.com'));
  const memberProfile = await api('GET', '/api/auth/me');
  const memberId = (memberProfile.data as { user?: { id?: number } }).user?.id;

  if (memberId) {
    const memberRoutines = await api('GET', '/api/routines?all=1');
    const memberList = memberRoutines.data as { id?: number; name?: string }[];
    ok('Member GET /api/routines → 200', memberRoutines.res.status === 200);
    ok('Member solo ve rutinas asignadas (array)', Array.isArray(memberList));
    ok(
      'Member tiene rutina demo asignada',
      Array.isArray(memberList) && memberList.some((r) => r.name === 'Demo CI Routine'),
      'Ejecuta npm run db:restore-demo para crear la asignación demo'
    );

    cookie = '';
    ok('Login admin para crear miembro aislado', await loginAs('admin@gym.com'));
    const isolatedEmail = `security-isolated-${Date.now()}@test.local`;
    const isolatedCedula = `V-${70000000 + Math.floor(Math.random() * 999999)}`;
    const createIsolated = await api('POST', '/api/users', {
      full_name: 'Isolated Member',
      email: isolatedEmail,
      password: 'IsolatedPass123!',
      cedula: isolatedCedula,
      role: 'member',
    });
    ok('Admin crea miembro sin rutina', createIsolated.res.status === 201);
    const isolatedId = (createIsolated.data as { id?: number }).id;

    cookie = '';
    ok('Login trainer demo', await loginAs('trainer@gym.com'));

    if (isolatedId) {
      const blockedProfile = await api('GET', `/api/users/${isolatedId}`);
      ok(
        'Trainer sin acceso a miembro no asignado → 403',
        blockedProfile.res.status === 403,
        `status ${blockedProfile.res.status}`
      );
    }

    const allowedProfile = await api('GET', `/api/users/${memberId}`);
    ok(
      'Trainer accede a miembro con asignación explícita → 200',
      allowedProfile.res.status === 200,
      `status ${allowedProfile.res.status}`
    );

    // --- IDOR edge: nutrición / archivos / citas ---
    const nutritionPlan = await api('GET', `/api/users/${memberId}/nutrition/plan`);
    ok(
      'Trainer lee plan nutricional de miembro asignado → 200|404',
      nutritionPlan.res.status === 200 || nutritionPlan.res.status === 404,
      `status ${nutritionPlan.res.status}`
    );
    if (isolatedId) {
      const blockedNutrition = await api('GET', `/api/users/${isolatedId}/nutrition/plan`);
      ok(
        'Trainer sin acceso a nutrición de no asignado → 403',
        blockedNutrition.res.status === 403,
        `status ${blockedNutrition.res.status}`
      );
    }

    const appointmentsList = await api('GET', `/api/appointments?member_id=${memberId}`);
    ok(
      'Trainer lista citas de miembro asignado → 200',
      appointmentsList.res.status === 200,
      `status ${appointmentsList.res.status}`
    );

    cookie = '';
    ok('Login member para files IDOR', await loginAs('member@gym.com'));
    const memberFileProbe = await api('GET', '/api/files/avatars/nonexistent-avatar.jpg');
    ok(
      'Member file inexistente no filtra path → 404|403|400',
      [400, 403, 404].includes(memberFileProbe.res.status),
      `status ${memberFileProbe.res.status}`
    );

    cookie = '';
    ok('Login trainer tras files IDOR', await loginAs('trainer@gym.com'));
    const classSessions = await api('GET', '/api/classes/sessions');
    ok(
      'Trainer GET sesiones de clase → 200',
      classSessions.res.status === 200,
      `status ${classSessions.res.status}`
    );

    const assessmentRead = await api('GET', `/api/users/${memberId}/training-assessment`);
    ok('Trainer lee evaluación de miembro asignado → 200', assessmentRead.res.status === 200);
    const assessmentWrite = await api('PUT', `/api/users/${memberId}/training-assessment`, {
      primary_goal: 'Mejorar fuerza',
      experience_level: 'intermediate',
      preferences: 'Entrenar por la tarde',
      equipment_access: 'Gimnasio completo',
      mobility_notes: 'Movilidad de tobillo limitada',
      coaching_notes: 'Progresión gradual',
    });
    ok('Trainer guarda evaluación de miembro asignado → 200', assessmentWrite.res.status === 200);

    const checkinsRead = await api('GET', `/api/users/${memberId}/weekly-checkins`);
    ok('Trainer lee check-ins de miembro asignado → 200', checkinsRead.res.status === 200);
    const checkinWrite = await api('PUT', `/api/users/${memberId}/weekly-checkins`, {
      energy: 4,
      sleep_quality: 3,
      stress_level: 2,
      soreness_level: 2,
      adherence_score: 4,
      notes: 'Buena respuesta al plan',
    });
    ok('Trainer guarda check-in de miembro asignado → 200', checkinWrite.res.status === 200);

    const appointmentStart = new Date(Date.now() + 86_400_000).toISOString();
    const appointmentEnd = new Date(Date.now() + 90_000_000).toISOString();
    const appointmentCreate = await api('POST', '/api/appointments', {
      member_id: memberId,
      starts_at: appointmentStart,
      ends_at: appointmentEnd,
      notes: 'Prueba de agenda segura',
    });
    ok('Trainer agenda sesión 1:1 con miembro asignado → 201', appointmentCreate.res.status === 201);
    const appointmentId = Number((appointmentCreate.data as { id?: number }).id);
    if (appointmentId) {
      const appointmentUpdate = await api('PATCH', `/api/appointments/${appointmentId}`, {
        status: 'completed',
      });
      ok(
        'Trainer completa su sesión 1:1 → 200',
        appointmentUpdate.res.status === 200 &&
          (appointmentUpdate.data as { status?: string }).status === 'completed'
      );
    }

    if (isolatedId) {
      const blockedAssessment = await api('GET', `/api/users/${isolatedId}/training-assessment`);
      ok(
        'Trainer sin acceso a evaluación de miembro no asignado → 403',
        blockedAssessment.res.status === 403,
        `status ${blockedAssessment.res.status}`
      );
      const blockedAppointment = await api('POST', '/api/appointments', {
        member_id: isolatedId,
        starts_at: appointmentStart,
        ends_at: appointmentEnd,
      });
      ok(
        'Trainer no agenda sesión 1:1 con miembro no asignado → 403',
        blockedAppointment.res.status === 403,
        `status ${blockedAppointment.res.status}`
      );
    }

    const trainerRoutines = await api('GET', '/api/routines?all=1');
    const trainerList = trainerRoutines.data as { trainer_id?: number }[];
    const trainerAuth = await api('GET', '/api/auth/me');
    const trainerId = (trainerAuth.data as { user?: { id?: number } }).user?.id;
    if (trainerId && Array.isArray(trainerList) && trainerList.length > 0) {
      ok(
        'Trainer solo ve sus rutinas',
        trainerList.every((r) => Number(r.trainer_id) === trainerId)
      );
    }
    const firstRoutineId = Number((trainerList[0] as { id?: number } | undefined)?.id);
    if (firstRoutineId) {
      const routineDetail = await api('GET', `/api/routines/${firstRoutineId}`);
      const exercises =
        (routineDetail.data as { exercises?: Array<{ id?: number }> }).exercises ?? [];
      const firstExerciseId = Number(exercises[0]?.id);
      if (firstExerciseId) {
        const loadSuggestion = await api(
          'GET',
          `/api/users/${memberId}/exercise-load-suggestion?exercise_id=${firstExerciseId}&routine_id=${firstRoutineId}`
        );
        ok(
          'Trainer consulta sugerencia de carga de miembro asignado → 200',
          loadSuggestion.res.status === 200
        );
        if (isolatedId) {
          const blockedSuggestion = await api(
            'GET',
            `/api/users/${isolatedId}/exercise-load-suggestion?exercise_id=${firstExerciseId}&routine_id=${firstRoutineId}`
          );
          ok(
            'Trainer sin acceso a sugerencia de carga de miembro no asignado → 403',
            blockedSuggestion.res.status === 403,
            `status ${blockedSuggestion.res.status}`
          );
        }
      }
    }
  } else {
    console.log('  SKIP IDOR/rutinas (member@gym.com no encontrado — db:restore-demo)');
  }

  // --- Sesión única: segundo login invalida el primero ---
  {
    cookie = '';
    ok('Login member (sesión A)', await loginAs('member@gym.com'));
    const cookieA = cookie;

    cookie = '';
    ok('Login member (sesión B)', await loginAs('member@gym.com'));
    const cookieB = cookie;

    cookie = cookieA;
    const staleAfterDualLogin = await api('GET', '/api/auth/me');
    ok(
      'Sesión A invalidada tras login en otro dispositivo → 401',
      staleAfterDualLogin.res.status === 401,
      `status ${staleAfterDualLogin.res.status}`
    );

    cookie = cookieB;
    const activeSession = await api('GET', '/api/auth/me');
    ok('Sesión B activa tras segundo login → 200', activeSession.res.status === 200);
  }

  // --- Fase 1: invalidación de sesión al cambiar status ---
  cookie = '';
  ok('Login admin para status', await loginAs('admin@gym.com'));
  const tempEmail = `security-status-${Date.now()}@test.local`;
  const tempCedula = `V-${60000000 + Math.floor(Math.random() * 999999)}`;
  const createTemp = await api('POST', '/api/users', {
    full_name: 'Status Test User',
    email: tempEmail,
    password: 'StatusPass123!',
    cedula: tempCedula,
    role: 'member',
  });
  ok('Admin crea usuario temporal', createTemp.res.status === 201);
  const tempId = (createTemp.data as { id?: number }).id;

  cookie = '';
  ok('Login usuario temporal', await loginAs(tempEmail, 'StatusPass123!'));
  const tempCookie = cookie;
  const alive = await api('GET', '/api/auth/me');
  ok('Sesión activa antes de suspender', alive.res.status === 200);

  cookie = '';
  ok('Login admin para suspender', await loginAs('admin@gym.com'));
  if (tempId) {
    const suspend = await api('PATCH', `/api/users/${tempId}/status`, { status: 'inactive' });
    ok('Admin suspende usuario → 200', suspend.res.status === 200);
  }

  cookie = tempCookie;
  const staleSession = await api('GET', '/api/auth/me');
  ok(
    'Cookie invalidada tras cambio de status',
    staleSession.res.status === 403,
    `status ${staleSession.res.status}`
  );

  cookie = '';
  ok('Login admin para reactivar', await loginAs('admin@gym.com'));
  if (tempId) {
    await api('PATCH', `/api/users/${tempId}/status`, { status: 'active' });
  }

  // Compare admin vs member routine counts when both exist
  cookie = '';
  ok('Login member final', await loginAs('member@gym.com'));
  const memberFinal = await api('GET', '/api/routines?all=1');
  const memberFinalList = memberFinal.data as unknown[];
  if (Array.isArray(adminRoutineList) && Array.isArray(memberFinalList)) {
    ok(
      'Admin ve al menos tantas rutinas como el miembro',
      adminRoutineList.length >= memberFinalList.length
    );
  }

  // --- Fase 4: hardening adicional ---
  {
    const publicHealth = await api('GET', '/api/health');
    const healthPayload = publicHealth.data as {
      status?: string;
      allowPublicRegister?: boolean;
      email?: unknown;
    };
    ok('GET /api/health público → 200', publicHealth.res.status === 200);
    ok(
      'Health público no expone allowPublicRegister',
      healthPayload.allowPublicRegister === undefined
    );
    ok('Health público no expone email config', healthPayload.email === undefined);

    const authConfig = await api('GET', '/api/auth/config');
    ok('GET /api/auth/config → 200', authConfig.res.status === 200);

    const cronNoSecret = await api('POST', '/api/settings/expiry/run');
    ok('Cron sin secret ni sesión → 403', cronNoSecret.res.status === 403);

    const cronBadSecret = await api('POST', '/api/settings/expiry/run', undefined, {
      'x-cron-secret': 'definitely-wrong-cron-secret-value',
    });
    ok('Cron con secret inválido → 403', cronBadSecret.res.status === 403);

    const trainerRemindersNoSecret = await api('POST', '/api/trainer-reminders/run');
    ok(
      'Recordatorios 1:1 sin secret ni admin → 403',
      trainerRemindersNoSecret.res.status === 403
    );

    if (process.env.CRON_SECRET) {
      const cronOk = await api('POST', '/api/settings/expiry/run', undefined, {
        'x-cron-secret': process.env.CRON_SECRET,
      });
      ok('Cron con CRON_SECRET válido → 200', cronOk.res.status === 200);
      const trainerRemindersOk = await api('POST', '/api/trainer-reminders/run', undefined, {
        'x-cron-secret': process.env.CRON_SECRET,
      });
      ok('Recordatorios 1:1 con CRON_SECRET válido → 200', trainerRemindersOk.res.status === 200);
    }

    // CSRF en rutas protegidas (dev o cuando CORS_ORIGINS está definido)
    cookie = '';
    csrfToken = '';
    ok('Login admin para CSRF', await loginAs('admin@gym.com'));
    ok('Login establece cookie csrf_token', csrfToken.length > 0);

    const csrfBlocked = await api(
      'POST',
      '/api/users',
      {
        full_name: 'CSRF Block Test',
        email: `csrf-block-${Date.now()}@test.local`,
        password: 'CsrfBlock123!',
        cedula: `V-${80000000 + Math.floor(Math.random() * 999999)}`,
        role: 'member',
      },
      undefined,
      { skipCsrf: true }
    );
    ok(
      'POST protegido sin X-CSRF-Token → 403',
      csrfBlocked.res.status === 403,
      `status ${csrfBlocked.res.status}`
    );

    if (process.env.CORS_ORIGINS?.trim()) {
      const allowed = process.env.CORS_ORIGINS.split(',')[0]?.trim();
      const corsRes = await fetch(`${BASE}/api/health`, {
        headers: { Origin: 'https://evil.example.test' },
      });
      const acao = corsRes.headers.get('Access-Control-Allow-Origin');
      ok(
        'CORS: origen no permitido no recibe Access-Control-Allow-Origin',
        acao !== 'https://evil.example.test'
      );
      if (allowed) {
        const allowedRes = await fetch(`${BASE}/api/health`, {
          headers: { Origin: allowed },
        });
        ok(
          'CORS: origen permitido recibe Access-Control-Allow-Origin',
          allowedRes.headers.get('Access-Control-Allow-Origin') === allowed
        );
      }
    } else {
      console.log('  SKIP CORS negativo (CORS_ORIGINS no configurado en servidor)');
    }
  }

  console.log(`\n=== Resultado: ${passed} OK, ${failed} FAIL ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
