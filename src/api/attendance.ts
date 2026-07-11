import { asyncRouter } from './middleware/asyncRouter.ts';
import { query } from '../db/index.ts';
import { authorize } from './middleware/auth.ts';
import { sqlTodayRange, sqlRecentRange, sqlDurationMinutes } from '../lib/sqlDateRanges.ts';
import { RECEPTION_OPERATORS } from '../lib/roles.ts';

const router = asyncRouter();

type ChartPeriod = 7 | 30 | 90;

function parseChartPeriod(raw: unknown): ChartPeriod {
  const n = parseInt(String(raw ?? 7), 10);
  if (n === 30 || n === 90) return n;
  return 7;
}

function parseInactiveDays(raw: unknown): number {
  const n = parseInt(String(raw ?? 14), 10);
  if (Number.isNaN(n)) return 14;
  return Math.min(90, Math.max(7, n));
}

router.get('/stats', authorize(RECEPTION_OPERATORS), async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT COUNT(*)::int AS count FROM attendance
      WHERE ${sqlRecentRange('check_in_time', 2)}
        AND check_out_time IS NULL
    `);
    res.json({ current_capacity: rows[0].count });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.get('/inside', authorize(RECEPTION_OPERATORS), async (_req, res) => {
  try {
    const { rows } = await query<{
      id: number;
      full_name: string;
      cedula: string | null;
      check_in_time: Date | string;
    }>(`
      SELECT a.id, u.full_name, u.cedula, a.check_in_time
      FROM attendance a
      JOIN users u ON u.id = a.user_id
      WHERE ${sqlTodayRange('a.check_in_time')} AND a.check_out_time IS NULL
      ORDER BY a.check_in_time DESC
    `);
    res.json({ count: rows.length, members: rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.get('/today', authorize(RECEPTION_OPERATORS), async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

  try {
    const params: string[] = [];
    let searchSql = '';
    if (q) {
      params.push(`%${q.toLowerCase()}%`);
      searchSql = ` AND (LOWER(u.full_name) LIKE $1 OR LOWER(COALESCE(u.cedula, '')) LIKE $1)`;
    }

    const { rows } = await query<{
      id: number;
      full_name: string;
      cedula: string | null;
      check_in_time: Date | string;
      check_out_time: Date | string | null;
      duration_minutes: number | null;
      is_inside: boolean;
    }>(
      `SELECT a.id, u.full_name, u.cedula, a.check_in_time, a.check_out_time,
              ${sqlDurationMinutes('a.check_out_time', 'a.check_in_time')} AS duration_minutes,
              (a.check_out_time IS NULL) AS is_inside
       FROM attendance a
       JOIN users u ON u.id = a.user_id
       WHERE ${sqlTodayRange('a.check_in_time')}${searchSql}
       ORDER BY a.check_in_time DESC`,
      params
    );
    res.json(rows);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.get('/volume', authorize(['admin']), async (req, res) => {
  const days = parseChartPeriod(req.query.days);

  try {
    const { rows } = await query(
      `
      WITH RECURSIVE dates(date) AS (
        SELECT (CURRENT_DATE - ($1 - 1) * INTERVAL '1 day')::date
        UNION ALL
        SELECT (date + INTERVAL '1 day')::date
        FROM dates
        WHERE date < CURRENT_DATE
      )
      SELECT
        dates.date::text AS date,
        COALESCE(daily_counts.count, 0)::int AS count
      FROM dates
      LEFT JOIN (
        SELECT check_in_time::date AS check_date, COUNT(*)::int AS count
        FROM attendance
        WHERE check_in_time::date >= CURRENT_DATE - ($1 - 1) * INTERVAL '1 day'
        GROUP BY check_in_time::date
      ) daily_counts ON dates.date = daily_counts.check_date
      ORDER BY dates.date ASC
    `,
      [days]
    );
    res.json(rows);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.get('/hourly', authorize(['admin']), async (req, res) => {
  const days = parseChartPeriod(req.query.days);

  try {
    const { rows } = await query(
      `
      WITH RECURSIVE hours(hour) AS (
        SELECT 6
        UNION ALL
        SELECT hour + 1
        FROM hours
        WHERE hour < 22
      )
      SELECT
        hours.hour,
        COALESCE(hourly_counts.count, 0)::int AS count
      FROM hours
      LEFT JOIN (
        SELECT EXTRACT(HOUR FROM check_in_time)::int AS check_hour, COUNT(*)::int AS count
        FROM attendance
        WHERE check_in_time::date >= CURRENT_DATE - ($1 - 1) * INTERVAL '1 day'
        GROUP BY EXTRACT(HOUR FROM check_in_time)
      ) hourly_counts ON hours.hour = hourly_counts.check_hour
      ORDER BY hours.hour ASC
    `,
      [days]
    );
    res.json(rows);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.get('/inactive', authorize(['admin']), async (req, res) => {
  const days = parseInactiveDays(req.query.days);

  try {
    const { rows } = await query<{
      id: number;
      full_name: string;
      cedula: string | null;
      email: string;
      last_check_in: Date | string | null;
      days_since: number | null;
    }>(
      `
      SELECT u.id, u.full_name, u.cedula, u.email,
             MAX(a.check_in_time) AS last_check_in,
             CASE
               WHEN MAX(a.check_in_time) IS NULL THEN NULL
               ELSE (CURRENT_DATE - MAX(a.check_in_time::date))::int
             END AS days_since
      FROM users u
      LEFT JOIN attendance a ON a.user_id = u.id
      WHERE u.role = 'member' AND u.status = 'active'
      GROUP BY u.id, u.full_name, u.cedula, u.email
      HAVING MAX(a.check_in_time) IS NULL
         OR MAX(a.check_in_time::date) <= CURRENT_DATE - $1::int
      ORDER BY days_since DESC NULLS FIRST, u.full_name ASC
      LIMIT 100
    `,
      [days]
    );
    res.json({ days, members: rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.get('/heatmap', authorize(['admin']), async (req, res) => {
  const days = parseChartPeriod(req.query.days);

  try {
    const { rows } = await query<{ dow: number; hour: number; count: number }>(
      `
      SELECT
        EXTRACT(DOW FROM check_in_time)::int AS dow,
        EXTRACT(HOUR FROM check_in_time)::int AS hour,
        COUNT(*)::int AS count
      FROM attendance
      WHERE check_in_time::date >= CURRENT_DATE - ($1 - 1) * INTERVAL '1 day'
        AND EXTRACT(HOUR FROM check_in_time) BETWEEN 6 AND 22
      GROUP BY dow, hour
      ORDER BY dow, hour
    `,
      [days]
    );
    res.json({ days, cells: rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.get('/week-comparison', authorize(['admin']), async (_req, res) => {
  try {
    const { rows: metaRows } = await query<{
      this_week_start: string;
      last_week_start: string;
      last_week_end: string;
    }>(`
      SELECT
        date_trunc('week', CURRENT_DATE)::date::text AS this_week_start,
        (date_trunc('week', CURRENT_DATE) - INTERVAL '7 days')::date::text AS last_week_start,
        (date_trunc('week', CURRENT_DATE) - INTERVAL '1 day')::date::text AS last_week_end
    `);
    const meta = metaRows[0];

    const { rows: thisWeekDays } = await query<{ date: string; count: number }>(
      `
      WITH bounds AS (
        SELECT date_trunc('week', CURRENT_DATE)::date AS week_start
      )
      SELECT gs.date::text AS date, COALESCE(c.count, 0)::int AS count
      FROM bounds b
      CROSS JOIN generate_series(b.week_start, CURRENT_DATE, '1 day'::interval) AS gs(date)
      LEFT JOIN (
        SELECT check_in_time::date AS d, COUNT(*)::int AS count
        FROM attendance
        WHERE check_in_time::date >= (SELECT week_start FROM bounds)
        GROUP BY check_in_time::date
      ) c ON c.d = gs.date::date
      ORDER BY gs.date ASC
    `
    );

    const { rows: lastWeekDays } = await query<{ date: string; count: number }>(
      `
      WITH bounds AS (
        SELECT
          (date_trunc('week', CURRENT_DATE) - INTERVAL '7 days')::date AS week_start,
          (date_trunc('week', CURRENT_DATE) - INTERVAL '1 day')::date AS week_end
      )
      SELECT gs.date::text AS date, COALESCE(c.count, 0)::int AS count
      FROM bounds b
      CROSS JOIN generate_series(b.week_start, b.week_end, '1 day'::interval) AS gs(date)
      LEFT JOIN (
        SELECT check_in_time::date AS d, COUNT(*)::int AS count
        FROM attendance
        WHERE check_in_time::date >= (SELECT week_start FROM bounds)
          AND check_in_time::date <= (SELECT week_end FROM bounds)
        GROUP BY check_in_time::date
      ) c ON c.d = gs.date::date
      ORDER BY gs.date ASC
    `
    );

    const { rows: totals } = await query<{ this_total: number; last_total: number }>(`
      SELECT
        (SELECT COUNT(*)::int FROM attendance
         WHERE check_in_time::date >= date_trunc('week', CURRENT_DATE)::date
           AND check_in_time::date <= CURRENT_DATE) AS this_total,
        (SELECT COUNT(*)::int FROM attendance
         WHERE check_in_time::date >= (date_trunc('week', CURRENT_DATE) - INTERVAL '7 days')::date
           AND check_in_time::date < date_trunc('week', CURRENT_DATE)::date) AS last_total
    `);

    const thisTotal = totals[0]?.this_total ?? 0;
    const lastTotal = totals[0]?.last_total ?? 0;
    const changePercent =
      lastTotal > 0 ? Math.round(((thisTotal - lastTotal) / lastTotal) * 100) : null;

    res.json({
      this_week: {
        start: meta.this_week_start,
        days: thisWeekDays,
        total: thisTotal,
      },
      last_week: {
        start: meta.last_week_start,
        end: meta.last_week_end,
        days: lastWeekDays,
        total: lastTotal,
      },
      change_percent: changePercent,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

export default router;
