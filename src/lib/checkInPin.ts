import { query } from '../db/index.ts';
import { invalidateSettingsCache } from './gymSettings.ts';

export interface CheckInPinSettings {
  check_in_pin: string;
  require_self_check_in_pin: boolean;
}

const DEFAULTS: CheckInPinSettings = {
  check_in_pin: '',
  require_self_check_in_pin: false,
};

let pinCache: { settings: CheckInPinSettings; expiresAt: number } | null = null;
const CACHE_TTL_MS = 15_000;

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value == null) return fallback;
  const v = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(v)) return true;
  if (['0', 'false', 'no', 'off'].includes(v)) return false;
  return fallback;
}

export async function getCheckInPinSettings(): Promise<CheckInPinSettings> {
  if (pinCache && Date.now() < pinCache.expiresAt) {
    return pinCache.settings;
  }

  try {
    const { rows } = await query<{ key: string; value: string }>(
      `SELECT key, value FROM gym_settings
       WHERE key = ANY($1::text[])`,
      [['check_in_pin', 'require_self_check_in_pin']]
    );
    const map = new Map(rows.map((r) => [r.key, r.value]));
    const settings: CheckInPinSettings = {
      check_in_pin: (map.get('check_in_pin') ?? DEFAULTS.check_in_pin).trim(),
      require_self_check_in_pin: parseBool(
        map.get('require_self_check_in_pin'),
        DEFAULTS.require_self_check_in_pin
      ),
    };
    pinCache = { settings, expiresAt: Date.now() + CACHE_TTL_MS };
    return settings;
  } catch {
    return { ...DEFAULTS };
  }
}

export function invalidateCheckInPinCache(): void {
  pinCache = null;
}

export async function updateCheckInPinSettings(
  partial: Partial<CheckInPinSettings>
): Promise<CheckInPinSettings> {
  const current = await getCheckInPinSettings();
  const next: CheckInPinSettings = {
    check_in_pin:
      partial.check_in_pin != null
        ? String(partial.check_in_pin).trim().slice(0, 12)
        : current.check_in_pin,
    require_self_check_in_pin:
      partial.require_self_check_in_pin != null
        ? Boolean(partial.require_self_check_in_pin)
        : current.require_self_check_in_pin,
  };

  await Promise.all([
    query(
      `INSERT INTO gym_settings (key, value, updated_at)
       VALUES ('check_in_pin', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [next.check_in_pin]
    ),
    query(
      `INSERT INTO gym_settings (key, value, updated_at)
       VALUES ('require_self_check_in_pin', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [next.require_self_check_in_pin ? 'true' : 'false']
    ),
  ]);

  invalidateCheckInPinCache();
  invalidateSettingsCache();
  return next;
}

/** Returns null if PIN is valid / not required; otherwise an error message. */
export async function validateSelfCheckInPin(
  pin: string | undefined | null
): Promise<string | null> {
  const settings = await getCheckInPinSettings();
  if (!settings.require_self_check_in_pin) return null;
  if (!settings.check_in_pin) {
    return 'El gym exige PIN de presencia, pero aún no está configurado. Pide el PIN en recepción.';
  }
  if (!pin || String(pin).trim() !== settings.check_in_pin) {
    return 'PIN de presencia incorrecto. Pídelo en recepción.';
  }
  return null;
}
