/**
 * Checklist: chat in-app (conversaciones, mensajes, unread).
 * Requiere servidor en marcha y admin checklist.
 */
import { loadEnvForScripts } from '../dev/load-env-file.ts';

loadEnvForScripts();

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const ADMIN_EMAIL = process.env.CHECKLIST_ADMIN_EMAIL ?? 'checklist-admin@test.local';
const ADMIN_PASSWORD = process.env.CHECKLIST_ADMIN_PASSWORD ?? 'ChecklistAdmin123!';

const MEMBER_EMAIL = `chat-${Date.now()}@test.local`;
const MEMBER_PASSWORD = 'ChatMember123!';

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
  console.log('=== Chat checklist ===\n');

  const adminLogin = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  ok('Login admin', adminLogin.res.status === 200);

  cookie = '';
  const noAuth = await jsonApi('GET', '/api/chat/unread-count');
  ok('Chat sin login → 401', noAuth.res.status === 401);

  await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  const unread = await jsonApi('GET', '/api/chat/unread-count');
  ok('GET /api/chat/unread-count', unread.res.status === 200);
  ok('count es número', typeof (unread.data as { count?: number }).count === 'number');

  const settings = await jsonApi('GET', '/api/settings/expiry');
  const s = settings.data as { expiry_alert_days?: number; notify_payment_events?: unknown };
  ok('GET /api/settings/expiry', settings.res.status === 200);
  ok('Solo expiry_alert_days', typeof s.expiry_alert_days === 'number' && s.notify_payment_events === undefined);

  cookie = '';
  await jsonApi('POST', '/api/auth/register', {
    full_name: 'Chat Member',
    email: MEMBER_EMAIL,
    password: MEMBER_PASSWORD,
    cedula: `V-${53000000 + Math.floor(Math.random() * 999999)}`,
  });

  await login(MEMBER_EMAIL, MEMBER_PASSWORD);
  const mine = await jsonApi('GET', '/api/chat/conversations/mine');
  const mineData = mine.data as { id?: number; member_id?: number };
  ok('Miembro GET /conversations/mine', mine.res.status === 200);
  ok('Conversación creada', Number.isFinite(Number(mineData.id)));

  const conversationId = Number(mineData.id);
  const memberMsg = await jsonApi('POST', `/api/chat/conversations/${conversationId}/messages`, {
    body: 'Hola, tengo una consulta sobre mi membresía.',
  });
  ok('Miembro envía mensaje', memberMsg.res.status === 201, `status ${memberMsg.res.status} ${JSON.stringify(memberMsg.data)}`);

  await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  const unreadAfter = await jsonApi('GET', '/api/chat/unread-count');
  ok('Staff tiene unread > 0', ((unreadAfter.data as { count?: number }).count ?? 0) > 0);

  const list = await jsonApi('GET', '/api/chat/conversations');
  const items = (list.data as { items?: { id: number; member_id: number }[] }).items ?? [];
  ok('GET /api/chat/conversations', list.res.status === 200);
  ok('Lista incluye conversación del miembro', items.some((i) => i.member_id === mineData.member_id));

  const convo = items.find((i) => i.id === mineData.id) ?? items[0];
  if (convo) {
    const staffMsg = await jsonApi('POST', `/api/chat/conversations/${convo.id}/messages`, {
      body: 'Hola, te respondemos en breve.',
    });
    ok('Staff responde', staffMsg.res.status === 201);

    const staffMsgData = staffMsg.data as { id?: number; body?: string };
    if (staffMsgData.id) {
      const edited = await jsonApi(
        'PATCH',
        `/api/chat/conversations/${convo.id}/messages/${staffMsgData.id}`,
        { body: 'Mensaje editado por staff.' }
      );
      ok(
        'Staff edita su mensaje',
        edited.res.status === 200 &&
          (edited.data as { body?: string }).body === 'Mensaje editado por staff.',
        `status ${edited.res.status} ${JSON.stringify(edited.data)}`
      );

      const deleted = await jsonApi(
        'DELETE',
        `/api/chat/conversations/${convo.id}/messages/${staffMsgData.id}`
      );
      ok('Staff elimina su mensaje', deleted.res.status === 200, `status ${deleted.res.status}`);
    }

    const read = await jsonApi('POST', `/api/chat/conversations/${convo.id}/read`, {});
    ok('Staff marca leído', read.res.status === 200);
  }

  const job = await jsonApi('POST', '/api/settings/expiry/run', {});
  const jobData = job.data as { success?: boolean; result?: { messagesSent?: number } };
  ok('POST expiry/run', job.res.status === 200 && jobData.success === true);
  ok('Job devuelve messagesSent', typeof jobData.result?.messagesSent === 'number');

  cookie = '';
  await login(MEMBER_EMAIL, MEMBER_PASSWORD);
  const memberDenied = await jsonApi('GET', '/api/chat/conversations');
  ok('Miembro no puede listar inbox staff → 403', memberDenied.res.status === 403);

  const trainerLogin = await login('trainer@gym.com', process.env.DEMO_PASSWORD ?? 'DemoPassword123!');
  if (trainerLogin.res.status === 200) {
    const trainerList = await jsonApi('GET', '/api/chat/conversations');
    ok('Entrenador GET /api/chat/conversations', trainerList.res.status === 200);

    const trainerItems = (trainerList.data as { items?: { member_id: number }[] }).items ?? [];
    ok(
      'Inbox entrenador incluye solo sus clientes',
      trainerItems.every((i) => i.member_id === mineData.member_id),
      `items=${trainerItems.map((i) => i.member_id).join(',')}`
    );

    const openConvo = await jsonApi('POST', `/api/chat/conversations/with/${mineData.member_id}`, {});
    ok('Entrenador abre chat con su cliente', openConvo.res.status === 200);

    const trainerMsg = await jsonApi('POST', `/api/chat/conversations/${conversationId}/messages`, {
      body: 'Hola, soy tu entrenador. ¿Cómo vas con la rutina?',
    });
    ok('Entrenador responde al miembro', trainerMsg.res.status === 201);

    await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    const otherMember = await jsonApi('POST', '/api/auth/register', {
      full_name: 'Otro Miembro Chat',
      email: `chat-other-${Date.now()}@test.local`,
      password: MEMBER_PASSWORD,
      cedula: `V-${54000000 + Math.floor(Math.random() * 999999)}`,
    });
    const otherMemberId = (otherMember.data as { user?: { id?: number } }).user?.id;
    if (otherMemberId) {
      await login('trainer@gym.com', process.env.DEMO_PASSWORD ?? 'DemoPassword123!');
      const denied = await jsonApi('POST', `/api/chat/conversations/with/${otherMemberId}`, {});
      ok('Entrenador no abre chat con miembro sin rutina → 403', denied.res.status === 403);
    }
  } else {
    console.log('  SKIP entrenador (ejecuta db:restore-demo para trainer@gym.com)');
  }

  console.log(`\n=== Resultado: ${passed} OK, ${failed} FAIL ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
