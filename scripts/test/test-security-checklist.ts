/**
 * Checklist de seguridad (Fases 1–3): kiosk eliminado, sesiones, IDOR trainers, rutinas.
 */
import 'dotenv/config';
import { TestApiClient } from './lib/test-api-client.ts';

const DEMO_PASSWORD = process.env.DEMO_PASSWORD;
const client = new TestApiClient();
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

async function loginAs(email: string, password = DEMO_PASSWORD!) {
  client.clearSession();
  const login = await client.login(email, password);
  return login.status === 200;
}

async function main() {
  console.log('=== Security checklist (Fases 1–3) ===\n');

  if (!DEMO_PASSWORD) {
    console.error('Falta DEMO_PASSWORD en .env');
    process.exit(1);
  }

  {
    client.clearSession();
    const checkIn = await client.json('POST', '/api/attendance/check-in', { cedula: 'V-11223344' });
    ok('POST /api/attendance/check-in sin sesión → 401', checkIn.status === 401);

    const checkOut = await client.json('POST', '/api/attendance/check-out', { cedula: 'V-11223344' });
    ok('POST /api/attendance/check-out sin sesión → 401', checkOut.status === 401);

    const kioskHeader = await client.json(
      'POST',
      '/api/attendance/check-in',
      { cedula: 'V-11223344' },
      { extraHeaders: { 'X-Kiosk-Key': 'fake-kiosk-key-should-not-work' } }
    );
    ok('Kiosk header ignorado → sigue 401', kioskHeader.status === 401);
  }

  ok('Login admin', await loginAs('admin@gym.com'));

  const adminRoutinesRes = await client.json('GET', '/api/routines');
  ok('Admin GET /api/routines → 200', adminRoutinesRes.status === 200);
  const adminRoutineList = adminRoutinesRes.data as unknown[];

  client.clearSession();
  ok('Login member demo', await loginAs('member@gym.com'));
  const memberProfile = await client.json('GET', '/api/auth/me');
  const memberId = (memberProfile.data as { user?: { id?: number } }).user?.id;

  if (memberId) {
    const memberRoutines = await client.json('GET', '/api/routines');
    const memberList = memberRoutines.data as { id?: number; name?: string }[];
    ok('Member GET /api/routines → 200', memberRoutines.status === 200);
    ok('Member solo ve rutinas asignadas (array)', Array.isArray(memberList));
    ok(
      'Member tiene rutina demo asignada',
      Array.isArray(memberList) && memberList.some((r) => r.name === 'Demo CI Routine')
    );

    ok('Login admin para crear miembro aislado', await loginAs('admin@gym.com'));
    const isolatedEmail = `security-isolated-${Date.now()}@test.local`;
    const createIsolated = await client.json('POST', '/api/users', {
      full_name: 'Isolated Member',
      email: isolatedEmail,
      password: 'IsolatedPass123!',
      cedula: `V-${70000000 + Math.floor(Math.random() * 999999)}`,
      role: 'member',
    });
    ok('Admin crea miembro sin rutina', createIsolated.status === 201);
    const isolatedId = (createIsolated.data as { id?: number }).id;

    ok('Login trainer demo', await loginAs('trainer@gym.com'));

    if (isolatedId) {
      const blockedProfile = await client.json('GET', `/api/users/${isolatedId}`);
      ok('Trainer sin acceso a miembro no asignado → 403', blockedProfile.status === 403);
    }

    const allowedProfile = await client.json('GET', `/api/users/${memberId}`);
    ok('Trainer accede a miembro con rutina asignada → 200', allowedProfile.status === 200);

    const trainerRoutines = await client.json('GET', '/api/routines');
    const trainerList = trainerRoutines.data as { trainer_id?: number }[];
    const trainerAuth = await client.json('GET', '/api/auth/me');
    const trainerId = (trainerAuth.data as { user?: { id?: number } }).user?.id;
    if (trainerId && Array.isArray(trainerList) && trainerList.length > 0) {
      ok('Trainer solo ve sus rutinas', trainerList.every((r) => Number(r.trainer_id) === trainerId));
    }
  } else {
    console.log('  SKIP IDOR/rutinas (member@gym.com no encontrado — db:restore-demo)');
  }

  {
    client.clearSession();
    ok('Login member (sesión A)', await loginAs('member@gym.com'));
    const cookieA = client.cookieHeader;

    client.clearSession();
    ok('Login member (sesión B)', await loginAs('member@gym.com'));
    const cookieB = client.cookieHeader;

    const staleAfterDualLogin = await client.json('GET', '/api/auth/me', undefined, {
      extraHeaders: { Cookie: cookieA },
    });
    ok('Sesión A invalidada tras login en otro dispositivo → 401', staleAfterDualLogin.status === 401);

    const activeSession = await client.json('GET', '/api/auth/me', undefined, {
      extraHeaders: { Cookie: cookieB },
    });
    ok('Sesión B activa tras segundo login → 200', activeSession.status === 200);
  }

  ok('Login admin para status', await loginAs('admin@gym.com'));
  const tempEmail = `security-status-${Date.now()}@test.local`;
  const createTemp = await client.json('POST', '/api/users', {
    full_name: 'Status Test User',
    email: tempEmail,
    password: 'StatusPass123!',
    cedula: `V-${60000000 + Math.floor(Math.random() * 999999)}`,
    role: 'member',
  });
  ok('Admin crea usuario temporal', createTemp.status === 201);
  const tempId = (createTemp.data as { id?: number }).id;

  client.clearSession();
  ok('Login usuario temporal', await loginAs(tempEmail, 'StatusPass123!'));
  const tempCookie = client.cookieHeader;
  ok('Sesión activa antes de suspender', (await client.json('GET', '/api/auth/me')).status === 200);

  ok('Login admin para suspender', await loginAs('admin@gym.com'));
  if (tempId) {
    const suspend = await client.json('PATCH', `/api/users/${tempId}/status`, { status: 'inactive' });
    ok('Admin suspende usuario → 200', suspend.status === 200);
  }

  const staleSession = await client.json('GET', '/api/auth/me', undefined, {
    extraHeaders: { Cookie: tempCookie },
  });
  ok('Cookie invalidada tras cambio de status', staleSession.status === 403, `status ${staleSession.status}`);

  ok('Login admin para reactivar', await loginAs('admin@gym.com'));
  if (tempId) {
    await client.json('PATCH', `/api/users/${tempId}/status`, { status: 'active' });
  }

  ok('Login member final', await loginAs('member@gym.com'));
  const memberFinalList = (await client.json('GET', '/api/routines')).data as unknown[];
  if (Array.isArray(adminRoutineList) && Array.isArray(memberFinalList)) {
    ok('Admin ve al menos tantas rutinas como el miembro', adminRoutineList.length >= memberFinalList.length);
  }

  {
    client.clearSession();
    const publicHealth = await client.json('GET', '/api/health');
    const healthPayload = publicHealth.data as { allowPublicRegister?: boolean; email?: unknown };
    ok('GET /api/health público → 200', publicHealth.status === 200);
    ok('Health público no expone allowPublicRegister', healthPayload.allowPublicRegister === undefined);
    ok('Health público no expone email config', healthPayload.email === undefined);

    ok('GET /api/auth/config → 200', (await client.json('GET', '/api/auth/config')).status === 200);

    const cronNoSecret = await client.json('POST', '/api/settings/expiry/run');
    ok('Cron sin secret ni sesión → 403', cronNoSecret.status === 403);

    const cronBadSecret = await client.json('POST', '/api/settings/expiry/run', undefined, {
      extraHeaders: { 'x-cron-secret': 'definitely-wrong-cron-secret-value' },
    });
    ok('Cron con secret inválido → 403', cronBadSecret.status === 403);

    if (process.env.CRON_SECRET) {
      const cronOk = await client.json('POST', '/api/settings/expiry/run', undefined, {
        extraHeaders: { 'x-cron-secret': process.env.CRON_SECRET },
      });
      ok('Cron con CRON_SECRET válido → 200', cronOk.status === 200);
    }

    ok('Login admin para CSRF', await loginAs('admin@gym.com'));
    ok('Login establece cookie csrf_token', client.csrf.length > 0);

    const csrfBlocked = await client.json(
      'POST',
      '/api/users',
      {
        full_name: 'CSRF Block Test',
        email: `csrf-block-${Date.now()}@test.local`,
        password: 'CsrfBlock123!',
        cedula: `V-${80000000 + Math.floor(Math.random() * 999999)}`,
        role: 'member',
      },
      { skipCsrf: true }
    );
    ok('POST protegido sin X-CSRF-Token → 403', csrfBlocked.status === 403);

    if (process.env.CORS_ORIGINS?.trim()) {
      const allowed = process.env.CORS_ORIGINS.split(',')[0]?.trim();
      const corsRes = await fetch(`${client.baseUrl}/api/health`, {
        headers: { Origin: 'https://evil.example.test' },
      });
      ok(
        'CORS: origen no permitido no recibe Access-Control-Allow-Origin',
        corsRes.headers.get('Access-Control-Allow-Origin') !== 'https://evil.example.test'
      );
      if (allowed) {
        const allowedRes = await fetch(`${client.baseUrl}/api/health`, { headers: { Origin: allowed } });
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
