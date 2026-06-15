/**
 * Checklist: notificaciones (settings, test email, job vencimientos).
 * Requiere servidor en marcha y admin checklist.
 */
import 'dotenv/config';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const ADMIN_EMAIL = process.env.CHECKLIST_ADMIN_EMAIL ?? 'checklist-admin@test.local';
const ADMIN_PASSWORD = process.env.CHECKLIST_ADMIN_PASSWORD ?? 'ChecklistAdmin123!';

const MEMBER_EMAIL = `notify-${Date.now()}@test.local`;
const MEMBER_PASSWORD = 'NotifyMember123!';

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

async function jsonApi(method: string, path: string, body?: unknown) {
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

async function login(email: string, password: string) {
  cookie = '';
  const result = await jsonApi('POST', '/api/auth/login', { email, password });
  saveCookie(result.res);
  return result;
}

async function main() {
  console.log('=== Notificaciones checklist ===\n');

  const adminLogin = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  ok('Login admin', adminLogin.res.status === 200);

  cookie = '';
  const noAuth = await jsonApi('GET', '/api/settings/expiry');
  ok('Settings sin login → 401', noAuth.res.status === 401);

  await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  const settings = await jsonApi('GET', '/api/settings/expiry');
  const s = settings.data as {
    expiry_alert_days?: number;
    notify_payment_events?: boolean;
    notify_routine_assigned?: boolean;
    email_notifications_enabled?: boolean;
    providers?: { email: boolean; sms: boolean; whatsapp: boolean; whatsappProvider?: string | null };
  };
  ok('GET /api/settings/expiry', settings.res.status === 200);
  ok('Incluye expiry_alert_days', typeof s.expiry_alert_days === 'number');
  ok('Incluye notify_payment_events', typeof s.notify_payment_events === 'boolean');
  ok('Incluye providers', typeof s.providers === 'object');
  ok('Provider email es boolean', typeof s.providers?.email === 'boolean');

  const invalidTest = await jsonApi('POST', '/api/settings/notifications/test', {
    channel: 'email',
    target: 'no-es-email',
  });
  ok('Test email inválido → 400', invalidTest.res.status === 400);

  const testEmail = await jsonApi('POST', '/api/settings/notifications/test', {
    channel: 'email',
    target: ADMIN_EMAIL,
  });
  const te = testEmail.data as { success?: boolean; configured?: boolean; mock?: boolean; message?: string };
  ok('POST test email → 200', testEmail.res.status === 200);
  ok('Respuesta incluye configured', typeof te.configured === 'boolean');
  ok('Respuesta incluye mock', typeof te.mock === 'boolean');
  if (te.configured) {
    ok('SMTP configurado → success true', te.success === true);
  } else {
    ok('Sin SMTP → mock mode', te.mock === true && te.success === false);
  }

  const update = await jsonApi('PUT', '/api/settings/expiry', {
    notify_payment_events: true,
    notify_routine_assigned: true,
    notify_admin_new_payment: true,
    expiry_alert_days: 14,
  });
  const updated = update.data as { expiry_alert_days?: number; notify_payment_events?: boolean };
  ok('PUT settings', update.res.status === 200);
  ok('Persiste expiry_alert_days', updated.expiry_alert_days === 14);
  ok('Persiste notify_payment_events', updated.notify_payment_events === true);

  const job = await jsonApi('POST', '/api/settings/expiry/run', {});
  const jobData = job.data as { success?: boolean; result?: Record<string, unknown> };
  ok('POST expiry/run', job.res.status === 200 && jobData.success === true);
  ok('Job devuelve result', typeof jobData.result === 'object');

  cookie = '';
  await jsonApi('POST', '/api/auth/register', {
    full_name: 'Notify Member',
    email: MEMBER_EMAIL,
    password: MEMBER_PASSWORD,
    cedula: `V-${52000000 + Math.floor(Math.random() * 999999)}`,
  });

  await login(MEMBER_EMAIL, MEMBER_PASSWORD);
  const memberDenied = await jsonApi('POST', '/api/settings/notifications/test', {
    channel: 'email',
    target: MEMBER_EMAIL,
  });
  ok('Miembro no puede test notificaciones → 403', memberDenied.res.status === 403);

  console.log(`\n=== Resultado: ${passed} OK, ${failed} FAIL ===`);
  if (!te.configured) {
    console.log('\nNota: SMTP no configurado — en Dashboard verás modo mock.');
    console.log('      El test email se loguea en consola del servidor como [email:mock].');
  }
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
