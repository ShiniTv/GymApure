/** Index-friendly filter for rows whose timestamp falls on the current calendar day. */
export function sqlTodayRange(column: string): string {
  return `${column} >= CURRENT_DATE AND ${column} < CURRENT_DATE + INTERVAL '1 day'`;
}
