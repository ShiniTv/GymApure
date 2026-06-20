import { asyncRouter } from './middleware/asyncRouter.ts';
import { query } from '../db/index.ts';
import { authorize } from './middleware/auth.ts';

const router = asyncRouter();

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 100;

router.get('/', authorize(['admin']), async (req, res) => {
  const limit = Math.min(
    Math.max(parseInt(String(req.query.limit ?? DEFAULT_LIMIT), 10) || DEFAULT_LIMIT, 1),
    MAX_LIMIT
  );
  const actionFilter =
    typeof req.query.action === 'string' && req.query.action.trim()
      ? req.query.action.trim()
      : null;

  try {
    const params: unknown[] = [];
    let where = '';
    if (actionFilter) {
      where = ' WHERE a.action = $1';
      params.push(actionFilter);
    }

    params.push(limit);

    const { rows } = await query(
      `SELECT a.id, a.user_id, a.action, a.details, a.created_at,
              u.full_name AS user_name, u.email AS user_email
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.user_id
       ${where}
       ORDER BY a.created_at DESC
       LIMIT $${params.length}`,
      params
    );

    res.json(rows);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

export default router;
