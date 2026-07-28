import { z } from 'zod';
import type { Router } from 'express';
import { query } from '../../db/index.ts';
import { requireMemberAccess } from '../middleware/access.ts';
import { asyncHandler } from '../middleware/asyncHandler.ts';
import { formatZodError } from '../../lib/passwordPolicy.ts';

const measurementSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
    .optional(),
  weight: z.coerce.number().positive('Peso inválido').max(500).optional().nullable(),
  body_fat_percentage: z.coerce.number().min(0).max(100).optional().nullable(),
  waist: z.coerce.number().positive('Medida inválida').max(300).optional().nullable(),
  arm: z.coerce.number().positive('Medida inválida').max(300).optional().nullable(),
  leg: z.coerce.number().positive('Medida inválida').max(300).optional().nullable(),
});

async function findUserMeasurement(userId: number, measurementId: number) {
  const { rows } = await query<{ id: number }>(
    'SELECT id FROM user_measurements WHERE id = $1 AND user_id = $2',
    [measurementId, userId]
  );
  return rows[0] ?? null;
}

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Error interno';
}

export function mountUserMeasurementRoutes(router: Router): void {
  router.get('/:id/measurements', requireMemberAccess('id', 'admin'), async (req, res) => {
    try {
      const { rows } = await query(
        `SELECT id, date, weight, body_fat_percentage, waist, arm, leg, created_at
         FROM user_measurements
         WHERE user_id = $1
         ORDER BY date DESC, created_at DESC
         LIMIT 50`,
        [req.params.id]
      );
      res.json(rows);
    } catch (err: unknown) {
      res.status(500).json({ error: getErrorMessage(err) });
    }
  });

  router.post('/:id/measurements', requireMemberAccess('id', 'admin'), async (req, res) => {
    const parsed = measurementSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: formatZodError(parsed.error) });
    }

    const { date, weight, body_fat_percentage, waist, arm, leg } = parsed.data;
    try {
      const { rows } = await query(
        `INSERT INTO user_measurements (user_id, date, weight, body_fat_percentage, waist, arm, leg)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, date, weight, body_fat_percentage, waist, arm, leg, created_at`,
        [
          req.params.id,
          date || new Date().toISOString().split('T')[0],
          weight ?? null,
          body_fat_percentage ?? null,
          waist ?? null,
          arm ?? null,
          leg ?? null,
        ]
      );
      res.status(201).json(rows[0]);
    } catch (err: unknown) {
      res.status(500).json({ error: getErrorMessage(err) });
    }
  });

  router.patch(
    '/:id/measurements/:measurementId',
    requireMemberAccess('id', 'admin'),
    asyncHandler(async (req, res) => {
      const userId = parseInt(req.params.id, 10);
      const measurementId = parseInt(req.params.measurementId, 10);
      if (Number.isNaN(userId) || Number.isNaN(measurementId)) {
        res.status(400).json({ error: 'ID inválido' });
        return;
      }

      const parsed = measurementSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: formatZodError(parsed.error) });
        return;
      }

      const existing = await findUserMeasurement(userId, measurementId);
      if (!existing) {
        res.status(404).json({ error: 'Medición no encontrada' });
        return;
      }

      const data = parsed.data;
      const fields = ['date', 'weight', 'body_fat_percentage', 'waist', 'arm', 'leg'] as const;
      const sets: string[] = [];
      const params: unknown[] = [];

      for (const key of fields) {
        if (key in data) {
          sets.push(`${key} = $${params.length + 1}`);
          params.push(data[key] ?? null);
        }
      }

      if (sets.length === 0) {
        res.status(400).json({ error: 'No hay campos para actualizar' });
        return;
      }

      params.push(measurementId, userId);
      const { rows } = await query(
        `UPDATE user_measurements SET ${sets.join(', ')}
         WHERE id = $${params.length - 1} AND user_id = $${params.length}
         RETURNING id, date, weight, body_fat_percentage, waist, arm, leg, created_at`,
        params
      );

      res.json(rows[0]);
    })
  );

  router.delete(
    '/:id/measurements/:measurementId',
    requireMemberAccess('id', 'admin'),
    asyncHandler(async (req, res) => {
      const userId = parseInt(req.params.id, 10);
      const measurementId = parseInt(req.params.measurementId, 10);
      if (Number.isNaN(userId) || Number.isNaN(measurementId)) {
        res.status(400).json({ error: 'ID inválido' });
        return;
      }

      const existing = await findUserMeasurement(userId, measurementId);
      if (!existing) {
        res.status(404).json({ error: 'Medición no encontrada' });
        return;
      }

      await query('DELETE FROM user_measurements WHERE id = $1 AND user_id = $2', [
        measurementId,
        userId,
      ]);
      res.json({ success: true });
    })
  );
}
