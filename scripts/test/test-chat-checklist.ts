/**
 * Checklist: chat in-app (conversaciones, mensajes, unread).
 */
import 'dotenv/config';
import { TestApiClient } from './lib/test-api-client.ts';
import { resolveDemoPassword } from '../../src/lib/passwordPolicy.ts';

const ADMIN_EMAIL = process.env.CHECKLIST_ADMIN_EMAIL ?? 'checklist-admin@test.local';
const ADMIN_PASSWORD = process.env.CHECKLIST_ADMIN_PASSWORD ?? 'ChecklistAdmin123!';
const MEMBER_EMAIL = `chat-${Date.now()}@test.local`;
const MEMBER_PASSWORD = 'ChatMember123!';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? resolveDemoPassword();

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
  console.log('=== Chat checklist ===\n');

  ok('Login admin', (await client.login(ADMIN_EMAIL, ADMIN_PASSWORD)).status === 200);

  client.clearSession();
  ok('Chat sin login → 401', (await client.json('GET', '/api/chat/unread-count')).status === 401);

  await client.login(ADMIN_EMAIL, ADMIN_PASSWORD);
  const unread = await client.json('GET', '/api/chat/unread-count');
  ok('GET /api/chat/unread-count', unread.status === 200);
  ok('count es número', typeof (unread.data as { count?: number }).count === 'number');

  client.clearSession();
  await client.json('POST', '/api/auth/register', {
    full_name: 'Chat Member',
    email: MEMBER_EMAIL,
    password: MEMBER_PASSWORD,
    cedula: `V-${53000000 + Math.floor(Math.random() * 999999)}`,
  });

  await client.login(MEMBER_EMAIL, MEMBER_PASSWORD);
  const mine = await client.json('GET', '/api/chat/conversations/mine');
  const mineData = mine.data as { id?: number; member_id?: number };
  ok('Miembro GET /conversations/mine', mine.status === 200);
  ok('Conversación creada', Number.isFinite(Number(mineData.id)));

  const conversationId = Number(mineData.id);
  const memberMsg = await client.json('POST', `/api/chat/conversations/${conversationId}/messages`, {
    body: 'Hola, tengo una consulta sobre mi membresía.',
  });
  ok('Miembro envía mensaje', memberMsg.status === 201, `status ${memberMsg.status}`);

  await client.login(ADMIN_EMAIL, ADMIN_PASSWORD);
  ok('Staff tiene unread > 0', ((await client.json('GET', '/api/chat/unread-count')).data as { count?: number }).count ?? 0) > 0);

  const list = await client.json('GET', '/api/chat/conversations');
  const items = (list.data as { items?: { id: number; member_id: number }[] }).items ?? [];
  ok('GET /api/chat/conversations', list.status === 200);
  ok('Lista incluye conversación del miembro', items.some((i) => i.member_id === mineData.member_id));

  const convo = items.find((i) => i.id === mineData.id) ?? items[0];
  if (convo) {
    const staffMsg = await client.json('POST', `/api/chat/conversations/${convo.id}/messages`, {
      body: 'Hola, te respondemos en breve.',
    });
    ok('Staff responde', staffMsg.status === 201);

    const staffMsgData = staffMsg.data as { id?: number; body?: string };
    if (staffMsgData.id) {
      const edited = await client.json('PATCH', `/api/chat/conversations/${convo.id}/messages/${staffMsgData.id}`, {
        body: 'Mensaje editado por staff.',
      });
      ok('Staff edita su mensaje', edited.status === 200);
      ok('Staff elimina su mensaje', (await client.json('DELETE', `/api/chat/conversations/${convo.id}/messages/${staffMsgData.id}`)).status === 200);
    }

    ok('Staff marca leído', (await client.json('POST', `/api/chat/conversations/${convo.id}/read`, {})).status === 200);
  }

  const job = await client.json('POST', '/api/settings/expiry/run', {});
  ok('POST expiry/run', job.status === 200 && (job.data as { success?: boolean }).success === true);
  ok('Job devuelve messagesSent', typeof (job.data as { result?: { messagesSent?: number } }).result?.messagesSent === 'number');

  await client.login(MEMBER_EMAIL, MEMBER_PASSWORD);
  ok('Miembro no puede listar inbox staff → 403', (await client.json('GET', '/api/chat/conversations')).status === 403);

  const trainerLogin = await client.login('trainer@gym.com', DEMO_PASSWORD);
  if (trainerLogin.status === 200) {
    const demoMember = await client.json('GET', '/api/auth/me');
    client.clearSession();
    await client.login('member@gym.com', DEMO_PASSWORD);
    const demoMine = await client.json('GET', '/api/chat/conversations/mine');
    const demoMemberId = (demoMine.data as { member_id?: number }).member_id;

    await client.login('trainer@gym.com', DEMO_PASSWORD);
    const trainerList = await client.json('GET', '/api/chat/conversations');
    ok('Entrenador GET /api/chat/conversations', trainerList.status === 200);

    if (demoMemberId) {
      const trainerItems = (trainerList.data as { items?: { member_id: number }[] }).items ?? [];
      ok(
        'Inbox entrenador incluye solo sus clientes',
        trainerItems.length === 0 || trainerItems.every((i) => i.member_id === demoMemberId)
      );

      ok('Entrenador abre chat con su cliente', (await client.json('POST', `/api/chat/conversations/with/${demoMemberId}`, {})).status === 200);

      const demoConvoId = (trainerItems[0]?.member_id === demoMemberId ? trainerItems[0]?.id : null) ??
        (await client.json('POST', `/api/chat/conversations/with/${demoMemberId}`, {})).data?.id;
      if (demoConvoId) {
        ok(
          'Entrenador responde al miembro',
          (await client.json('POST', `/api/chat/conversations/${demoConvoId}/messages`, { body: 'Hola desde entrenador.' })).status === 201
        );
      }
    }

    await client.login(ADMIN_EMAIL, ADMIN_PASSWORD);
    const otherReg = await client.json('POST', '/api/auth/register', {
      full_name: 'Otro Miembro Chat',
      email: `chat-other-${Date.now()}@test.local`,
      password: MEMBER_PASSWORD,
      cedula: `V-${54000000 + Math.floor(Math.random() * 999999)}`,
    });
    const otherMemberId = (otherReg.data as { user?: { id?: number } }).user?.id;
    if (otherMemberId) {
      await client.login('trainer@gym.com', DEMO_PASSWORD);
      ok('Entrenador no abre chat con miembro sin rutina → 403', (await client.json('POST', `/api/chat/conversations/with/${otherMemberId}`, {})).status === 403);
    }
  } else {
    console.log('  SKIP entrenador (ejecuta db:restore-demo)');
  }

  console.log(`\n=== Resultado: ${passed} OK, ${failed} FAIL ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
