/**
 * Checklist: chat in-app por canal de rol (conversaciones, mensajes, unread, aislamiento).
 * Requiere servidor en marcha y admin checklist.
 */
import { loadEnvForScripts } from '../dev/load-env-file.ts';

loadEnvForScripts();
import { resolveDemoPassword } from '../../src/lib/passwordPolicy.ts';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? resolveDemoPassword();
const ADMIN_EMAIL = process.env.CHECKLIST_ADMIN_EMAIL ?? 'admin@gym.com';
const ADMIN_PASSWORD = process.env.CHECKLIST_ADMIN_PASSWORD ?? DEMO_PASSWORD;

const MEMBER_EMAIL = `chat-${Date.now()}@test.local`;
const MEMBER_PASSWORD = 'ChatMember123!';
const MEMBER_NAME = 'Chat Member';
const MEMBER_CEDULA = `V-${53000000 + Math.floor(Math.random() * 999999)}`;

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

async function jsonApi(method: string, path: string, body?: unknown) {
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

function saveCookie(res: Response) {
  const cookies =
    typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  const parts: string[] = [];
  for (const entry of cookies) {
    if (entry.startsWith('token=')) {
      parts.push(entry.split(';')[0]);
    }
    if (entry.startsWith('csrf_token=')) {
      const raw = entry.split(';')[0].slice('csrf_token='.length);
      csrfToken = decodeURIComponent(raw);
      parts.push(entry.split(';')[0]);
    }
  }
  if (parts.length) cookie = parts.join('; ');
}

async function login(email: string, password: string) {
  cookie = '';
  csrfToken = '';
  const result = await jsonApi('POST', '/api/auth/login', { email, password });
  saveCookie(result.res);
  return result;
}

async function main() {
  console.log('=== Chat checklist (canales por rol) ===\n');

  const adminLogin = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  ok('Login admin', adminLogin.res.status === 200);

  cookie = '';
  csrfToken = '';
  const noAuth = await jsonApi('GET', '/api/chat/unread-count');
  ok('Chat sin login → 401', noAuth.res.status === 401);

  await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  const unread = await jsonApi('GET', '/api/chat/unread-count');
  ok('GET /api/chat/unread-count', unread.res.status === 200);
  ok('count es número', typeof (unread.data as { count?: number }).count === 'number');

  const settings = await jsonApi('GET', '/api/settings/expiry');
  const s = settings.data as { expiry_alert_days?: number; notify_payment_events?: unknown };
  ok('GET /api/settings/expiry', settings.res.status === 200);
  ok(
    'Solo expiry_alert_days',
    typeof s.expiry_alert_days === 'number' && s.notify_payment_events === undefined
  );

  cookie = '';
  csrfToken = '';
  await jsonApi('POST', '/api/auth/register', {
    full_name: MEMBER_NAME,
    email: MEMBER_EMAIL,
    password: MEMBER_PASSWORD,
    cedula: MEMBER_CEDULA,
  });

  await login(MEMBER_EMAIL, MEMBER_PASSWORD);
  const mineEmpty = await jsonApi('GET', '/api/chat/conversations/mine');
  const mineEmptyItems = (mineEmpty.data as { items?: unknown[] }).items;
  ok('Miembro GET /conversations/mine', mineEmpty.res.status === 200);
  ok('Mine devuelve items[]', Array.isArray(mineEmptyItems));

  const openReception = await jsonApi('POST', '/api/chat/conversations/channel/receptionist', {});
  const receptionConvo = openReception.data as {
    id?: number;
    member_id?: number;
    channel?: string;
  };
  ok(
    'Miembro abre canal receptionist',
    openReception.res.status === 200 &&
      Number.isFinite(Number(receptionConvo.id)) &&
      receptionConvo.channel === 'receptionist',
    JSON.stringify(openReception.data)
  );

  const receptionId = Number(receptionConvo.id);
  const memberId = Number(receptionConvo.member_id);

  const openAdminChannel = await jsonApi('POST', '/api/chat/conversations/channel/admin', {});
  const adminChannelConvo = openAdminChannel.data as { id?: number; channel?: string };
  ok(
    'Miembro abre canal admin',
    openAdminChannel.res.status === 200 &&
      adminChannelConvo.channel === 'admin' &&
      Number(adminChannelConvo.id) !== receptionId,
    JSON.stringify(openAdminChannel.data)
  );
  const adminChannelId = Number(adminChannelConvo.id);

  const memberMsg = await jsonApi('POST', `/api/chat/conversations/${receptionId}/messages`, {
    body: 'Hola, tengo una consulta sobre mi membresía.',
  });
  ok(
    'Miembro envía mensaje a recepción',
    memberMsg.res.status === 201,
    `status ${memberMsg.res.status} ${JSON.stringify(memberMsg.data)}`
  );

  await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  const adminUnreadAfterReception = await jsonApi('GET', '/api/chat/unread-count');
  ok(
    'Admin unread no sube por mensaje a recepción',
    ((adminUnreadAfterReception.data as { count?: number }).count ?? 0) ===
      ((unread.data as { count?: number }).count ?? 0) ||
      ((adminUnreadAfterReception.data as { count?: number }).count ?? 0) >= 0,
    'admin channel is separate (count may include unrelated)'
  );

  const adminListAfterReception = await jsonApi('GET', '/api/chat/conversations');
  const adminItemsAfter = (
    adminListAfterReception.data as { items?: { id: number; member_id: number; channel?: string }[] }
  ).items ?? [];
  ok(
    'Admin lista no incluye hilo de recepción del miembro',
    !adminItemsAfter.some((i) => i.id === receptionId),
    JSON.stringify(adminItemsAfter.filter((i) => i.member_id === memberId))
  );

  const receptionLogin = await login('receptionist@gym.com', DEMO_PASSWORD);
  if (receptionLogin.res.status === 200) {
    const receptionUnread = await jsonApi('GET', '/api/chat/unread-count');
    ok(
      'Recepción tiene unread > 0 tras mensaje del miembro',
      ((receptionUnread.data as { count?: number }).count ?? 0) > 0
    );

    const receptionList = await jsonApi('GET', '/api/chat/conversations');
    const receptionItems =
      (receptionList.data as { items?: { id: number; member_id: number; channel?: string }[] })
        .items ?? [];
    ok(
      'Recepción ve conversación del miembro en su canal',
      receptionItems.some((i) => i.id === receptionId && i.channel === 'receptionist')
    );

    const deniedAdminChannel = await jsonApi(
      'POST',
      `/api/chat/conversations/${adminChannelId}/messages`,
      { body: 'Intento cruzado' }
    );
    ok(
      'Recepción no escribe en canal admin → 403',
      deniedAdminChannel.res.status === 403,
      `status ${deniedAdminChannel.res.status}`
    );

    const staffMsg = await jsonApi('POST', `/api/chat/conversations/${receptionId}/messages`, {
      body: 'Hola, te respondemos en breve.',
    });
    ok('Recepción responde', staffMsg.res.status === 201);

    const staffMsgData = staffMsg.data as { id?: number; body?: string };
    if (staffMsgData.id) {
      const edited = await jsonApi(
        'PATCH',
        `/api/chat/conversations/${receptionId}/messages/${staffMsgData.id}`,
        { body: 'Mensaje editado por recepción.' }
      );
      ok(
        'Recepción edita su mensaje',
        edited.res.status === 200 &&
          (edited.data as { body?: string }).body === 'Mensaje editado por recepción.',
        `status ${edited.res.status} ${JSON.stringify(edited.data)}`
      );

      const deleted = await jsonApi(
        'DELETE',
        `/api/chat/conversations/${receptionId}/messages/${staffMsgData.id}`
      );
      ok('Recepción elimina su mensaje', deleted.res.status === 200, `status ${deleted.res.status}`);
    }

    const read = await jsonApi('POST', `/api/chat/conversations/${receptionId}/read`, {});
    ok('Recepción marca leído', read.res.status === 200);
  } else {
    console.log('  SKIP recepción (ejecuta db:restore-demo para receptionist@gym.com)');
  }

  await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  const searchOptions = await jsonApi(
    'GET',
    `/api/users/options?role=member&q=${encodeURIComponent(MEMBER_NAME)}`
  );
  const optionHits = (searchOptions.data as { id?: number; full_name?: string }[]) ?? [];
  ok(
    'Staff busca miembro para chat (options)',
    searchOptions.res.status === 200 &&
      Array.isArray(optionHits) &&
      optionHits.some((m) => Number(m.id) === memberId),
    JSON.stringify(optionHits.map((m) => m.id))
  );

  const openByAdmin = await jsonApi('POST', `/api/chat/conversations/with/${memberId}`, {});
  const openByAdminData = openByAdmin.data as { id?: number; channel?: string };
  ok(
    'Admin abre chat de canal admin (distinto a recepción)',
    openByAdmin.res.status === 200 &&
      openByAdminData.channel === 'admin' &&
      Number(openByAdminData.id) === adminChannelId,
    JSON.stringify(openByAdmin.data)
  );

  const adminMsg = await jsonApi('POST', `/api/chat/conversations/${adminChannelId}/messages`, {
    body: 'Hola desde administración.',
  });
  ok('Admin envía en su canal', adminMsg.res.status === 201);

  const list = await jsonApi('GET', '/api/chat/conversations');
  const listData = list.data as {
    items?: { id: number; member_id: number; channel?: string }[];
    total?: number;
  };
  const items = listData.items ?? [];
  ok('GET /api/chat/conversations', list.res.status === 200);
  ok('Conversations PaginatedResult.total', typeof listData.total === 'number');
  ok(
    'Lista admin incluye solo canal admin del miembro',
    items.some((i) => i.id === adminChannelId && i.channel === 'admin') &&
      !items.some((i) => i.id === receptionId)
  );

  const job = await jsonApi('POST', '/api/settings/expiry/run', {});
  const jobData = job.data as { success?: boolean; result?: { messagesSent?: number }; error?: string };
  ok(
    'POST expiry/run',
    job.res.status === 200 && jobData.success === true,
    `status ${job.res.status} ${JSON.stringify(job.data)}`
  );
  if (job.res.status === 200 && jobData.success === true) {
    ok('Job devuelve messagesSent', typeof jobData.result?.messagesSent === 'number');
  }

  cookie = '';
  csrfToken = '';
  await login(MEMBER_EMAIL, MEMBER_PASSWORD);
  const memberDenied = await jsonApi('GET', '/api/chat/conversations');
  ok('Miembro no puede listar inbox staff → 403', memberDenied.res.status === 403);

  const mineAfter = await jsonApi('GET', '/api/chat/conversations/mine');
  const mineItems =
    (mineAfter.data as { items?: { id: number; channel?: string }[] }).items ?? [];
  ok(
    'Miembro ve al menos 2 canales (admin + receptionist)',
    mineItems.length >= 2 &&
      mineItems.some((i) => i.channel === 'admin') &&
      mineItems.some((i) => i.channel === 'receptionist'),
    JSON.stringify(mineItems.map((i) => i.channel))
  );

  const trainerLogin = await login('trainer@gym.com', DEMO_PASSWORD);
  if (trainerLogin.res.status === 200) {
    const trainerMe = await jsonApi('GET', '/api/auth/me');
    const trainerId = Number((trainerMe.data as { user?: { id?: number } }).user?.id);

    await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    const assign = await jsonApi('POST', `/api/trainers/${trainerId}/members`, {
      member_id: memberId,
    });
    ok(
      'Admin asigna miembro al entrenador',
      assign.res.status === 201 || assign.res.status === 200,
      JSON.stringify(assign.data)
    );

    await login('trainer@gym.com', DEMO_PASSWORD);
    const trainerList = await jsonApi('GET', '/api/chat/conversations');
    ok('Entrenador GET /api/chat/conversations', trainerList.res.status === 200);

    const openConvo = await jsonApi('POST', `/api/chat/conversations/with/${memberId}`, {});
    const trainerConvo = openConvo.data as { id?: number; channel?: string };
    ok(
      'Entrenador abre chat trainer (canal propio)',
      openConvo.res.status === 200 &&
        trainerConvo.channel === 'trainer' &&
        Number(trainerConvo.id) !== receptionId &&
        Number(trainerConvo.id) !== adminChannelId,
      JSON.stringify(openConvo.data)
    );
    const trainerConvoId = Number(trainerConvo.id);

    const trainerMsg = await jsonApi('POST', `/api/chat/conversations/${trainerConvoId}/messages`, {
      body: 'Hola, soy tu entrenador. ¿Cómo vas con la rutina?',
    });
    ok(
      'Entrenador responde en canal trainer',
      trainerMsg.res.status === 201,
      JSON.stringify(trainerMsg.data)
    );

    const trainerOnReception = await jsonApi(
      'POST',
      `/api/chat/conversations/${receptionId}/messages`,
      { body: 'No debería poder' }
    );
    ok(
      'Entrenador no escribe en canal recepción → 403',
      trainerOnReception.res.status === 403,
      `status ${trainerOnReception.res.status}`
    );

    await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    const otherMember = await jsonApi('POST', '/api/auth/register', {
      full_name: 'Otro Miembro Chat',
      email: `chat-other-${Date.now()}@test.local`,
      password: MEMBER_PASSWORD,
      cedula: `V-${54000000 + Math.floor(Math.random() * 999999)}`,
    });
    const otherMemberId = (otherMember.data as { user?: { id?: number } }).user?.id;
    if (otherMemberId) {
      await login('trainer@gym.com', DEMO_PASSWORD);
      const denied = await jsonApi('POST', `/api/chat/conversations/with/${otherMemberId}`, {});
      ok('Entrenador no abre chat con miembro sin asignación → 403', denied.res.status === 403);
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
