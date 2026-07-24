import { z } from 'zod';
import { asyncRouter } from './middleware/asyncRouter.ts';
import { authorize, AuthRequest } from './middleware/auth.ts';
import {
  getConversationById,
  getMemberConversationSummary,
  getOrCreateConversation,
  listMemberConversations,
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
import {
  chatAttachmentApiPath,
  localChatAttachmentPath,
  storeChatAttachment,
  streamChatAttachment,
} from '../lib/chat/attachments.ts';
import { getExpiryAlertDays } from '../lib/gymSettings.ts';
import { sameUserId, toDbId } from '../lib/ids.ts';
import { isStaffRole, STAFF_ROLES } from '../lib/roles.ts';
import { trainerHasMemberAccess } from '../lib/trainerAccess.ts';
import { parseBooleanQuery, parsePaginationQuery, parseSearchQuery } from '../lib/pagination.ts';
import { chatAttachmentUpload } from '../lib/uploadStorage.ts';
import { query } from '../db/index.ts';
import {
  CHAT_STAFF_CHANNELS,
  isChatStaffChannel,
  type ChatStaffChannel,
} from '../lib/chat/types.ts';

const router = asyncRouter();

function staffChannelFromRole(role: string): ChatStaffChannel {
  if (!isChatStaffChannel(role)) {
    throw Object.assign(new Error('Rol de staff sin canal de chat'), { status: 403 });
  }
  return role;
}

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
): Promise<{ memberId: number; channel: ChatStaffChannel }> {
  const conversation = await getConversationById(conversationId);
  if (!conversation) {
    throw Object.assign(new Error('Conversación no encontrada'), { status: 404 });
  }

  const role = req.user!.role;
  if (role === 'member') {
    if (!sameUserId(req.user!.id, conversation.member_id)) {
      throw Object.assign(new Error('Permisos insuficientes'), { status: 403 });
    }
    return { memberId: conversation.member_id, channel: conversation.channel };
  }

  if (!isStaffRole(role)) {
    throw Object.assign(new Error('Permisos insuficientes'), { status: 403 });
  }

  if (role !== conversation.channel) {
    throw Object.assign(new Error('Esta conversación pertenece a otro canal de staff'), {
      status: 403,
    });
  }

  await assertTrainerMemberAccess(req, conversation.member_id);

  return { memberId: conversation.member_id, channel: conversation.channel };
}

router.get('/unread-count', async (req: AuthRequest, res) => {
  const count = await getUnreadCountForUser(toDbId(req.user!.id), req.user!.role);
  res.json({ count });
});

router.get('/conversations', authorize(STAFF_ROLES), async (req: AuthRequest, res) => {
  const search = parseSearchQuery(req.query) || undefined;
  const expiringOnly = parseBooleanQuery(req.query.expiring);
  const unreadOnly = parseBooleanQuery(req.query.unread);
  const { page, pageSize } = parsePaginationQuery(req.query, { pageSize: 50, maxPageSize: 100 });
  const channel = staffChannelFromRole(req.user!.role);
  const listOptions = {
    channel,
    ...(req.user!.role === 'trainer' ? { trainerId: toDbId(req.user!.id) } : {}),
    expiringOnly,
    unreadOnly,
    alertDays: expiringOnly ? await getExpiryAlertDays() : undefined,
    page,
    pageSize,
  };
  const result = await listStaffConversations(search, listOptions);
  res.json(result);
});

router.get('/conversations/mine', authorize(['member']), async (req: AuthRequest, res) => {
  try {
    const items = await listMemberConversations(toDbId(req.user!.id));
    res.json({ items });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : 'Error al cargar conversaciones';
    res.status(status).json({ error: message });
  }
});

router.post(
  '/conversations/channel/:channel',
  authorize(['member']),
  async (req: AuthRequest, res) => {
    const channelParam = String(req.params.channel ?? '');
    if (!isChatStaffChannel(channelParam)) {
      return res.status(400).json({
        error: `Canal inválido. Usa: ${CHAT_STAFF_CHANNELS.join(', ')}`,
      });
    }

    try {
      const conversation = await getOrCreateConversation(toDbId(req.user!.id), channelParam);
      const summary = await getMemberConversationSummary(toDbId(req.user!.id), channelParam);
      res.json({ ...conversation, ...summary, id: conversation.id });
    } catch (err) {
      const status = (err as { status?: number }).status ?? 500;
      const message = err instanceof Error ? err.message : 'Error';
      return res.status(status).json({ error: message });
    }
  }
);

