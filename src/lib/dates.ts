import { format, parseISO, type Locale } from 'date-fns';

/** Parse a Postgres DATE / `YYYY-MM-DD` string as local calendar date (no UTC day shift). */
export function parseDateOnly(value: string): Date {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return parseISO(`${trimmed}T12:00:00`);
  }
  return parseISO(trimmed);
}

export function formatDateOnly(
  value: string,
  pattern: string,
  options?: { locale?: Locale }
): string {
  return format(parseDateOnly(value), pattern, options);
}
