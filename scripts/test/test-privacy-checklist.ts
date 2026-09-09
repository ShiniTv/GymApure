/**
 * Checklist DSR / privacidad: export + delete-account.
 * Requiere servidor en marcha y DEMO_PASSWORD (member@gym.com).
 */
import { loadEnvForScripts } from '../dev/load-env-file.ts';

loadEnvForScripts();

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? '';
const MEMBER_EMAIL = process.env.PRIVACY_MEMBER_EMAIL ?? 'member@gym.com';

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

async function api(method: string, path: string, body?: unknown) {
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

function cookiePair(entry: string): { name: string; value: string } | null {
  const first = entry.split(';')[0];
  const eq = first.indexOf('=');
  if (eq <= 0) return null;
  return { name: first.slice(0, eq), value: first.slice(eq + 1) };
}

function saveCookie(res: Response) {
  const cookies =
    typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  if (!cookies.length) return;

  const jar = new Map<string, string>();
  for (const part of cookie.split('; ').filter(Boolean)) {
    const eq = part.indexOf('=');
    if (eq > 0) jar.set(part.slice(0, eq), part.slice(eq + 1));
  }

  for (const entry of cookies) {
    const pair = cookiePair(entry);
    if (!pair) continue;
    if (pair.name === 'token' || pair.name === 'csrf_token') {
      if (!pair.value) {
        jar.delete(pair.name);
        if (pair.name === 'csrf_token') csrfToken = '';
      } else {
        jar.set(pair.name, pair.value);
        if (pair.name === 'csrf_token') csrfToken = decodeURIComponent(pair.value);
      }
    }
  }

  cookie = [...jar.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
}

async function main() {
  console.log('=== Privacy / DSR checklist ===\n');

  if (!DEMO_PASSWORD || DEMO_PASSWORD.length < 12) {
    console.error('DEMO_PASSWORD (mín. 12) requerido en .env.dev');
    process.exit(1);
  }

  const unauth = await api('GET', '/api/me/data-export');
  ok('export sin sesión → 401', unauth.res.status === 401);

  const login = await api('POST', '/api/auth/login', {
    email: MEMBER_EMAIL,
    password: DEMO_PASSWORD,
  });
  saveCookie(login.res);
  ok('login member demo', login.res.status === 200, `status=${login.res.status}`);
  if (login.res.status !== 200) {
    console.error('Seed demo: npm run db:restore-demo');
    process.exit(1);
  }

  const me = await api('GET', '/api/auth/me');
  saveCookie(me.res);
  const memberId = (me.data as { user?: { id?: number } }).user?.id;
  ok('sesión member', typeof memberId === 'number');

  const exportRes = await api('GET', '/api/me/data-export');
  const exportBody = exportRes.data as {
    subject_user_id?: number;
    profile?: { email?: string; password?: string };
  };
  ok('data-export 200', exportRes.res.status === 200, `status=${exportRes.res.status}`);
  ok(
    'export subject = caller',
    exportBody.subject_user_id === memberId,
    `got ${exportBody.subject_user_id}`
  );
  ok('export sin password hash', !exportBody.profile || exportBody.profile.password === undefined);

  const badDelete = await api('POST', '/api/me/delete-account', {});
  ok('delete sin confirm → 400', badDelete.res.status === 400);

  // Dedicated disposable member so demo member@gym.com stays usable for other suites.
  const stamp = Date.now();
  const email = `privacy-delete-${stamp}@test.local`;
  const password = 'PrivacyDelete123!';
  const cedula = `V-${80000000 + Math.floor(Math.random() * 999999)}`;

  cookie = '';
  csrfToken = '';
  const adminLogin = await api('POST', '/api/auth/login', {
    email: process.env.CHECKLIST_ADMIN_EMAIL ?? 'checklist-admin@test.local',
    password: process.env.CHECKLIST_ADMIN_PASSWORD ?? 'ChecklistAdmin123!',
  });
  saveCookie(adminLogin.res);

  let createdId: number | null = null;
  if (adminLogin.res.status === 200) {
    const create = await api('POST', '/api/users', {
      email,
      password,
      full_name: 'Privacy Delete Probe',
      role: 'member',
      cedula,
    });
    saveCookie(create.res);
    createdId = (create.data as { id?: number }).id ?? null;
    ok('crear miembro disposable', create.res.status === 201 || create.res.status === 200, `status=${create.res.status}`);
  } else {
    // Fallback: public register if allowed
    const reg = await api('POST', '/api/auth/register', {
      email,
      password,
      full_name: 'Privacy Delete Probe',
      cedula,
    });
    saveCookie(reg.res);
    ok('registro disposable', reg.res.status === 200 || reg.res.status === 201, `status=${reg.res.status}`);
  }

  cookie = '';
  csrfToken = '';
  const disposableLogin = await api('POST', '/api/auth/login', { email, password });
  saveCookie(disposableLogin.res);
  ok('login disposable', disposableLogin.res.status === 200, `status=${disposableLogin.res.status}`);

  const me2 = await api('GET', '/api/auth/me');
  saveCookie(me2.res);
  createdId = (me2.data as { user?: { id?: number } }).user?.id ?? createdId;

  const del = await api('POST', '/api/me/delete-account', { confirm: true });
  ok('delete-account 200', del.res.status === 200, `status=${del.res.status}`);

  cookie = '';
  csrfToken = '';
  const relogin = await api('POST', '/api/auth/login', { email, password });
  ok('relogin tras delete falla', relogin.res.status === 401 || relogin.res.status === 403);

  console.log(`\n=== Resultado: ${passed} OK, ${failed} FAIL ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
