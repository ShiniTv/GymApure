import { query } from '../db/index.ts';

export async function logAudit(
  userId: number | null | undefined,
  action: string,
  details?: Record<string, unknown> | string
) {
  const detailsText =
    typeof details === 'string' ? details : details ? JSON.stringify(details) : null;

  await query(
    'INSERT INTO audit_logs (user_id, action, details) VALUES ($1, $2, $3)',
    [userId ?? null, action, detailsText]
  );
}
