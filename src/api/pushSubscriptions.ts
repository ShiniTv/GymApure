import { asyncRouter } from './middleware/asyncRouter.ts';
import { authenticate, type AuthRequest } from './middleware/auth.ts';
import { subscribeUser, unsubscribeUser, getVapidPublicKey } from '../lib/pushNotifications.ts';

const router = asyncRouter();

router.use(authenticate);

router.get('/vapid-key', (_req, res) => {
  const key = getVapidPublicKey();
  if (!key) {
    res.status(404).json({ error: 'VAPID keys not configured' });
    return;
  }
  res.json({ publicKey: key });
});

router.post('/subscribe', async (req: AuthRequest, res) => {
  const { subscription } = req.body;
  if (!subscription?.endpoint) {
    res.status(400).json({ error: 'Invalid subscription object' });
    return;
  }
  await subscribeUser(req.user!.id, subscription);
  res.json({ success: true });
});

router.post('/unsubscribe', async (req: AuthRequest, res) => {
  const { endpoint } = req.body;
  if (!endpoint) {
    res.status(400).json({ error: 'endpoint is required' });
    return;
  }
  await unsubscribeUser(req.user!.id, endpoint);
  res.json({ success: true });
});

export default router;
