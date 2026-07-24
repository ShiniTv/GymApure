/**
 * Verifica el flujo de asignación de rutinas (entrenador → miembro).
 * Uso: npm run test:routine-assign (servidor en marcha)
 */
import { loadEnvForScripts } from '../dev/load-env-file.ts';

loadEnvForScripts();

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const PASS = process.env.DEMO_PASSWORD ?? 'DemoPassword123!';

interface Session {
  cookie: string;
  csrfToken: string;
}

function parseSetCookies(res: Response): { token?: string; csrf?: string } {
  const cookies =
    typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  const raw = cookies.length > 0 ? cookies.join(', ') : (res.headers.get('set-cookie') ?? '');

  const token = raw.match(/token=([^;,]+)/)?.[1];
  const csrf = raw.match(/csrf_token=([^;,]+)/)?.[1];

  return {
    token: token ? decodeURIComponent(token) : undefined,
    csrf: csrf ? decodeURIComponent(csrf) : undefined,
  };
}

async function login(email: string): Promise<Session> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASS }),
  });
  const data = (await res.json()) as { error?: string };
  const { token, csrf } = parseSetCookies(res);
  if (!res.ok || !token || !csrf) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(data)}`);
  }
  return {
    cookie: `token=${token}; csrf_token=${encodeURIComponent(csrf)}`,
    csrfToken: csrf,
  };
}

async function api(
  path: string,
  session: Session,
  method = 'GET',
  body?: unknown
): Promise<{ status: number; data: Record<string, unknown> & { items?: unknown[]; email?: string }[] }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Cookie: session.cookie,
  };
  if (method !== 'GET' && method !== 'HEAD') {
    headers['x-csrf-token'] = session.csrfToken;
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & {
    items?: unknown[];
    email?: string;
  }[];
  return { status: res.status, data };
}

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

async function main() {
  console.log(`Verificación asignación rutinas → ${BASE}\n`);
  const trainerSession = await login('trainer@gym.com');

  const options = await api('/api/users/options?role=member', trainerSession);
  ok('GET /api/users/options → 200', options.status === 200);
  ok('options devuelve array', Array.isArray(options.data));
  const optionList = options.data as unknown as { email?: string; id?: number }[];
  ok(
    'options incluye member@gym.com',
    optionList.some((m) => m.email === 'member@gym.com'),
    JSON.stringify(optionList)
  );

  const members = await api('/api/users?role=member&limit=20', trainerSession);
  ok('GET /api/users trainer → 200', members.status === 200);
  const memberItems = (members.data as unknown as { items?: unknown[] }).items;
  ok('lista trainer incluye miembros', (memberItems?.length ?? 0) > 0, JSON.stringify(members.data));

  const memberId = optionList.find((m) => m.email === 'member@gym.com')?.id;
  ok('member id resuelto', memberId != null);

  if (memberId) {
    const profile = await api(`/api/users/${memberId}`, trainerSession);
    ok('GET /api/users/:id trainer → 200', profile.status === 200, String(profile.status));
  }

  const routines = await api('/api/routines?all=1', trainerSession);
  ok('GET /api/routines trainer → 200', routines.status === 200);
  const routineList = routines.data as unknown as { id?: number }[];
  const routineId = Array.isArray(routineList) ? routineList[0]?.id : undefined;
  ok('trainer tiene rutinas', routineId != null);

  if (memberId && routineId) {
    const assign = await api(`/api/users/${memberId}/routines`, trainerSession, 'POST', {
      routine_id: routineId,
      start_date: '2026-07-12',
      end_date: '2026-08-12',
    });
    ok('POST assign rutina → 200', assign.status === 200, JSON.stringify(assign.data));

    const badAssign = await api(`/api/users/${memberId}/routines`, trainerSession, 'POST', {
      routine_id: 999999,
      start_date: '2026-07-12',
      end_date: '2026-08-12',
    });
    ok('POST rutina inexistente → 403', badAssign.status === 403);
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
