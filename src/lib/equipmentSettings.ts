import { query } from '../db/index.ts';

export const DEFAULT_EQUIPMENT_INSPECTION_ALERT_DAYS = 7;

let cache: { days: number; expiresAt: number } | null = null;
const CACHE_TTL_MS = 30_000;

export async function getEquipmentInspectionAlertDays(): Promise<number> {
  if (cache && Date.now() < cache.expiresAt) return cache.days;

  try {
    const { rows } = await query<{ value: string }>(
      `SELECT value FROM gym_settings WHERE key = 'equipment_inspection_alert_days' LIMIT 1`
    );
    const parsed = parseInt(rows[0]?.value ?? '', 10);
    const days = Number.isFinite(parsed)
      ? Math.min(90, Math.max(1, parsed))
      : DEFAULT_EQUIPMENT_INSPECTION_ALERT_DAYS;
    cache = { days, expiresAt: Date.now() + CACHE_TTL_MS };
    return days;
  } catch {
    return DEFAULT_EQUIPMENT_INSPECTION_ALERT_DAYS;
  }
}

export function invalidateEquipmentSettingsCache(): void {
  cache = null;
}
