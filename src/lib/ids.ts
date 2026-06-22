/** Normalize DB/JWT ids (BIGINT may arrive as string from node-pg). */
export function toDbId(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) {
    throw new Error('ID inválido');
  }
  return n;
}

export function sameUserId(a: unknown, b: unknown): boolean {
  return toDbId(a) === toDbId(b);
}
