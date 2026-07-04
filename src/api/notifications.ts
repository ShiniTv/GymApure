import { asyncRouter } from './middleware/asyncRouter.ts';
import type { AuthRequest } from './middleware/auth.ts';
import { toDbId } from '../lib/ids.ts';
import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../lib/notifications/repository.ts';

const router = asyncRouter();

function requireUserId(req: AuthRequest): number {
  if (!req.user) {
    throw Object.assign(new Error('No autenticado'), { status: 401 });
  }
  return toDbId(req.user.id);
}

router.get('/unread-count', async (req: AuthRequest, res) => {
  const count = await getUnreadCount(requireUserId(req));
  res.json({ count });
});

router.get('/', async (req: AuthRequest, res) => {
  const page = parseInt(String(req.query.page ?? '1'), 10);
  const limit = parseInt(String(req.query.limit ?? '20'), 10);
  const unreadOnly = req.query.unread_only === 'true';

  const result = await listNotifications(requireUserId(req), {
    page: Number.isNaN(page) ? 1 : page,
    limit: Number.isNaN(limit) ? 20 : limit,
    unreadOnly,
  });

  res.json({
    items: result.items,
    total: result.total,
    page: Number.isNaN(page) ? 1 : Math.max(1, page),
    limit: Math.min(50, Math.max(1, Number.isNaN(limit) ? 20 : limit)),
  });
});

router.patch('/read-all', async (req: AuthRequest, res) => {
  const updated = await markAllNotificationsRead(requireUserId(req));
  res.json({ updated });
});

router.patch('/:id/read', async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }

  const ok = await markNotificationRead(requireUserId(req), id);
  if (!ok) {
    res.status(404).json({ error: 'Notificación no encontrada' });
    return;
  }

  res.json({ success: true });
});

export default router;
