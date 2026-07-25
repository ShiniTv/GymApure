import { z } from 'zod';
import type { Router } from 'express';
import { query } from '../db/index.ts';
import { authorize, type AuthRequest } from './middleware/auth.ts';
import { requireMemberAccess } from './middleware/access.ts';
import { asyncHandler } from './middleware/asyncHandler.ts';
import { formatZodError } from '../lib/passwordPolicy.ts';

const blockSchema = z.object({
  name: z.string().trim().min(2).max(120),
  objective: z.string().trim().min(2).max(500),
  start_date: z.string().date(),
  end_date: z.string().date(),
  intensity_method: z.enum(['manual', 'rpe_rir', 'percent_1rm', 'double_progression']),
  notes: z.string().trim().max(4000).nullable().optional(),
});
const blockStatusSchema = z.object({
  status: z.enum(['planned', 'active', 'completed', 'archived']),
});

export function mountTrainingBlockRoutes(router: Router): void {
  router.get(
    '/:id/training-blocks',
    authorize(['trainer', 'admin']),
    requireMemberAccess('id', 'admin'),
    asyncHandler(async (req, res) => {
      const memberId = Number(req.params.id);
      const { rows } = await query(
        `SELECT id, member_id, trainer_id, name, objective, start_date::text, end_date::text,
                status, intensity_method, notes, approved_at::text, created_at::text, updated_at::text
         FROM member_training_blocks WHERE member_id = $1
         ORDER BY start_date DESC`,
        [memberId]
      );
      res.json(rows);
    })
  );

  router.post(
    '/:id/training-blocks',
    authorize(['trainer', 'admin']),
    requireMemberAccess('id', 'admin'),
    asyncHandler(async (req: AuthRequest, res) => {
      const memberId = Number(req.params.id);
      if (!Number.isSafeInteger(memberId) || memberId <= 0) {
        res.status(400).json({ error: 'ID inválido' });
        return;
      }
      const parsed = blockSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: formatZodError(parsed.error) });
        return;
      }
      if (parsed.data.end_date < parsed.data.start_date) {
        res.status(400).json({ error: 'La fecha de fin debe ser posterior al inicio' });
        return;
      }
      const { rows } = await query(
        `INSERT INTO member_training_blocks (
           member_id, trainer_id, name, objective, start_date, end_date, intensity_method, notes
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, member_id, trainer_id, name, objective, start_date::text, end_date::text,
                   status, intensity_method, notes, approved_at::text, created_at::text, updated_at::text`,
        [
          memberId,
          req.user!.id,
          parsed.data.name,
          parsed.data.objective,
          parsed.data.start_date,
          parsed.data.end_date,
          parsed.data.intensity_method,
          parsed.data.notes ?? null,
        ]
      );
      res.status(201).json(rows[0]);
    })
  );

  router.patch(
    '/:id/training-blocks/:blockId/status',
    authorize(['trainer', 'admin']),
    requireMemberAccess('id', 'admin'),
    asyncHandler(async (req: AuthRequest, res) => {
      const memberId = Number(req.params.id);
      const blockId = Number(req.params.blockId);
      const parsed = blockStatusSchema.safeParse(req.body);
      if (!Number.isSafeInteger(memberId) || !Number.isSafeInteger(blockId) || !parsed.success) {
        res
          .status(400)
          .json({ error: parsed.success ? 'ID inválido' : formatZodError(parsed.error) });
        return;
      }
      if (parsed.data.status === 'active') {
        await query(
          `UPDATE member_training_blocks SET status = 'planned', updated_at = NOW()
           WHERE member_id = $1 AND trainer_id = $2 AND status = 'active'`,
          [memberId, req.user!.id]
        );
      }
      const { rows } = await query(
        `UPDATE member_training_blocks
         SET status = $1, approved_at = CASE WHEN $1 = 'active' THEN NOW() ELSE approved_at END,
             updated_at = NOW()
         WHERE id = $2 AND member_id = $3
         RETURNING id, status, approved_at::text`,
        [parsed.data.status, blockId, memberId]
      );
      if (!rows[0]) {
        res.status(404).json({ error: 'Bloque no encontrado' });
        return;
      }
      res.json(rows[0]);
    })
  );

  router.put(
    '/:id/training-blocks/:blockId/routines/:routineId',
    authorize(['trainer', 'admin']),
    requireMemberAccess('id', 'admin'),
    asyncHandler(async (req, res) => {
      const memberId = Number(req.params.id);
      const blockId = Number(req.params.blockId);
      const routineId = Number(req.params.routineId);
      const { rows } = await query(
        `UPDATE user_routines
         SET training_block_id = $1
         WHERE user_id = $2 AND routine_id = $3
           AND EXISTS (SELECT 1 FROM member_training_blocks WHERE id = $1 AND member_id = $2)
         RETURNING id`,
        [blockId, memberId, routineId]
      );
      if (!rows[0]) {
        res.status(404).json({ error: 'Rutina o bloque no encontrado para este miembro' });
        return;
      }
      res.json({ success: true });
    })
  );
}
