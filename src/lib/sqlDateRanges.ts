/** Index-friendly filter for rows whose timestamp falls on the current calendar day. */
export function sqlTodayRange(column: string): string {
  return `${column} >= CURRENT_DATE AND ${column} < CURRENT_DATE + INTERVAL '1 day'`;
}

/**
 * Index-friendly filter for the last N calendar days including today.
 * Uses half-open range on the raw timestamp (avoids `::date` casts that defeat btree).
 * `$param` is the number of days (integer).
 */
export function sqlLastNDaysRange(column: string, daysParam: number): string {
  return `${column} >= CURRENT_DATE - ($${daysParam}::int - 1) * INTERVAL '1 day'
    AND ${column} < CURRENT_DATE + INTERVAL '1 day'`;
}

/** Index-friendly filter for rows within an arbitrary date range. */
export function sqlDateRange(column: string, fromParam: number, toParam: number): string {
  return `${column} >= $${fromParam}::date AND ${column} < ($${toParam}::date + INTERVAL '1 day')`;
}

/** Index-friendly filter for rows with a timestamp in the last N hours. */
export function sqlRecentRange(column: string, hours: number): string {
  return `${column} >= NOW() - INTERVAL '${hours} hours'`;
}

/** SQL expression: compute duration in minutes between two timestamp columns. */
export function sqlDurationMinutes(endCol: string, startCol: string, coalesceMin = 1): string {
  return `GREATEST(${coalesceMin}, ROUND(EXTRACT(EPOCH FROM (${endCol} - ${startCol})) / 60))::int`;
}
