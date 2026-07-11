/**
 * Checklist de auth con cuentas reales (no demo).
 * Requiere servidor en marcha: npm run dev
 */
import 'dotenv/config';
import { TestApiClient } from './lib/test-api-client.ts';

const ADMIN_EMAIL = process.env.CHECKLIST_ADMIN_EMAIL ?? 'checklist-admin@test.local';
const ADMIN_PASSWORD = process.env.CHECKLIST_ADMIN_PASSWORD ?? 'ChecklistAdmin123!';
const MEMBER_EMAIL = `checklist-member-${Date.now()}@test.local`;
const MEMBER_PASSWORD = 'ChecklistMember123!';
const MEMBER_CEDULA = `V-${90000000 + Math.floor(Math.random() * 999999)}`;

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

async function main() {
  console.log('=== Auth checklist (cuentas reales) ===\n');

  const bootstrap = await client.login(ADMIN_EMAIL, ADMIN_PASSWORD);
  if (bootstrap.status !== 200) {
    console.error(
      `\nNo hay admin de checklist. Ejecuta primero:\n` +
        `  ADMIN_EMAIL="${ADMIN_EMAIL}" ADMIN_PASSWORD="${ADMIN_PASSWORD}" ADMIN_FULL_NAME="Checklist Admin" npm run db:create-admin\n`
    );
    process.exit(1);
  }

  ok('Login admin checklist', bootstrap.status === 200);

  const me = await client.json('GET', '/api/auth/me');
  ok('GET /api/auth/me', me.status === 200 && (me.data as { user?: { role?: string } }).user?.role === 'admin');

  client.clearSession();
  const dupRegister = await client.json('POST', '/api/auth/register', {
    full_name: 'Test Dup',
    email: MEMBER_EMAIL,
    password: MEMBER_PASSWORD,
    cedula: MEMBER_CEDULA,
  });
  ok('Registro miembro nuevo', dupRegister.status === 201);

  const dupAgain = await client.json('POST', '/api/auth/register', {
    full_name: 'Test Dup 2',
    email: MEMBER_EMAIL,
    password: MEMBER_PASSWORD,
    cedula: 'V-99999999',
  });
  ok('Rechaza email duplicado', dupAgain.status === 400);

  client.clearSession();
  await client.login(MEMBER_EMAIL, MEMBER_PASSWORD);
  ok('Login miembro registrado', true);

  const newPass = `${MEMBER_PASSWORD}x`;
  const change = await client.json('POST', '/api/auth/change-password', {
    current_password: MEMBER_PASSWORD,
    new_password: newPass,
    confirm_password: newPass,
  });
  ok('Cambio de contraseña miembro', change.status === 200);

  const staleSession = await client.json('GET', '/api/auth/me');
  ok('Cookie invalidada tras cambio de contraseña', staleSession.status === 401);

  await client.login(MEMBER_EMAIL, newPass);
  ok('Re-login con nueva contraseña', true);

  const logoutRes = await client.json('POST', '/api/auth/logout');
  ok('Logout → 200', logoutRes.status === 200);
  const afterLogout = await client.json('GET', '/api/auth/me');
  ok('Cookie invalidada tras logout → 401', afterLogout.status === 401);

  await client.login(ADMIN_EMAIL, ADMIN_PASSWORD);
  const staffEmail = `checklist-staff-${Date.now()}@test.local`;
  const createStaff = await client.json('POST', '/api/users', {
    full_name: 'Staff Checklist',
    email: staffEmail,
    password: 'StaffPass123!',
    cedula: `V-${80000000 + Math.floor(Math.random() * 999999)}`,
    role: 'member',
  });
  ok('Admin crea usuario con contraseña', createStaff.status === 201);

  client.clearSession();
  const staffLogin = await client.login(staffEmail, 'StaffPass123!');
  ok('Login usuario creado por admin', staffLogin.status === 200);

  client.clearSession();
  const badLogin = await client.login(ADMIN_EMAIL, 'wrong-password');
  ok('Login inválido → 401', badLogin.status === 401);

  const lockoutEmail = `lockout-test-${Date.now()}@test.local`;
  for (let i = 1; i <= 3; i++) {
    client.clearSession();
    const attempt = await client.login(lockoutEmail, 'wrong-password');
    ok(`${i}er intento fallido → 401`, attempt.status === 401);
  }
  client.clearSession();
  const lockBlocked = await client.login(lockoutEmail, 'wrong-password');
  ok('4to intento tras 3 fallos → 429', lockBlocked.status === 429);

  client.clearSession();
  const receptionLogin = await client.login(
    process.env.SMOKE_RECEPTION_EMAIL ?? 'receptionist@gym.com',
    process.env.SMOKE_RECEPTION_PASSWORD ?? process.env.DEMO_PASSWORD?.trim() ?? 'ChecklistAdmin123!'
  );
  if (receptionLogin.status === 200) {
    ok('Login recepcionista demo', (receptionLogin.data as { user?: { role?: string } }).user?.role === 'receptionist');
    const blocked = await client.json('GET', '/api/settings/expiry');
    ok('Recepcionista sin acceso a settings', blocked.status === 403);
    const receptionLookup = await client.json('GET', '/api/reception/lookup?cedula=V-11223344');
    ok('Recepcionista lookup cédula', receptionLookup.status === 200);
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
