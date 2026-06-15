import { query } from '../db/index.ts';

export const DEFAULT_EXPIRY_ALERT_DAYS = 7;

export interface ExpirySettings {
  expiry_alert_days: number;
  email_notifications_enabled: boolean;
  sms_notifications_enabled: boolean;
  whatsapp_notifications_enabled: boolean;
  notify_members_email: boolean;
  notify_members_sms: boolean;
  notify_members_whatsapp: boolean;
  notify_admin_email: boolean;
  notify_payment_events: boolean;
  notify_admin_new_payment: boolean;
  notify_routine_assigned: boolean;
}

const DEFAULTS: ExpirySettings = {
  expiry_alert_days: DEFAULT_EXPIRY_ALERT_DAYS,
  email_notifications_enabled: true,
  sms_notifications_enabled: false,
  whatsapp_notifications_enabled: false,
  notify_members_email: true,
  notify_members_sms: false,
  notify_members_whatsapp: false,
  notify_admin_email: true,
  notify_payment_events: true,
  notify_admin_new_payment: true,
  notify_routine_assigned: true,
};

const EXPIRY_KEYS = Object.keys(DEFAULTS) as (keyof ExpirySettings)[];

let cache: { settings: ExpirySettings; expiresAt: number } | null = null;
const CACHE_TTL_MS = 30_000;

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === 'true' || value === '1';
}

function parseSettingsRow(rows: { key: string; value: string }[]): ExpirySettings {
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const days = parseInt(map.get('expiry_alert_days') ?? String(DEFAULTS.expiry_alert_days), 10);
  return {
    expiry_alert_days: Number.isFinite(days) ? Math.min(90, Math.max(1, days)) : DEFAULTS.expiry_alert_days,
    email_notifications_enabled: parseBool(map.get('email_notifications_enabled'), DEFAULTS.email_notifications_enabled),
    sms_notifications_enabled: parseBool(map.get('sms_notifications_enabled'), DEFAULTS.sms_notifications_enabled),
    whatsapp_notifications_enabled: parseBool(map.get('whatsapp_notifications_enabled'), DEFAULTS.whatsapp_notifications_enabled),
    notify_members_email: parseBool(map.get('notify_members_email'), DEFAULTS.notify_members_email),
    notify_members_sms: parseBool(map.get('notify_members_sms'), DEFAULTS.notify_members_sms),
    notify_members_whatsapp: parseBool(map.get('notify_members_whatsapp'), DEFAULTS.notify_members_whatsapp),
    notify_admin_email: parseBool(map.get('notify_admin_email'), DEFAULTS.notify_admin_email),
    notify_payment_events: parseBool(map.get('notify_payment_events'), DEFAULTS.notify_payment_events),
    notify_admin_new_payment: parseBool(map.get('notify_admin_new_payment'), DEFAULTS.notify_admin_new_payment),
    notify_routine_assigned: parseBool(map.get('notify_routine_assigned'), DEFAULTS.notify_routine_assigned),
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
    expiry_alert_days: partial.expiry_alert_days != null
      ? Math.min(90, Math.max(1, partial.expiry_alert_days))
      : current.expiry_alert_days,
  };

  for (const key of EXPIRY_KEYS) {
    const value =
      key === 'expiry_alert_days' ? String(next.expiry_alert_days) : String(next[key]);
    await query(
      `INSERT INTO gym_settings (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [key, value]
    );
  }

  invalidateSettingsCache();
  return next;
}
