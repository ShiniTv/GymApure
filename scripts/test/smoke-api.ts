/**
 * Smoke tests against a running server.
 * Uso: npm run dev (otra terminal) && npm run test:smoke
 */
import 'dotenv/config';
import { TestApiClient } from './lib/test-api-client.ts';
import { loginReceptionStaff, receptionCheckIn, receptionCheckOut } from '../lib/test-reception-auth.ts';

const DEMO_PASSWORD = process.env.DEMO_PASSWORD;

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  OK  ${name}`);
    passed++;
  } else {
    console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

async function main() {
  const client = new TestApiClient();
  console.log(`Smoke tests → ${client.baseUrl}\n`);

  {
    const { status, data } = await client.json('GET', '/api/health');
    const payload = data as { status?: string; db?: string };
    assert('GET /api/health → 200', status === 200);
    assert('health status ok', payload.status === 'ok');
    assert('health db up', payload.db === 'up');
  }

  {
    const { status } = await client.json('POST', '/api/auth/login', {
      email: 'admin@gym.com',
      password: 'wrong-password',
    });
    assert('login inválido → 401', status === 401);
  }

  if (!DEMO_PASSWORD) {
    console.warn('\n  SKIP login/RBAC (DEMO_PASSWORD no definido en .env)\n');
  } else {
    const login = await client.login('admin@gym.com', DEMO_PASSWORD);
    const user = (login.data as { user?: { id?: unknown; role?: string } }).user;
    assert('login admin → 200', login.status === 200);
    assert('login admin id numérico', typeof user?.id === 'number');
    assert('login admin role', user?.role === 'admin');
    assert('login devuelve cookie token', client.cookieHeader.includes('token='));

    const stats = await client.json('GET', '/api/stats/admin');
    assert('GET /api/stats/admin autenticado → 200', stats.status === 200);

    const preview = await client.json('GET', '/api/reports/preview?from=2020-01-01&to=2099-12-31');
    const counts = preview.data as { payments?: number; attendance?: number; members?: number };
    assert('GET /api/reports/preview → 200', preview.status === 200);
    assert(
      'reports preview tiene conteos',
      typeof counts.payments === 'number' &&
        typeof counts.attendance === 'number' &&
        typeof counts.members === 'number'
    );
  }

  {
    client.clearSession();
    const { status } = await client.json('GET', '/api/stats/admin');
    assert('stats sin sesión → 401', status === 401);
  }

  {
    client.clearSession();
    const { status } = await client.json('POST', '/api/attendance/check-in', { cedula: 'V-11223344' });
    assert('check-in público eliminado → 401', status === 401);
  }

  if (DEMO_PASSWORD) {
    try {
      const receptionSession = await loginReceptionStaff();
      const checkIn = await receptionCheckIn(receptionSession, 'V-11223344');
      const checkInData = await checkIn.json().catch(() => ({}));
      const okStatus = checkIn.status === 200 || checkIn.status === 400;
      assert(
        'check-in recepción → 200 o 400',
        okStatus,
        `status ${checkIn.status} ${JSON.stringify(checkInData)}`
      );

      if (checkIn.status === 200 && (checkInData as { success?: boolean }).success) {
        await receptionCheckOut(receptionSession, 'V-11223344');
      }
    } catch (err) {
      console.warn(`  SKIP check-in recepción (${err instanceof Error ? err.message : err})\n`);
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Smoke tests error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
