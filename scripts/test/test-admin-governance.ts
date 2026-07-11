/**
 * Checklist de gobernanza admin: status, MFA staff, roles, reportes, nutrición API.
 * Requiere servidor en marcha, DEMO_PASSWORD y npm run db:restore-demo.
 */
import 'dotenv/config';
import { generateSync } from 'otplib';

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

async function enableMfaForCurrentUser(): Promise<boolean> {
  const status = await api('GET', '/api/auth/mfa/status');
  if ((status.data as { mfa_enabled?: boolean }).mfa_enabled) return true;

  const setup = await api('POST', '/api/auth/mfa/setup');
  if (setup.res.status !== 200) return false;
  const secret = (setup.data as { secret?: string }).secret;
  if (!secret) return false;
  const code = generateSync({ secret });
  const enable = await api('POST', '/api/auth/mfa/enable', { code });
  return enable.res.status === 200;
}

async function main() {
  console.log('=== Admin governance checklist ===\n');

  if (!DEMO_PASSWORD) {
    console.error('Falta DEMO_PASSWORD en .env');
    process.exit(1);
  }

  // --- Status validation ---
  {
    cookie = '';
    ok('Login admin', await loginAs('admin@gym.com'));

    const me = await api('GET', '/api/auth/me');
    const adminId = (me.data as { user?: { id?: number } }).user?.id;

    const invalidStatus = await api('PATCH', `/api/users/999999/status`, { status: 'banned' });
    ok('Status inválido → 400', invalidStatus.res.status === 400);

    if (adminId) {
      const selfSuspend = await api('PATCH', `/api/users/${adminId}/status`, {
        status: 'inactive',
      });
      ok('Admin no puede suspenderse a sí mismo → 403', selfSuspend.res.status === 403);

      ok('Activar MFA para crear segundo admin', await enableMfaForCurrentUser());
      const secondAdminEmail = `second-admin-${Date.now()}@test.local`;
      const createAdmin = await api('POST', '/api/users', {
        full_name: 'Second Admin',
        email: secondAdminEmail,
        password: 'SecondAdmin123!',
        cedula: `V-${85000000 + Math.floor(Math.random() * 999999)}`,
        role: 'admin',
      });
      const secondAdminId = (createAdmin.data as { id?: number }).id;
      ok('Crear segundo admin con MFA → 201', createAdmin.res.status === 201);

      if (secondAdminId) {
        const suspendAdmin = await api('PATCH', `/api/users/${secondAdminId}/status`, {
          status: 'inactive',
        });
        ok('No se puede suspender administrador → 403', suspendAdmin.res.status === 403);
      }
    }
  }

  // --- MFA required for staff creation ---
  {
    cookie = '';
    ok('Login admin sin MFA previo', await loginAs('admin@gym.com'));

    const staffBlocked = await api('POST', '/api/users', {
      full_name: 'Staff Blocked',
      email: `staff-blocked-${Date.now()}@test.local`,
      password: 'StaffBlock123!',
      cedula: `V-${81000000 + Math.floor(Math.random() * 999999)}`,
      role: 'receptionist',
    });
    ok(
      'Crear staff sin MFA → 403',
      staffBlocked.res.status === 403,
      `status ${staffBlocked.res.status}`
    );

    const memberOk = await api('POST', '/api/users', {
      full_name: 'Member OK',
      email: `member-ok-${Date.now()}@test.local`,
      password: 'MemberOk123!',
      cedula: `V-${82000000 + Math.floor(Math.random() * 999999)}`,
      role: 'member',
    });
    ok('Crear miembro sin MFA → 201', memberOk.res.status === 201);

    ok('Activar MFA para admin de prueba', await enableMfaForCurrentUser());

    const staffOk = await api('POST', '/api/users', {
      full_name: 'Staff OK',
      email: `staff-ok-${Date.now()}@test.local`,
      password: 'StaffOk123!',
      cedula: `V-${83000000 + Math.floor(Math.random() * 999999)}`,
      role: 'receptionist',
    });
    ok(
      'Crear staff con MFA activo → 201',
      staffOk.res.status === 201,
      `status ${staffOk.res.status}`
    );
  }

  // --- Role change endpoint ---
  {
    cookie = '';
    ok('Login admin con MFA', await loginAs('admin@gym.com'));
    await enableMfaForCurrentUser();

    const me = await api('GET', '/api/auth/me');
    const adminId = (me.data as { user?: { id?: number } }).user?.id;

    const tempEmail = `role-change-${Date.now()}@test.local`;
    const createMember = await api('POST', '/api/users', {
      full_name: 'Role Change Target',
      email: tempEmail,
      password: 'RoleChange123!',
      cedula: `V-${84000000 + Math.floor(Math.random() * 999999)}`,
      role: 'member',
    });
    const targetId = (createMember.data as { id?: number }).id;

    if (targetId && adminId) {
      const selfRole = await api('PATCH', `/api/users/${adminId}/role`, { role: 'member' });
      ok('No cambiar propio rol → 403', selfRole.res.status === 403);

      const promote = await api('PATCH', `/api/users/${targetId}/role`, { role: 'trainer' });
      ok('Promover miembro a trainer → 200', promote.res.status === 200);

      const demoteAdmin = await api('PATCH', `/api/users/${adminId}/role`, { role: 'member' });
      ok('No degradar último admin → 403', demoteAdmin.res.status === 403);
    }
  }

  // --- Reports restricted to admin ---
  {
    cookie = '';
    ok('Login member', await loginAs('member@gym.com'));
    const memberExport = await api('GET', '/api/reports/members');
    ok('Member no exporta reportes → 403', memberExport.res.status === 403);
  }

  // --- Admin nutrition read (API) ---
  {
    cookie = '';
    ok('Login admin', await loginAs('admin@gym.com'));
    const memberList = await api('GET', '/api/users?role=member&pageSize=1');
    const memberId = (memberList.data as { items?: { id?: number }[] }).items?.[0]?.id;

    if (memberId) {
      const planRead = await api('GET', `/api/users/${memberId}/nutrition/plan`);
      ok(
        'Admin puede leer plan nutricional (200 o 404)',
        planRead.res.status === 200 || planRead.res.status === 404,
        `status ${planRead.res.status}`
      );

      const planWrite = await api('PUT', `/api/users/${memberId}/nutrition/plan`, {
        title: 'Blocked by admin',
        calories_target: 2000,
        protein_target_g: 150,
        carbs_target_g: 200,
        fat_target_g: 65,
      });
      ok('Admin no puede editar plan → 403', planWrite.res.status === 403);
    }
  }

  console.log(`\n=== Resultado: ${passed} OK, ${failed} FAIL ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
