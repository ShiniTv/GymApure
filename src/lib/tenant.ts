/** Default tenant until multi-sede is enabled. */
export const DEFAULT_GYM_ID = 1;

/** Session / request helper once JWT carries gym_id (today always default). */
export function resolveRequestGymId(user?: { gym_id?: number | null }): number {
  const raw = user?.gym_id;
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return raw;
  return DEFAULT_GYM_ID;
}
