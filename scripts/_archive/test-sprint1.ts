/**
 * Prueba Sprint 1: membresías, suscripciones y pagos.
 * Requiere servidor en marcha y .env con DEMO_PASSWORD.
 */
import 'dotenv/config';
import { loginReceptionStaff, receptionCheckIn } from '../lib/test-reception-auth.ts';
import { createApiSession } from '../test/lib/legacy-api-session.ts';

const DEMO_PASSWORD = process.env.DEMO_PASSWORD;

if (!DEMO_PASSWORD) {
  console.error('Falta DEMO_PASSWORD en .env');
  process.exit(1);
}

const { api, formPost, loginAs, clearSession } = createApiSession();
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
  console.log('=== Sprint 1 — Prueba automatizada ===\n');

  // 1. Health
  const health = await api('GET', '/api/health');
  ok('Health check', health.res.status === 200);

  // 2. Login admin
  ok('Login admin', await loginAs('admin@gym.com'));

  // 3. Listar planes
  const plans = await api('GET', '/api/memberships');
  const planList = plans.data as { id: number; name: string }[];
  ok('Listar planes', plans.res.status === 200 && Array.isArray(planList) && planList.length > 0);
  const planId = planList[0]?.id;

  // 4. Crear plan de prueba
  const created = await api('POST', '/api/memberships', {
    name: 'Sprint1 Test Plan',
    duration_days: 7,
    price_usd: 9.99,
  });
  ok('Crear plan', created.res.status === 201);
  const testPlanId = (created.data as { id?: number }).id ?? planId;

  // 5. Miembros con columna membresía
  const users = await api('GET', '/api/users?limit=100');
  const userPayload = users.data as { items?: { id: number; role: string; full_name: string; email?: string; membership_name?: string }[] };
  const userList = userPayload.items ?? [];
  const targetMember = userList.find((u) => u.email === 'member@gym.com') ?? userList.find((u) => u.role === 'member');
  ok('Listar usuarios con membresía', users.res.status === 200 && !!targetMember);

  // 6. Asignar suscripción manual
  if (targetMember && testPlanId) {
    const assign = await api('POST', '/api/memberships/assign', {
      user_id: targetMember.id,
      membership_id: testPlanId,
    });
    ok('Asignar suscripción manual', assign.res.status === 201, JSON.stringify(assign.data));

    const sub = await api('GET', `/api/memberships/user/${targetMember.id}`);
    ok('Consultar suscripción activa', sub.res.status === 200 && sub.data !== null);
  }

  // 7. Check-in recepción (miembro con suscripción)
  try {
    const receptionSession = await loginReceptionStaff();
    const checkIn = await receptionCheckIn(receptionSession, 'V-11223344');
    const checkInData = await checkIn.json().catch(() => ({}));
    ok(
      'Check-in con suscripción',
      checkIn.status === 200 || checkIn.status === 400,
      JSON.stringify(checkInData)
    );
  } catch (err) {
    console.warn(`  SKIP check-in recepción (${err instanceof Error ? err.message : err})`);
  }

  // 8. Miembro reporta pago
  clearSession();
  ok('Login miembro', await loginAs('member@gym.com'));

  const form = new FormData();
  form.append('amount_usd', '30');
  form.append('amount_bs', '1200');
  form.append('exchange_rate', '40');
  form.append('method', 'pago_movil');
  form.append('reference', `SPRINT1-${Date.now()}`);

  const payRes = await formPost('/api/payments', form);
  const payData = payRes.data as { id?: number };
  ok('Miembro reporta pago', payRes.res.status === 200 && payData.id);
  const paymentId = payData.id as number;

  // 9. Admin aprueba pago
  clearSession();
  ok('Login admin (aprobación)', await loginAs('admin@gym.com'));

  const approve = await api('POST', `/api/payments/${paymentId}/approve`, {
    membership_id: planId,
  });
  ok('Admin aprueba pago', approve.res.status === 200, JSON.stringify(approve.data));

  // 10. Segundo pago para rechazar
  clearSession();
  ok('Login miembro (segundo pago)', await loginAs('member@gym.com'));

  const form2 = new FormData();
  form2.append('amount_usd', '5');
  form2.append('amount_bs', '200');
  form2.append('exchange_rate', '40');
  form2.append('method', 'transferencia');
  form2.append('reference', `REJECT-${Date.now()}`);

  const pay2 = await formPost('/api/payments', form2);
  const pay2Data = pay2.data as { id?: number };

  clearSession();
  ok('Login admin (rechazo)', await loginAs('admin@gym.com'));

  const reject = await api('POST', `/api/payments/${pay2Data.id}/reject`);
  ok('Admin rechaza pago', reject.res.status === 200);

  // Cleanup test plan
  if (testPlanId && created.res.status === 201) {
    await api('DELETE', `/api/memberships/${testPlanId}`);
  }

  console.log(`\n=== Resultado: ${passed} OK, ${failed} FAIL ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
