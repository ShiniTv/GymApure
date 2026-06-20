/** Extract digits from a cédula string for fuzzy matching. */
export function cedulaDigits(raw: string): string {
  return raw.replace(/\D/g, '');
}

/** Canonical display form: V-{digits} when digits exist. */
export function canonicalCedula(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const digits = cedulaDigits(trimmed);
  if (digits.length < 5) return trimmed.toUpperCase();
  const prefixMatch = trimmed.match(/^([VEve])-/i);
  const letter = prefixMatch ? prefixMatch[1].toUpperCase() : 'V';
  return `${letter}-${digits}`;
}

/** SQL fragment: match cédula by exact, canonical, or digits-only. */
export function cedulaWhereClause(column: string, paramIndex: number): string {
  return `(
    ${column} = $${paramIndex}
    OR REGEXP_REPLACE(UPPER(COALESCE(${column}, '')), '[^0-9]', '', 'g') = REGEXP_REPLACE($${paramIndex}, '[^0-9]', '', 'g')
  )`;
}

export function normalizeCedulaInput(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}
