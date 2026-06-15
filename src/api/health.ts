import { Router } from 'express';
import { query } from '../db/index.ts';
import { allowPublicRegister } from '../config/env.ts';

const router = Router();
const startedAt = Date.now();

router.get('/health', async (_req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - startedAt) / 1000);

  try {
    await query('SELECT 1');
    res.json({
      status: 'ok',
      db: 'up',
      uptime_seconds: uptimeSeconds,
      allowPublicRegister,
    });
  } catch {
    res.status(503).json({
      status: 'degraded',
      db: 'down',
      uptime_seconds: uptimeSeconds,
      allowPublicRegister,
    });
  }
});

export default router;
