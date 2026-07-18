/**
 * Smoke de contratos de paginación: verifica PaginatedResult vs ?all=1.
 *
 * Uso (servidor corriendo, cookie admin):
 *   BASE_URL=http://localhost:3000 npm run test:pagination-contracts
 */
import 'dotenv/config';

const BASE_URL = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

interface PaginatedShape {
  items?: unknown;
  total?: unknown;
  page?: unknown;
  pageSize?: unknown;
}

function isPaginated(data: unknown): data is PaginatedShape {
  if (!data || typeof data !== 'object') return false;
  const d = data as PaginatedShape;
  return Array.isArray(d.items) && typeof d.total === 'number' && typeof d.page === 'number';
}

async function login(): Promise<string | null> {
  const email = process.env.AUDIT_DEMO_EMAIL ?? 'admin@gym.com';
  const password = process.env.AUDIT_DEMO_PASSWORD ?? process.env.DEMO_PASSWORD ?? 'DemoAdmin123!';
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return null;
  const match = res.headers.get('set-cookie')?.match(/token=([^;]+)/);
  return match?.[1] ?? null;
}

async function getJson(path: string, token: string): Promise<{ status: number; data: unknown }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Cookie: `token=${token}` },
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

let failed = 0;

function ok(label: string, pass: boolean, detail = '') {
  const icon = pass ? '✓' : '✗';
  console.log(`${icon} ${label}${detail ? `: ${detail}` : ''}`);
  if (!pass) failed += 1;
}

console.log('=== Smoke contratos de paginación ===\n');
console.log(`Base URL: ${BASE_URL}`);

const token = await login();
if (!token) {
  console.warn('⚠ No se pudo autenticar — omite probes (define DEMO_PASSWORD / AUDIT_DEMO_*)');
  process.exit(0);
}

const exercisesPage = await getJson('/api/exercises?page=1&pageSize=20', token);
ok('GET /api/exercises paginado', exercisesPage.status === 200 && isPaginated(exercisesPage.data));

const exercisesAll = await getJson('/api/exercises?all=1', token);
ok(
  'GET /api/exercises?all=1 array',
  exercisesAll.status === 200 && Array.isArray(exercisesAll.data)
);

const routinesPage = await getJson('/api/routines?page=1&pageSize=20', token);
ok('GET /api/routines paginado', routinesPage.status === 200 && isPaginated(routinesPage.data));

const routinesAll = await getJson('/api/routines?all=1', token);
ok('GET /api/routines?all=1 array', routinesAll.status === 200 && Array.isArray(routinesAll.data));

const usersPage = await getJson('/api/users?page=1&pageSize=20', token);
ok('GET /api/users paginado', usersPage.status === 200 && isPaginated(usersPage.data));

const chatPage = await getJson('/api/chat/conversations?page=1&pageSize=20', token);
ok(
  'GET /api/chat/conversations paginado',
  chatPage.status === 200 && isPaginated(chatPage.data)
);

console.log(failed === 0 ? '\nPagination contracts: OK' : `\nPagination contracts: ${failed} fallo(s)`);
process.exit(failed === 0 ? 0 : 1);
