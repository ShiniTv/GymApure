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
  const prefixMatch = /^([VEve])-/i.exec(trimmed);
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

export function validateCedula(value: string): string | null {
  if (!value.trim()) return 'La cédula es obligatoria para el check-in';
  const cedulaRegex = /^([VEve]-)?\d{5,10}$/;
  if (!cedulaRegex.test(value.trim())) return 'Formato de cédula inválido (ej: V-12345678)';
  return null;
}

export function validateEmail(value: string): string | null {
  if (!value.trim()) return 'El email es obligatorio';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) return 'Email inválido';
  return null;
}

export function validatePassword(value: string): string | null {
  if (!value || value.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
  return null;
}

export function validatePasswordMatch(password: string, confirm: string): string | null {
  if (password !== confirm) return 'Las contraseñas no coinciden';
  return null;
}

export function validateFullName(value: string): string | null {
  if (!value.trim()) return 'El nombre es obligatorio';
  if (value.trim().length < 3) return 'El nombre debe tener al menos 3 caracteres';
  return null;
}

export function validateNotEmpty(value: string, fieldName: string): string | null {
  if (!value.trim()) return `${fieldName} es obligatorio`;
  return null;
}
