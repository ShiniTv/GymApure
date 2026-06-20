/**
 * Checklist de auth con cuentas reales (no demo).
 * Requiere servidor en marcha: npm run dev
 */
import 'dotenv/config';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const ADMIN_EMAIL = process.env.CHECKLIST_ADMIN_EMAIL ?? 'checklist-admin@test.local';
const ADMIN_PASSWORD = process.env.CHECKLIST_ADMIN_PASSWORD ?? 'ChecklistAdmin123!';
const MEMBER_EMAIL = `checklist-member-${Date.now()}@test.local`;
const MEMBER_PASSWORD = 'ChecklistMember123!';
const MEMBER_CEDULA = `V-${90000000 + Math.floor(Math.random() * 999999)}`;

let cookie = '';
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

async function api(method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

function saveCookie(res: Response) {
  const cookies =
    typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  const fromArr = cookies.find((c) => c.startsWith('token='));
  if (fromArr) cookie = fromArr.split(';')[0];
}

async function main() {
  console.log('=== Auth checklist (cuentas reales) ===\n');

  // Bootstrap admin via API interna no existe — asumimos create-admin previo o registro bloqueado
  // Usamos registro + promoción no disponible; creamos admin con env si existe checklist seed
  const bootstrap = await api('POST', '/api/auth/login', {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });

  if (bootstrap.res.status !== 200) {
    console.error(
      `\nNo hay admin de checklist. Ejecuta primero:\n` +
        `  $env:ADMIN_EMAIL="${ADMIN_EMAIL}"; $env:ADMIN_PASSWORD="${ADMIN_PASSWORD}"; $env:ADMIN_FULL_NAME="Checklist Admin"; npm run db:create-admin\n`
    );
    process.exit(1);
  }

  ok('Login admin checklist', bootstrap.res.status === 200);
  saveCookie(bootstrap.res);

  const me = await api('GET', '/api/auth/me');
  ok('GET /api/auth/me', me.res.status === 200 && me.data.user?.role === 'admin');

  cookie = '';
  const dupRegister = await api('POST', '/api/auth/register', {
    full_name: 'Test Dup',
    email: MEMBER_EMAIL,
    password: MEMBER_PASSWORD,
    cedula: MEMBER_CEDULA,
  });
  ok('Registro miembro nuevo', dupRegister.res.status === 201);

  const dupAgain = await api('POST', '/api/auth/register', {
    full_name: 'Test Dup 2',
    email: MEMBER_EMAIL,
    password: MEMBER_PASSWORD,
    cedula: 'V-99999999',
  });
  ok('Rechaza email duplicado', dupAgain.res.status === 400);

  cookie = '';
  const memberLogin = await api('POST', '/api/auth/login', {
    email: MEMBER_EMAIL,
    password: MEMBER_PASSWORD,
  });
  ok('Login miembro registrado', memberLogin.res.status === 200);
  saveCookie(memberLogin.res);

  const newPass = `${MEMBER_PASSWORD}x`;
  const change = await api('POST', '/api/auth/change-password', {
    current_password: MEMBER_PASSWORD,
    new_password: newPass,
    confirm_password: newPass,
  });
  ok('Cambio de contraseña miembro', change.res.status === 200);

  cookie = '';
  const adminAgain = await api('POST', '/api/auth/login', {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  saveCookie(adminAgain.res);

  const staffEmail = `checklist-staff-${Date.now()}@test.local`;
  const createStaff = await api('POST', '/api/users', {
    full_name: 'Staff Checklist',
    email: staffEmail,
    password: 'StaffPass123!',
    cedula: `V-${80000000 + Math.floor(Math.random() * 999999)}`,
    role: 'member',
  });
  ok('Admin crea usuario con contraseña', createStaff.res.status === 201);

  cookie = '';
  const staffLogin = await api('POST', '/api/auth/login', {
    email: staffEmail,
    password: 'StaffPass123!',
  });
  ok('Login usuario creado por admin', staffLogin.res.status === 200);

  cookie = '';
  const badLogin = await api('POST', '/api/auth/login', {
    email: ADMIN_EMAIL,
    password: 'wrong-password',
  });
  ok('Login inválido → 401', badLogin.res.status === 401);

  cookie = '';
  const receptionLogin = await api('POST', '/api/auth/login', {
    email: process.env.SMOKE_RECEPTION_EMAIL ?? 'receptionist@gym.com',
    password: process.env.SMOKE_RECEPTION_PASSWORD ?? process.env.DEMO_PASSWORD ?? 'ChecklistAdmin123!',
  });
  if (receptionLogin.res.status === 200) {
    saveCookie(receptionLogin.res);
    ok('Login recepcionista demo', receptionLogin.data.user?.role === 'receptionist');
    const blocked = await api('GET', '/api/settings/expiry');
    ok('Recepcionista sin acceso a settings', blocked.res.status === 403);
    const receptionLookup = await api('GET', '/api/reception/lookup?cedula=V-11223344');
    ok('Recepcionista lookup cédula', receptionLookup.res.status === 200);
  } else {
    console.log('  SKIP recepcionista (ejecuta db:restore-demo para usuario receptionist@gym.com)');
  }

  console.log(`\n=== Resultado: ${passed} OK, ${failed} FAIL ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