router.post(
  '/conversations/with/:memberId',
  authorize(STAFF_ROLES),
  async (req: AuthRequest, res) => {
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

    const channel = staffChannelFromRole(req.user!.role);
    const conversation = await getOrCreateConversation(memberId, channel);
    const summary = await getMemberConversationSummary(memberId, channel);
    res.json({ ...conversation, ...summary, id: conversation.id });
  }
);

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
  body: z.string().trim().max(4000).optional().default(''),
});

function optionalChatAttachment(
  req: AuthRequest,
  res: import('express').Response,
  next: import('express').NextFunction
) {
  const contentType = String(req.headers['content-type'] ?? '');
  if (contentType.includes('multipart/form-data')) {
    chatAttachmentUpload.single('attachment')(req, res, next);
    return;
  }
  next();
}

router.post(
  '/conversations/:id/messages',
  optionalChatAttachment,
  async (req: AuthRequest, res) => {
    const conversationId = parseInt(req.params.id, 10);
    if (!Number.isFinite(conversationId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const bodyRaw =
      typeof req.body?.body === 'string'
        ? req.body.body
        : typeof req.body?.body === 'number'
          ? String(req.body.body)
          : '';
    const parsed = sendSchema.safeParse({ body: bodyRaw });
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
      let attachment: { url: string; mime: string; name: string } | null = null;
      if (req.file) {
        attachment = await storeChatAttachment(conversationId, req.file);
      }
      const message = await sendTextMessage(
        conversationId,
        toDbId(req.user!.id),
        parsed.data.body,
        attachment
      );
      res.status(201).json(message);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al enviar';
      res.status(400).json({ error: message });
    }
  }
);

router.get('/conversations/:id/attachments/:filename', async (req: AuthRequest, res) => {
  const conversationId = parseInt(req.params.id, 10);
  const filename = decodeURIComponent(String(req.params.filename ?? ''));
  if (!Number.isFinite(conversationId) || !filename) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  try {
    await assertConversationAccess(req, conversationId);
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : 'Error';
    return res.status(status).json({ error: message });
  }

  const localUrl = chatAttachmentApiPath(conversationId, filename);
  const remoteUrl = `sbmedia:chat:${conversationId}/${filename}`;

  try {
    const { rows } = await query<{ metadata: Record<string, unknown> | null }>(
      `SELECT metadata FROM chat_messages
       WHERE conversation_id = $1
         AND (
           metadata -> 'attachment' ->> 'url' = $2
           OR metadata -> 'attachment' ->> 'url' = $3
         )
       LIMIT 1`,
      [toDbId(conversationId), localUrl, remoteUrl]
    );

    let storedUrl: string | null = null;
    const meta = rows[0]?.metadata;
    if (
      meta &&
      typeof meta === 'object' &&
      meta.attachment &&
      typeof (meta.attachment as { url?: unknown }).url === 'string'
    ) {
      storedUrl = (meta.attachment as { url: string }).url;
    } else if (localChatAttachmentPath(conversationId, filename)) {
      storedUrl = localUrl;
    }

    if (!storedUrl) {
      return res.status(404).json({ error: 'Adjunto no encontrado' });
    }

    await streamChatAttachment(storedUrl, conversationId, res);
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : 'Error';
    if (!res.headersSent) res.status(status).json({ error: message });
  }
});

router.patch('/conversations/:id/messages/:messageId', async (req: AuthRequest, res) => {
  const conversationId = parseInt(req.params.id, 10);
  const messageId = parseInt(req.params.messageId, 10);
  if (!Number.isFinite(conversationId) || !Number.isFinite(messageId)) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  const parsed = sendSchema.safeParse(req.body);
  if (!parsed.success || !parsed.data.body.trim()) {
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

  let access: { memberId: number; channel: ChatStaffChannel };
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
