/**
 * Checklist de seguridad (Fases 1–3): kiosk eliminado, sesiones, IDOR trainers, rutinas.
 * Requiere servidor en marcha, DEMO_PASSWORD y npm run db:restore-demo.
 */
import 'dotenv/config';

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

  const adminRoutinesRes = await api('GET', '/api/routines');
  ok('Admin GET /api/routines → 200', adminRoutinesRes.res.status === 200);
  const adminRoutineList = adminRoutinesRes.data as unknown[];

  cookie = '';
  ok('Login member demo', await loginAs('member@gym.com'));
  const memberProfile = await api('GET', '/api/auth/me');
  const memberId = (memberProfile.data as { user?: { id?: number } }).user?.id;

  if (memberId) {
    const memberRoutines = await api('GET', '/api/routines');
    const memberList = memberRoutines.data as { id?: number; name?: string }[];
    ok('Member GET /api/routines → 200', memberRoutines.res.status === 200);
    ok('Member solo ve rutinas asignadas (array)', Array.isArray(memberList));
    ok(
      'Member tiene rutina demo asignada',
      Array.isArray(memberList) &&
        memberList.some((r) => r.name === 'Demo CI Routine'),
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
      'Trainer accede a miembro con rutina asignada → 200',
      allowedProfile.res.status === 200,
      `status ${allowedProfile.res.status}`
    );

    const trainerRoutines = await api('GET', '/api/routines');
    const trainerList = trainerRoutines.data as { trainer_id?: number }[];
    const trainerAuth = await api('GET', '/api/auth/me');
    const trainerId = (trainerAuth.data as { user?: { id?: number } }).user?.id;
    if (trainerId && Array.isArray(trainerList) && trainerList.length > 0) {
      ok(
        'Trainer solo ve sus rutinas',
        trainerList.every((r) => Number(r.trainer_id) === trainerId)
      );
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
  const memberFinal = await api('GET', '/api/routines');
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

    const cronBadSecret = await api(
      'POST',
      '/api/settings/expiry/run',
      undefined,
      { 'x-cron-secret': 'definitely-wrong-cron-secret-value' }
    );
    ok('Cron con secret inválido → 403', cronBadSecret.res.status === 403);

    if (process.env.CRON_SECRET) {
      const cronOk = await api('POST', '/api/settings/expiry/run', undefined, {
        'x-cron-secret': process.env.CRON_SECRET,
      });
      ok('Cron con CRON_SECRET válido → 200', cronOk.res.status === 200);
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
