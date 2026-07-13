import { query } from '../db/index.ts';

export const DEFAULT_EXPIRY_ALERT_DAYS = 7;

export interface ExpirySettings {
  expiry_alert_days: number;
}

const DEFAULTS: ExpirySettings = {
  expiry_alert_days: DEFAULT_EXPIRY_ALERT_DAYS,
};

const EXPIRY_KEYS = Object.keys(DEFAULTS) as (keyof ExpirySettings)[];

let cache: { settings: ExpirySettings; expiresAt: number } | null = null;
const CACHE_TTL_MS = 30_000;

function parseSettingsRow(rows: { key: string; value: string }[]): ExpirySettings {
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const days = parseInt(map.get('expiry_alert_days') ?? String(DEFAULTS.expiry_alert_days), 10);
  return {
    expiry_alert_days: Number.isFinite(days)
      ? Math.min(90, Math.max(1, days))
      : DEFAULTS.expiry_alert_days,
  };
}

export async function getExpirySettings(): Promise<ExpirySettings> {
  if (cache && Date.now() < cache.expiresAt) {
    return cache.settings;
  }

  try {
    const { rows } = await query<{ key: string; value: string }>(
      `SELECT key, value FROM gym_settings WHERE key = ANY($1::text[])`,
      [EXPIRY_KEYS]
    );
    const settings = rows.length > 0 ? parseSettingsRow(rows) : { ...DEFAULTS };
    cache = { settings, expiresAt: Date.now() + CACHE_TTL_MS };
    return settings;
  } catch {
    return { ...DEFAULTS };
  }
}

export async function getExpiryAlertDays(): Promise<number> {
  const settings = await getExpirySettings();
  return settings.expiry_alert_days;
}

export function invalidateSettingsCache(): void {
  cache = null;
}

export async function updateExpirySettings(
  partial: Partial<ExpirySettings>
): Promise<ExpirySettings> {
  const current = await getExpirySettings();
  const next: ExpirySettings = {
    ...current,
    ...partial,
    expiry_alert_days:
      partial.expiry_alert_days != null
        ? Math.min(90, Math.max(1, partial.expiry_alert_days))
        : current.expiry_alert_days,
  };

  await Promise.all(
    EXPIRY_KEYS.map((key) => {
      const value = String(next[key]);
      return query(
        `INSERT INTO gym_settings (key, value, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [key, value]
      );
    })
  );

  invalidateSettingsCache();
  return next;
}
