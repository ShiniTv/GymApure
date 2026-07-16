import { asyncRouter } from './middleware/asyncRouter.ts';
import { query } from '../db/index.ts';
import { authorize } from './middleware/auth.ts';
import { parseDateParam, toCsv } from '../lib/csv.ts';
import { activeSubscriptionLateralSql } from '../lib/subscriptions.ts';
import {
  buildReportPdf,
  formatDateRangeSubtitle,
  formatReportDate,
  formatReportDateOnly,
  formatReportMoney,
  formatReportStatus,
} from '../lib/reportPdf.ts';

const router = asyncRouter();

const MAX_EXPORT_ROWS = 50_000;
const MAX_EXPORT_RANGE_DAYS = 366;

function validateExportDateRange(from: string | null, to: string | null): string | null {
  if (!from || !to) return null;

  const fromMs = Date.parse(`${from}T00:00:00Z`);
  const toMs = Date.parse(`${to}T00:00:00Z`);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) {
    return 'Rango de fechas inválido';
  }
  if (toMs < fromMs) {
    return 'La fecha final debe ser posterior a la inicial';
  }

  const diffDays = Math.ceil((toMs - fromMs) / (1000 * 60 * 60 * 24));
  if (diffDays > MAX_EXPORT_RANGE_DAYS) {
    return `El rango máximo de exportación es ${MAX_EXPORT_RANGE_DAYS} días`;
  }

  return null;
}

function parseExportFormat(raw: unknown): 'csv' | 'pdf' {
  return String(raw ?? '').toLowerCase() === 'pdf' ? 'pdf' : 'csv';
}

function sendCsv(
  res: import('express').Response,
  filename: string,
  headers: string[],
  rows: unknown[][]
) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(toCsv(headers, rows));
}

function sendPdf(res: import('express').Response, filename: string, buffer: Buffer) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
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

function fileSuffix(from: string | null, to: string | null): string {
  return from && to ? `${from}_${to}` : (from ?? to ?? 'all');
}

interface PaymentRow {
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
}

interface AttendanceRow {
  id: number;
  full_name: string;
  cedula: string | null;
  check_in_time: Date | string;
  check_out_time: Date | string | null;
  duration_minutes: number | null;
}

interface MemberRow {
  id: number;
  full_name: string;
  email: string;
  cedula: string | null;
  phone: string | null;
  status: string;
  membership_name: string | null;
  subscription_end: string | null;
  days_remaining: number | null;
}

async function fetchPaymentsRows(from: string | null, to: string | null): Promise<PaymentRow[]> {
  const { sql, params } = buildDateFilter('p.created_at', from, to);
  const { rows } = await query<PaymentRow>(
    `SELECT p.id, p.created_at, u.full_name AS user_name, u.email AS user_email,
            p.amount_usd, p.amount_bs, p.exchange_rate, p.method, p.reference, p.status
     FROM payments p
     JOIN users u ON u.id = p.user_id
     WHERE 1=1${sql}
     ORDER BY p.created_at DESC
     LIMIT ${MAX_EXPORT_ROWS}`,
    params
  );
  return rows;
}

async function fetchAttendanceRows(
  from: string | null,
  to: string | null
): Promise<AttendanceRow[]> {
  const { sql, params } = buildDateFilter('a.check_in_time', from, to);
  const { rows } = await query<AttendanceRow>(
    `SELECT a.id, u.full_name, u.cedula, a.check_in_time, a.check_out_time,
            CASE
              WHEN a.check_out_time IS NOT NULL THEN
                ROUND(EXTRACT(EPOCH FROM (a.check_out_time - a.check_in_time)) / 60)::int
              ELSE NULL
            END AS duration_minutes
     FROM attendance a
     JOIN users u ON u.id = a.user_id
     WHERE 1=1${sql}
     ORDER BY a.check_in_time DESC
     LIMIT ${MAX_EXPORT_ROWS}`,
    params
  );
  return rows;
}

async function fetchMembersRows(): Promise<MemberRow[]> {
  const { rows } = await query<MemberRow>(`
      SELECT u.id, u.full_name, u.email, u.cedula, u.phone, u.status,
             sub.membership_name,
             sub.end_date::text AS subscription_end,
             sub.days_remaining
      FROM users u
      ${activeSubscriptionLateralSql()}
      WHERE u.role = 'member'
      ORDER BY u.full_name ASC
      LIMIT ${MAX_EXPORT_ROWS}
    `);
  return rows;
}

