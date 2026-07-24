import { z } from 'zod';
import { query } from '../db/index.ts';
import { formatZodError } from '../lib/passwordPolicy.ts';
import { asyncRouter } from './middleware/asyncRouter.ts';

const router = asyncRouter();

const webVitalSchema = z.object({
  name: z.enum(['CLS', 'FCP', 'INP', 'LCP', 'TTFB']),
  value: z.number().finite().nonnegative().max(600_000),
  rating: z.enum(['good', 'needs-improvement', 'poor']),
  routePath: z
    .string()
    .startsWith('/')
    .max(160)
    .refine(
      (path) => !path.includes('?') && !path.includes('#'),
      'La ruta no puede incluir query ni hash'
    ),
  navigationType: z.enum(['navigate', 'reload', 'back-forward', 'prerender', 'restore', 'unknown']),
});

/**
 * Public, sampled telemetry endpoint.
 * Payloads are deliberately anonymous: no account, IP, user agent, URL query, or device identifier.
 */
router.post('/', async (req, res) => {
  const parsed = webVitalSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }

  const metric = parsed.data;
  await query(
    `INSERT INTO web_vitals_metrics
      (metric_name, metric_value, metric_rating, route_path, navigation_type)
     VALUES ($1, $2, $3, $4, $5)`,
    [metric.name, metric.value, metric.rating, metric.routePath, metric.navigationType]
  );

  res.status(204).end();
});

export default router;
