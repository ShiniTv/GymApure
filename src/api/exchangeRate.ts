import { asyncRouter } from './middleware/asyncRouter.ts';
import { authorize } from './middleware/auth.ts';
import { getActiveUsdRate } from '../lib/exchangeRate.ts';

const router = asyncRouter();

router.get('/', authorize(['admin', 'member', 'receptionist', 'trainer']), async (_req, res) => {
  try {
    const active = await getActiveUsdRate();
    if (!active) {
      return res.status(503).json({
        error: 'Tasa de cambio no disponible. Contacta al gimnasio.',
      });
    }
    res.json(active);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

export default router;
