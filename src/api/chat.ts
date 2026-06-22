import { z } from 'zod';
import { asyncRouter } from './middleware/asyncRouter.ts';
import { authorize, AuthRequest } from './middleware/auth.ts';
import {
  getConversationById,
  getMemberConversationSummary,
  getOrCreateConversation,
  listStaffConversations,
} from '../lib/chat/conversations.ts';
import {
  getUnreadCountForUser,
  listMessages,
  markConversationRead,
  sendTextMessage,
  editTextMessage,
  deleteTextMessage,
} from '../lib/chat/messages.ts';
import { getExpiryAlertDays } from '../lib/gymSettings.ts';
import { sameUserId, toDbId } from '../lib/ids.ts';
import { isStaffRole, STAFF_ROLES } from '../lib/roles.ts';
import { trainerHasMemberAccess } from '../lib/trainerAccess.ts';

const router = asyncRouter();

async function assertTrainerMemberAccess(req: AuthRequest, memberId: number): Promise<void> {
  if (req.user!.role !== 'trainer') return;
  const allowed = await trainerHasMemberAccess(req.user!.id, memberId);
  if (!allowed) {
    throw Object.assign(new Error('Este miembro no está asignado a tu coaching'), { status: 403 });
  }
}

async function assertConversationAccess(
  req: AuthRequest,
  conversationId: number
): Promise<{ memberId: number }> {
  const conversation = await getConversationById(conversationId);
  if (!conversation) {
    throw Object.assign(new Error('Conversación no encontrada'), { status: 404 });
  }

  const role = req.user!.role;
  if (role === 'member' && !sameUserId(req.user!.id, conversation.member_id)) {
    throw Object.assign(new Error('Permisos insuficientes'), { status: 403 });
  }
  if (!isStaffRole(role) && role !== 'member') {
    throw Object.assign(new Error('Permisos insuficientes'), { status: 403 });
  }

  await assertTrainerMemberAccess(req, conversation.member_id);

  return { memberId: conversation.member_id };
}

router.get('/unread-count', async (req: AuthRequest, res) => {
  const count = await getUnreadCountForUser(toDbId(req.user!.id), req.user!.role);
  res.json({ count });
});

router.get('/conversations', authorize(STAFF_ROLES), async (req: AuthRequest, res) => {
  const search = typeof req.query.q === 'string' ? req.query.q : undefined;
  const expiringOnly = req.query.expiring === 'true';
  const listOptions =
    req.user!.role === 'trainer' ? { trainerId: toDbId(req.user!.id) } : undefined;
  let items = await listStaffConversations(search, listOptions);
  if (expiringOnly) {
    const alertDays = await getExpiryAlertDays();
    items = items.filter(
      (item) => item.days_remaining != null && item.days_remaining <= alertDays
    );
  }
  res.json({ items });
});

router.get('/conversations/mine', authorize(['member']), async (req: AuthRequest, res) => {
  const summary = await getMemberConversationSummary(toDbId(req.user!.id));
  res.json(summary);
});

router.post('/conversations/with/:memberId', authorize(STAFF_ROLES), async (req: AuthRequest, res) => {
  const memberId = parseInt(req.params.memberId, 10);
  if (!Number.isFinite(memberId)) {
    return res.status(400).json({ error: 'ID de miembro inválido' });
  }

  try {
    await assertTrainerMemberAccess(req, memberId);
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : 'Error';
    return res.status(status).json({ error: message });
  }

  const conversation = await getOrCreateConversation(memberId);
  const summary = await getMemberConversationSummary(memberId);
  res.json({ ...conversation, ...summary, id: conversation.id });
});

router.get('/conversations/:id/messages', async (req: AuthRequest, res) => {
  const conversationId = parseInt(req.params.id, 10);
  if (!Number.isFinite(conversationId)) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  try {
    await assertConversationAccess(req, conversationId);
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : 'Error';
    return res.status(status).json({ error: message });
  }

  const before = req.query.before ? parseInt(String(req.query.before), 10) : undefined;
  const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;
  const result = await listMessages(conversationId, toDbId(req.user!.id), { before, limit });
  res.json(result);
});

const sendSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

router.post('/conversations/:id/messages', async (req: AuthRequest, res) => {
  const conversationId = parseInt(req.params.id, 10);
  if (!Number.isFinite(conversationId)) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  const parsed = sendSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Mensaje inválido' });
  }

  try {
    await assertConversationAccess(req, conversationId);
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : 'Error';
    return res.status(status).json({ error: message });
  }

  try {
    const message = await sendTextMessage(conversationId, toDbId(req.user!.id), parsed.data.body);
    res.status(201).json(message);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al enviar';
    res.status(400).json({ error: message });
  }
});

router.patch('/conversations/:id/messages/:messageId', async (req: AuthRequest, res) => {
  const conversationId = parseInt(req.params.id, 10);
  const messageId = parseInt(req.params.messageId, 10);
  if (!Number.isFinite(conversationId) || !Number.isFinite(messageId)) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  const parsed = sendSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Mensaje inválido' });
  }

  try {
    await assertConversationAccess(req, conversationId);
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : 'Error';
    return res.status(status).json({ error: message });
  }

  try {
    const message = await editTextMessage(
      conversationId,
      messageId,
      toDbId(req.user!.id),
      parsed.data.body
    );
    res.json(message);
  } catch (err) {
    const status = (err as { status?: number }).status ?? 400;
    const message = err instanceof Error ? err.message : 'Error al editar';
    res.status(status).json({ error: message });
  }
});

router.delete('/conversations/:id/messages/:messageId', async (req: AuthRequest, res) => {
  const conversationId = parseInt(req.params.id, 10);
  const messageId = parseInt(req.params.messageId, 10);
  if (!Number.isFinite(conversationId) || !Number.isFinite(messageId)) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  try {
    await assertConversationAccess(req, conversationId);
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : 'Error';
    return res.status(status).json({ error: message });
  }

  try {
    await deleteTextMessage(conversationId, messageId, toDbId(req.user!.id));
    res.json({ ok: true });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 400;
    const message = err instanceof Error ? err.message : 'Error al eliminar';
    res.status(status).json({ error: message });
  }
});

router.post('/conversations/:id/read', async (req: AuthRequest, res) => {
  const conversationId = parseInt(req.params.id, 10);
  if (!Number.isFinite(conversationId)) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  let access: { memberId: number };
  try {
    access = await assertConversationAccess(req, conversationId);
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : 'Error';
    return res.status(status).json({ error: message });
  }

  const role = req.user!.role;
  const readerRole = role === 'member' ? 'member' : 'staff';
  const marked = await markConversationRead(
    conversationId,
    role === 'member' ? toDbId(req.user!.id) : access.memberId,
    readerRole
  );
  res.json({ marked });
});

export default router;
