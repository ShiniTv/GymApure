import { z } from 'zod';
import type { Router } from 'express';
import { query } from '../db/index.ts';
import { authorize, type AuthRequest } from './middleware/auth.ts';
import { requireMemberAccess } from './middleware/access.ts';
import { asyncHandler } from './middleware/asyncHandler.ts';
import { parsePaginationQuery, type PaginatedResult } from '../lib/pagination.ts';
import { formatZodError } from '../lib/passwordPolicy.ts';

const noteBodySchema = z.object({
  body: z.string().trim().min(1, 'Escribe una nota').max(4000, 'Máximo 4000 caracteres'),
});

export interface CoachNoteRow {
  id: number;
  member_id: number;
  author_id: number;
  author_name: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export function mountCoachNoteRoutes(router: Router) {
  router.get(
    '/:id/coach-notes',
    authorize(['trainer', 'admin']),
    requireMemberAccess('id', 'admin'),
    asyncHandler(async (req: AuthRequest, res) => {
      const memberId = parseInt(req.params.id, 10);
      if (Number.isNaN(memberId)) {
        res.status(400).json({ error: 'ID inválido' });
        return;
      }

      const { page, pageSize, offset } = parsePaginationQuery(req.query, { pageSize: 20 });

      const [countResult, listResult] = await Promise.all([
        query<{ count: string }>(
          `SELECT COUNT(*)::text AS count FROM coach_notes WHERE member_id = $1`,
          [memberId]
        ),
        query<CoachNoteRow>(
          `SELECT n.id, n.member_id, n.author_id, u.full_name AS author_name,
                  n.body, n.created_at::text, n.updated_at::text
           FROM coach_notes n
           JOIN users u ON u.id = n.author_id
           WHERE n.member_id = $1
           ORDER BY n.created_at DESC
           LIMIT $2 OFFSET $3`,
          [memberId, pageSize, offset]
        ),
      ]);

      const total = parseInt(countResult.rows[0]?.count || '0', 10);
      const payload: PaginatedResult<CoachNoteRow> = {
        items: listResult.rows,
        total,
        page,
        pageSize,
      };
      res.json(payload);
    })
  );

  router.post(
    '/:id/coach-notes',
    authorize(['trainer', 'admin']),
    requireMemberAccess('id', 'admin'),
    asyncHandler(async (req: AuthRequest, res) => {
      const memberId = parseInt(req.params.id, 10);
      if (Number.isNaN(memberId)) {
        res.status(400).json({ error: 'ID inválido' });
        return;
      }

      const parsed = noteBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: formatZodError(parsed.error) });
        return;
      }

      const { rows } = await query<CoachNoteRow>(
        `INSERT INTO coach_notes (member_id, author_id, body)
         VALUES ($1, $2, $3)
         RETURNING id, member_id, author_id, body,
                   created_at::text, updated_at::text`,
        [memberId, req.user!.id, parsed.data.body]
      );

      const note = rows[0];
      res.status(201).json({
        ...note,
        author_name: req.user!.name ?? 'Entrenador',
      });
    })
  );

  router.patch(
    '/:id/coach-notes/:noteId',
    authorize(['trainer', 'admin']),
    requireMemberAccess('id', 'admin'),
    asyncHandler(async (req: AuthRequest, res) => {
      const memberId = parseInt(req.params.id, 10);
      const noteId = parseInt(req.params.noteId, 10);
      if (Number.isNaN(memberId) || Number.isNaN(noteId)) {
        res.status(400).json({ error: 'ID inválido' });
        return;
      }

      const parsed = noteBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: formatZodError(parsed.error) });
        return;
      }

      const isAdmin = req.user!.role === 'admin';
      const { rows } = await query<CoachNoteRow>(
        `UPDATE coach_notes
         SET body = $1, updated_at = NOW()
         WHERE id = $2 AND member_id = $3
           AND ($4::boolean OR author_id = $5)
         RETURNING id, member_id, author_id, body,
                   created_at::text, updated_at::text`,
        [parsed.data.body, noteId, memberId, isAdmin, req.user!.id]
      );

      if (!rows[0]) {
        res.status(404).json({ error: 'Nota no encontrada o sin permiso para editarla' });
        return;
      }

      const author = await query<{ full_name: string }>(
        'SELECT full_name FROM users WHERE id = $1',
        [rows[0].author_id]
      );
      res.json({
        ...rows[0],
        author_name: author.rows[0]?.full_name ?? 'Entrenador',
      });
    })
  );

  router.delete(
    '/:id/coach-notes/:noteId',
    authorize(['trainer', 'admin']),
    requireMemberAccess('id', 'admin'),
    asyncHandler(async (req: AuthRequest, res) => {
      const memberId = parseInt(req.params.id, 10);
      const noteId = parseInt(req.params.noteId, 10);
      if (Number.isNaN(memberId) || Number.isNaN(noteId)) {
        res.status(400).json({ error: 'ID inválido' });
        return;
      }

      const isAdmin = req.user!.role === 'admin';
      const { rows } = await query<{ id: number }>(
        `DELETE FROM coach_notes
         WHERE id = $1 AND member_id = $2
           AND ($3::boolean OR author_id = $4)
         RETURNING id`,
        [noteId, memberId, isAdmin, req.user!.id]
      );

      if (!rows[0]) {
        res.status(404).json({ error: 'Nota no encontrada o sin permiso para eliminarla' });
        return;
      }
      res.json({ success: true });
    })
  );
}