function tooManyRows(res: import('express').Response, count: number): boolean {
  if (count >= MAX_EXPORT_ROWS) {
    res.status(413).json({
      error: `La exportación supera el límite de ${MAX_EXPORT_ROWS.toLocaleString('es-VE')} filas. Acota el rango de fechas.`,
    });
    return true;
  }
  return false;
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
  const format = parseExportFormat(req.query.format);
  const rangeError = validateExportDateRange(from, to);
  if (rangeError) {
    res.status(400).json({ error: rangeError });
    return;
  }

  try {
    const rows = await fetchPaymentsRows(from, to);
    if (tooManyRows(res, rows.length)) return;

    const suffix = fileSuffix(from, to);

    if (format === 'pdf') {
      const totalUsd = rows.reduce((sum, r) => sum + Number(r.amount_usd), 0);
      const totalBs = rows.reduce((sum, r) => sum + Number(r.amount_bs ?? 0), 0);
      const buffer = await buildReportPdf({
        title: 'Reporte de pagos',
        subtitle: formatDateRangeSubtitle(from, to),
        summary: [
          { label: 'Registros', value: String(rows.length) },
          { label: 'Total USD', value: formatReportMoney(totalUsd, '$') },
          { label: 'Total Bs', value: formatReportMoney(totalBs, 'Bs ') },
        ],
        columns: [
          { key: 'fecha', label: 'Fecha', width: 1.4 },
          { key: 'miembro', label: 'Miembro', width: 1.6 },
          { key: 'usd', label: 'USD', width: 0.9, align: 'right' },
          { key: 'bs', label: 'Bs', width: 1, align: 'right' },
          { key: 'metodo', label: 'Método', width: 1 },
          { key: 'referencia', label: 'Referencia', width: 1.2 },
          { key: 'estado', label: 'Estado', width: 0.9 },
        ],
        rows: rows.map((r) => ({
          fecha: formatReportDate(r.created_at),
          miembro: r.user_name,
          usd: formatReportMoney(r.amount_usd),
          bs: formatReportMoney(r.amount_bs),
          metodo: r.method,
          referencia: r.reference ?? '—',
          estado: formatReportStatus(r.status),
        })),
      });
      sendPdf(res, `pagos-${suffix}.pdf`, buffer);
      return;
    }

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

    sendCsv(
      res,
      `pagos-${suffix}.csv`,
      [
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
      ],
      csvRows
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.get('/attendance', authorize(['admin']), async (req, res) => {
  const from = parseDateParam(req.query.from);
  const to = parseDateParam(req.query.to);
  const format = parseExportFormat(req.query.format);
  const rangeError = validateExportDateRange(from, to);
  if (rangeError) {
    res.status(400).json({ error: rangeError });
    return;
  }

  try {
    const rows = await fetchAttendanceRows(from, to);
    if (tooManyRows(res, rows.length)) return;

    const suffix = fileSuffix(from, to);

    if (format === 'pdf') {
      const withDuration = rows.filter((r) => r.duration_minutes != null);
      const avgDuration =
        withDuration.length > 0
          ? Math.round(
              withDuration.reduce((sum, r) => sum + Number(r.duration_minutes), 0) /
                withDuration.length
            )
          : null;

      const buffer = await buildReportPdf({
        title: 'Reporte de asistencias',
        subtitle: formatDateRangeSubtitle(from, to),
        summary: [
          { label: 'Check-ins', value: String(rows.length) },
          {
            label: 'Duración promedio',
            value: avgDuration != null ? `${avgDuration} min` : '—',
          },
        ],
        columns: [
          { key: 'miembro', label: 'Miembro', width: 1.8 },
          { key: 'cedula', label: 'Cédula', width: 1.1 },
          { key: 'entrada', label: 'Entrada', width: 1.5 },
          { key: 'salida', label: 'Salida', width: 1.5 },
          { key: 'duracion', label: 'Duración (min)', width: 1, align: 'right' },
        ],
        rows: rows.map((r) => ({
          miembro: r.full_name,
          cedula: r.cedula ?? '—',
          entrada: formatReportDate(r.check_in_time),
          salida: formatReportDate(r.check_out_time),
          duracion: r.duration_minutes != null ? String(r.duration_minutes) : '—',
        })),
      });
      sendPdf(res, `asistencias-${suffix}.pdf`, buffer);
      return;
    }

    const csvRows = rows.map((r) => [
      r.id,
      r.full_name,
      r.cedula ?? '',
      new Date(r.check_in_time).toISOString(),
      r.check_out_time ? new Date(r.check_out_time).toISOString() : '',
      r.duration_minutes ?? '',
    ]);

    sendCsv(
      res,
      `asistencias-${suffix}.csv`,
      ['ID', 'Miembro', 'Cédula', 'Entrada', 'Salida', 'Duración (min)'],
      csvRows
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.get('/members', authorize(['admin']), async (req, res) => {
  const format = parseExportFormat(req.query.format);

  try {
    const rows = await fetchMembersRows();

    if (format === 'pdf') {
      const active = rows.filter((r) => r.status === 'active').length;
      const buffer = await buildReportPdf({
        title: 'Reporte de miembros',
        subtitle: 'Listado actual de miembros',
        summary: [
          { label: 'Total', value: String(rows.length) },
          { label: 'Cuentas activas', value: String(active) },
        ],
        columns: [
          { key: 'nombre', label: 'Nombre', width: 1.6 },
          { key: 'email', label: 'Email', width: 1.8 },
          { key: 'cedula', label: 'Cédula', width: 1 },
          { key: 'membresia', label: 'Membresía', width: 1.2 },
          { key: 'vence', label: 'Vence', width: 1 },
          { key: 'dias', label: 'Días rest.', width: 0.8, align: 'right' },
          { key: 'estado', label: 'Estado', width: 0.8 },
        ],
        rows: rows.map((r) => ({
          nombre: r.full_name,
          email: r.email,
          cedula: r.cedula ?? '—',
          membresia: r.membership_name ?? '—',
          vence: formatReportDateOnly(r.subscription_end),
          dias: r.days_remaining != null ? String(r.days_remaining) : '—',
          estado: formatReportStatus(r.status),
        })),
      });
      sendPdf(res, 'miembros.pdf', buffer);
      return;
    }

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

    sendCsv(
      res,
      'miembros.csv',
      [
        'ID',
        'Nombre',
        'Email',
        'Cédula',
        'Teléfono',
        'Estado cuenta',
        'Membresía',
        'Vence',
        'Días restantes',
      ],
      csvRows
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

export default router;
