import { Router } from 'express';
import { query } from '../db/index.ts';
import { authorize } from './middleware/auth.ts';

const router = Router();

router.get('/stats', authorize(['admin']), async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT COUNT(*)::int AS count FROM attendance
      WHERE check_in_time >= NOW() - INTERVAL '2 hours'
        AND check_out_time IS NULL
    `);
    res.json({ current_capacity: rows[0].count });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.get('/volume', authorize(['admin']), async (req, res) => {
  try {
    const { rows } = await query(`
      WITH RECURSIVE dates(date) AS (
        SELECT (CURRENT_DATE - INTERVAL '6 days')::date
        UNION ALL
        SELECT (date + INTERVAL '1 day')::date
        FROM dates
        WHERE date < CURRENT_DATE
      )
      SELECT
        dates.date,
        COALESCE(daily_counts.count, 0)::int AS count
      FROM dates
      LEFT JOIN (
        SELECT check_in_time::date AS check_date, COUNT(*)::int AS count
        FROM attendance
        WHERE check_in_time >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY check_in_time::date
      ) daily_counts ON dates.date = daily_counts.check_date
      ORDER BY dates.date ASC
    `);
    res.json(rows);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.get('/hourly', authorize(['admin']), async (req, res) => {
  try {
    const { rows } = await query(`
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
        WHERE check_in_time >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY EXTRACT(HOUR FROM check_in_time)
      ) hourly_counts ON hours.hour = hourly_counts.check_hour
      ORDER BY hours.hour ASC
    `);
    res.json(rows);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

export default router;
