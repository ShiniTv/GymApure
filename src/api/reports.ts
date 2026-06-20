import { asyncRouter } from './middleware/asyncRouter.ts';
import { query } from '../db/index.ts';
import { authorize } from './middleware/auth.ts';
import { parseDateParam, toCsv } from '../lib/csv.ts';

const router = asyncRouter();

function sendCsv(res: import('express').Response, filename: string, headers: string[], rows: unknown[][]) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(toCsv(headers, rows));
}

function buildDateFilter(column: string, from: string | null, to: string | null) {
  const clauses: string[] = [];
  const params: string[] = [];
  let idx = 1;

  if (from) {
    clauses.push(`${column}::date >= $${idx++}::date`);
    params.push(from);
  }
  if (to) {
    clauses.push(`${column}::date <= $${idx++}::date`);
    params.push(to);
  }

  return {
    sql: clauses.length > 0 ? ` AND ${clauses.join(' AND ')}` : '',
    params,
  };
}

router.get('/preview', authorize(['admin']), async (req, res) => {
  const from = parseDateParam(req.query.from);
  const to = parseDateParam(req.query.to);
  const paymentsFilter = buildDateFilter('p.created_at', from, to);
  const attendanceFilter = buildDateFilter('a.check_in_time', from, to);

  try {
    const [payments, attendance, members] = await Promise.all([
      query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM payments p WHERE 1=1${paymentsFilter.sql}`,
        paymentsFilter.params
      ),
      query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM attendance a WHERE 1=1${attendanceFilter.sql}`,
        attendanceFilter.params
      ),
      query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM users WHERE role = 'member'`,
        []
      ),
    ]);

    res.json({
      payments: parseInt(payments.rows[0]?.count || '0', 10),
      attendance: parseInt(attendance.rows[0]?.count || '0', 10),
      members: parseInt(members.rows[0]?.count || '0', 10),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.get('/payments', authorize(['admin']), async (req, res) => {
  const from = parseDateParam(req.query.from);
  const to = parseDateParam(req.query.to);
  const { sql, params } = buildDateFilter('p.created_at', from, to);

  try {
    const { rows } = await query<{
      id: number;
      created_at: Date | string;
      user_name: string;
      user_email: string;
      amount_usd: number;
      amount_bs: number | null;
      exchange_rate: number | null;
      method: string;
      reference: string | null;
      status: string;
    }>(
      `SELECT p.id, p.created_at, u.full_name AS user_name, u.email AS user_email,
              p.amount_usd, p.amount_bs, p.exchange_rate, p.method, p.reference, p.status
       FROM payments p
       JOIN users u ON u.id = p.user_id
       WHERE 1=1${sql}
       ORDER BY p.created_at DESC`,
      params
    );

    const csvRows = rows.map((r) => [
      r.id,
      new Date(r.created_at).toISOString(),
      r.user_name,
      r.user_email,
      r.amount_usd,
      r.amount_bs ?? '',
      r.exchange_rate ?? '',
      r.method,
      r.reference ?? '',
      r.status,
    ]);

    const suffix = from && to ? `${from}_${to}` : from || to || 'all';
    sendCsv(res, `pagos-${suffix}.csv`, [
      'ID',
      'Fecha',
      'Miembro',
      'Email',
      'Monto USD',
      'Monto Bs',
      'Tasa',
      'Método',
      'Referencia',
      'Estado',
    ], csvRows);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.get('/attendance', authorize(['admin']), async (req, res) => {
  const from = parseDateParam(req.query.from);
  const to = parseDateParam(req.query.to);
  const { sql, params } = buildDateFilter('a.check_in_time', from, to);

  try {
    const { rows } = await query<{
      id: number;
      full_name: string;
      cedula: string | null;
      check_in_time: Date | string;
      check_out_time: Date | string | null;
      duration_minutes: number | null;
    }>(
      `SELECT a.id, u.full_name, u.cedula, a.check_in_time, a.check_out_time,
              CASE
                WHEN a.check_out_time IS NOT NULL THEN
                  ROUND(EXTRACT(EPOCH FROM (a.check_out_time - a.check_in_time)) / 60)::int
                ELSE NULL
              END AS duration_minutes
       FROM attendance a
       JOIN users u ON u.id = a.user_id
       WHERE 1=1${sql}
       ORDER BY a.check_in_time DESC`,
      params
    );

    const csvRows = rows.map((r) => [
      r.id,
      r.full_name,
      r.cedula ?? '',
      new Date(r.check_in_time).toISOString(),
      r.check_out_time ? new Date(r.check_out_time).toISOString() : '',
      r.duration_minutes ?? '',
    ]);

    const suffix = from && to ? `${from}_${to}` : from || to || 'all';
    sendCsv(res, `asistencias-${suffix}.csv`, [
      'ID',
      'Miembro',
      'Cédula',
      'Entrada',
      'Salida',
      'Duración (min)',
    ], csvRows);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.get('/members', authorize(['admin']), async (_req, res) => {
  try {
    const { rows } = await query<{
      id: number;
      full_name: string;
      email: string;
      cedula: string | null;
      phone: string | null;
      status: string;
      membership_name: string | null;
      subscription_end: string | null;
      days_remaining: number | null;
    }>(`
      SELECT u.id, u.full_name, u.email, u.cedula, u.phone, u.status,
             sub.membership_name,
             sub.end_date::text AS subscription_end,
             sub.days_remaining
      FROM users u
      LEFT JOIN LATERAL (
        SELECT m.name AS membership_name, s.end_date,
               GREATEST(0, s.end_date - CURRENT_DATE)::int AS days_remaining
        FROM subscriptions s
        JOIN memberships m ON m.id = s.membership_id
        WHERE s.user_id = u.id AND s.status = 'active' AND s.end_date >= CURRENT_DATE
        ORDER BY s.end_date DESC
        LIMIT 1
      ) sub ON true
      WHERE u.role = 'member'
      ORDER BY u.full_name ASC
    `);

    const csvRows = rows.map((r) => [
      r.id,
      r.full_name,
      r.email,
      r.cedula ?? '',
      r.phone ?? '',
      r.status,
      r.membership_name ?? '',
      r.subscription_end ?? '',
      r.days_remaining ?? '',
    ]);

    sendCsv(res, 'miembros.csv', [
      'ID',
      'Nombre',
      'Email',
      'Cédula',
      'Teléfono',
      'Estado cuenta',
      'Membresía',
      'Vence',
      'Días restantes',
    ], csvRows);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

export default router;
