import { asyncRouter } from './middleware/asyncRouter.ts';
import { query } from '../db/index.ts';
import { requireAdmin } from './middleware/auth.ts';
import { parseDateParam } from '../lib/csv.ts';

const router = asyncRouter();

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;
const MAX_OFFSET = 10_000;

function parsePositiveInt(raw: unknown, fallback: number, max: number): number {
  const n = parseInt(String(raw ?? fallback), 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
}

function parseNonNegativeInt(raw: unknown, fallback: number, max: number): number {
  const n = parseInt(String(raw ?? fallback), 10);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.min(n, max);
}

router.get('/', requireAdmin, async (req, res) => {
  const limit = parsePositiveInt(req.query.limit, DEFAULT_LIMIT, MAX_LIMIT);
  const offset = parseNonNegativeInt(req.query.offset, 0, MAX_OFFSET);
  const actionFilter =
    typeof req.query.action === 'string' && req.query.action.trim()
      ? req.query.action.trim()
      : null;
  const userIdFilter = parseInt(String(req.query.user_id ?? ''), 10);
  const hasUserFilter = Number.isFinite(userIdFilter) && userIdFilter > 0;
  const fromDate = parseDateParam(req.query.from);
  const toDate = parseDateParam(req.query.to);

  try {
    const params: unknown[] = [];
    const clauses: string[] = [];
    let idx = 1;

    if (actionFilter) {
      clauses.push(`a.action = $${idx++}`);
      params.push(actionFilter);
    }
    if (hasUserFilter) {
      clauses.push(`a.user_id = $${idx++}`);
      params.push(userIdFilter);
    }
    if (fromDate) {
      clauses.push(`a.created_at::date >= $${idx++}::date`);
      params.push(fromDate);
    }
    if (toDate) {
      clauses.push(`a.created_at::date <= $${idx++}::date`);
      params.push(toDate);
    }

    const where = clauses.length > 0 ? ` WHERE ${clauses.join(' AND ')}` : '';

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM audit_logs a ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

    const listParams = [...params, limit, offset];
    const { rows } = await query(
      `SELECT a.id, a.user_id, a.action, a.details, a.created_at,
              u.full_name AS user_name, u.email AS user_email
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.user_id
       ${where}
       ORDER BY a.created_at DESC
       LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
      listParams
    );

    res.json({
      items: rows,
      total,
      limit,
      offset,
      hasMore: offset + rows.length < total,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

export default router;
