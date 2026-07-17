import { z } from 'zod';
import { createHash } from 'node:crypto';
import { asyncRouter } from './middleware/asyncRouter.ts';
import { query } from '../db/index.ts';
import { asyncHandler } from './middleware/asyncHandler.ts';
import { formatZodError } from '../lib/passwordPolicy.ts';
import { forgotPasswordRateLimiter } from './middleware/rateLimit.ts';

const router = asyncRouter();

const demoRequestSchema = z.object({
  contact_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional().nullable(),
  gym_name: z.string().trim().min(2).max(160),
  city: z.string().trim().max(100).optional().nullable(),
  message: z.string().trim().max(2000).optional().nullable(),
});

router.post(
  '/',
  forgotPasswordRateLimiter,
  asyncHandler(async (req, res) => {
    const parsed = demoRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: formatZodError(parsed.error) });
      return;
    }

    const ip = String(req.headers['x-forwarded-for'] ?? req.ip ?? '')
      .split(',')[0]
      .trim();
    const ipHash = ip ? createHash('sha256').update(ip).digest('hex').slice(0, 32) : null;

    await query(
      `INSERT INTO demo_requests (contact_name, email, phone, gym_name, city, message, ip_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        parsed.data.contact_name,
        parsed.data.email.toLowerCase(),
        parsed.data.phone || null,
        parsed.data.gym_name,
        parsed.data.city || null,
        parsed.data.message || null,
        ipHash,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Recibimos tu solicitud. Te contactaremos pronto.',
    });
  })
);

export default router;
