/**
 * Smoke tests against a running server.
 * Uso: npm run dev (otra terminal) && npm run test:smoke
 */
import 'dotenv/config';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD;
const KIOSK_KEY = process.env.KIOSK_API_KEY ?? process.env.VITE_KIOSK_KEY;

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

async function json(method: string, path: string, body?: unknown, headers?: Record<string, string>) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: unknown = text;
  try {
    data = JSON.parse(text);
  } catch {
    /* plain text */
  }
  return { res, data };
}

function extractTokenCookie(res: Response): string | undefined {
  const cookies = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  const fromArray = cookies.find((c) => c.startsWith('token='));
  if (fromArray) return fromArray.split(';')[0];

  const raw = res.headers.get('set-cookie');
  if (!raw) return undefined;
  const match = raw.match(/token=[^;]+/);
  return match?.[0];
}

async function main() {
  console.log(`Smoke tests → ${BASE}\n`);

  {
    const { res, data } = await json('GET', '/api/health');
    const payload = data as { status?: string; db?: string };
    assert('GET /api/health → 200', res.status === 200);
    assert('health status ok', payload.status === 'ok');
    assert('health db up', payload.db === 'up');
  }

  {
    const { res } = await json('POST', '/api/auth/login', {
      email: 'admin@gym.com',
      password: 'wrong-password',
    });
    assert('login inválido → 401', res.status === 401);
  }

  if (!DEMO_PASSWORD) {
    console.warn('\n  SKIP login/RBAC (DEMO_PASSWORD no definido en .env)\n');
  } else {
    const { res, data } = await json('POST', '/api/auth/login', {
      email: 'admin@gym.com',
      password: DEMO_PASSWORD,
    });
    const user = (data as { user?: { id?: unknown; role?: string } }).user;
    assert('login admin → 200', res.status === 200);
    assert('login admin id numérico', typeof user?.id === 'number');
    assert('login admin role', user?.role === 'admin');

    const cookie = extractTokenCookie(res);
    assert('login devuelve cookie token', Boolean(cookie));

    if (cookie) {
      const stats = await json('GET', '/api/stats/admin', undefined, { Cookie: cookie });
      assert('GET /api/stats/admin autenticado → 200', stats.res.status === 200);
    }
  }

  {
    const { res } = await json('GET', '/api/stats/admin');
    assert('stats sin sesión → 401', res.status === 401);
  }

  {
    const { res } = await json('POST', '/api/attendance/check-in', { cedula: 'V-11223344' });
    assert('check-in sin clave → 401', res.status === 401);
  }

  if (KIOSK_KEY) {
    const { res, data } = await json(
      'POST',
      '/api/attendance/check-in',
      { cedula: 'V-11223344' },
      { 'X-Kiosk-Key': KIOSK_KEY }
    );
    const ok = res.status === 200 || res.status === 400;
    assert('check-in con clave → 200 o 400', ok, `status ${res.status} ${JSON.stringify(data)}`);

    // Cerrar sesión abierta para no interferir con test:sprint5
    if (res.status === 200 && (data as { success?: boolean }).success) {
      await json(
        'POST',
        '/api/attendance/check-out',
        { cedula: 'V-11223344' },
        { 'X-Kiosk-Key': KIOSK_KEY }
      );
    }
  } else {
    console.warn('  SKIP check-in con clave (KIOSK_API_KEY no definido)\n');
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Smoke tests error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
