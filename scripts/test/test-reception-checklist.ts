/**
 * Checklist del rol recepcionista y panel de acceso por cédula.
 */
import 'dotenv/config';
import { resolveDemoPassword } from '../../src/lib/passwordPolicy.ts';
import { TestApiClient } from './lib/test-api-client.ts';

const RECEPTION_EMAIL = process.env.SMOKE_RECEPTION_EMAIL ?? 'receptionist@gym.com';
const RECEPTION_PASSWORD = process.env.SMOKE_RECEPTION_PASSWORD ?? resolveDemoPassword();
const MEMBER_CEDULA = process.env.SMOKE_MEMBER_CEDULA ?? 'V-11223344';

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
  console.log('=== Reception checklist ===\n');

  const login = await client.login(RECEPTION_EMAIL, RECEPTION_PASSWORD);
  if (login.status !== 200) {
    console.error(`No se pudo iniciar sesión como recepcionista (${RECEPTION_EMAIL}). Ejecuta npm run db:restore-demo`);
    process.exit(1);
  }
  ok('Login recepcionista', login.status === 200);

  const me = await client.json('GET', '/api/auth/me');
  ok('GET /api/auth/me → receptionist', me.status === 200 && (me.data as { user?: { role?: string } }).user?.role === 'receptionist');

  ok('Settings bloqueado para recepcionista (403)', (await client.json('GET', '/api/settings/expiry')).status === 403);

  const lookup = await client.json('GET', `/api/reception/lookup?cedula=${encodeURIComponent(MEMBER_CEDULA)}`);
  ok('Lookup por cédula demo member', lookup.status === 200 && (lookup.data as { found?: boolean }).found === true);

  ok('GET /api/attendance/inside', (await client.json('GET', '/api/attendance/inside')).status === 200);

  const stats = await client.json('GET', '/api/stats/reception');
  ok('GET /api/stats/reception', stats.status === 200 && typeof (stats.data as { todayCheckIns?: number }).todayCheckIns === 'number');

  const checkIn = await client.json('POST', '/api/reception/check-in', { cedula: MEMBER_CEDULA });
  ok('POST /api/reception/check-in', checkIn.status === 200 && (checkIn.data as { success?: boolean }).success === true);

  const lookupInside = await client.json('GET', `/api/reception/lookup?cedula=${encodeURIComponent(MEMBER_CEDULA)}`);
  ok('Lookup refleja ingreso activo', lookupInside.status === 200 && (lookupInside.data as { attendance?: { is_inside?: boolean } }).attendance?.is_inside === true);

  const checkOut = await client.json('POST', '/api/reception/check-out', { cedula: MEMBER_CEDULA });
  ok('POST /api/reception/check-out', checkOut.status === 200 && (checkOut.data as { success?: boolean }).success === true);

  const insideAfterCheckout = await client.json('GET', '/api/attendance/inside');
  const stillInside = Array.isArray((insideAfterCheckout.data as { members?: { cedula?: string }[] }).members)
    ? (insideAfterCheckout.data as { members: { cedula?: string }[] }).members.some(
        (m) => m.cedula?.toUpperCase() === MEMBER_CEDULA.toUpperCase()
      )
    : true;
  ok('Check-out remueve miembro de lista inside', insideAfterCheckout.status === 200 && !stillInside);

  ok('GET /api/payments como recepcionista', (await client.json('GET', '/api/payments')).status === 200);
  const usersRes = await client.json('GET', '/api/users?role=member');
  const usersPayload = usersRes.data as { items?: unknown[] } | unknown[];
  const memberList = Array.isArray(usersPayload) ? usersPayload : usersPayload.items;
  ok('GET /api/users miembros', usersRes.status === 200 && Array.isArray(memberList) && memberList.length > 0);

  const plans = await client.json('GET', '/api/memberships');
  const planId = Array.isArray(plans.data) && (plans.data as { id?: number }[])[0]?.id ? (plans.data as { id: number }[])[0].id : null;
  ok('GET /api/memberships para walk-in', plans.status === 200 && planId != null);

  if (planId) {
    const suffix = Date.now();
    const walkCedula = `V-${91000000 + (suffix % 999999)}`;
    const walkIn = await client.json('POST', '/api/reception/walk-in', {
      full_name: 'Cliente Walk-In Test',
      email: `walkin-${suffix}@test.local`,
      cedula: walkCedula,
      membership_id: planId,
      method: 'efectivo',
      check_in: true,
    });
    const w = walkIn.data as {
      success?: boolean;
      email_sent?: boolean;
      password_setup_url?: string;
      temporary_password?: string;
    };
    ok(
      'POST /api/reception/walk-in',
      walkIn.status === 201 &&
        w.success === true &&
        (w.email_sent === true || !!w.password_setup_url || !!w.temporary_password),
      walkIn.data.error as string | undefined
    );

    const walkLookup = await client.json('GET', `/api/reception/lookup?cedula=${encodeURIComponent(walkCedula)}`);
    ok(
      'Walk-in: lookup con membresía activa',
      walkLookup.status === 200 &&
        (walkLookup.data as { found?: boolean; subscription?: unknown }).found === true &&
        (walkLookup.data as { subscription?: unknown }).subscription != null
    );
  }

  const memberPage = await client.json('GET', '/api/users?role=member&pageSize=5');
  const sampleMember = Array.isArray((memberPage.data as { items?: unknown[] }).items)
    ? (memberPage.data as { items: { id?: number; cedula?: string }[] }).items[0]
    : null;
  ok('Miembro demo disponible para pagos', sampleMember?.id != null);

  if (sampleMember?.id && planId) {
    ok(
      'Assign sin payment_id bloqueado para recepcionista (400)',
      (await client.json('POST', '/api/memberships/assign', { user_id: sampleMember.id, membership_id: planId })).status === 400
    );

    const registerPayment = await client.json('POST', '/api/payments', {
      user_id: sampleMember.id,
      amount_usd: 10,
      method: 'efectivo_usd',
      reference: `TEST-${Date.now()}`,
    });
    ok('POST /api/payments con user_id (staff)', registerPayment.status === 200);

    const pendingId = (registerPayment.data as { id?: number }).id;
    if (pendingId) {
      ok('POST /api/payments/:id/approve como recepcionista', (await client.json('POST', `/api/payments/${pendingId}/approve`, { membership_id: planId })).status === 200);
      ok(
        'POST /api/memberships/assign con payment_id aprobado',
        (await client.json('POST', '/api/memberships/assign', { user_id: sampleMember.id, membership_id: planId, payment_id: pendingId })).status === 201
      );
    }
  }

  ok('GET /api/users/options para registrar pagos', (await client.json('GET', '/api/users/options?role=member')).status === 200);

  console.log(`\n=== Resultado: ${passed} OK, ${failed} FAIL ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
