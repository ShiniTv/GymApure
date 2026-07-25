import { query } from '../db/index.ts';

export const DEFAULT_EXPIRY_ALERT_DAYS = 7;

/** 0 = no auto-delete. Allowed presets for admin UI. */
export const DEFAULT_CHAT_MESSAGE_RETENTION_DAYS = 90;
export const CHAT_MESSAGE_RETENTION_OPTIONS = [0, 30, 60, 90, 180] as const;
export type ChatMessageRetentionDays = (typeof CHAT_MESSAGE_RETENTION_OPTIONS)[number];

export interface ExpirySettings {
  expiry_alert_days: number;
}

export interface ChatRetentionSettings {
  /** Days to keep chat messages; 0 disables automatic purge. */
  chat_message_retention_days: number;
}

const DEFAULTS: ExpirySettings = {
  expiry_alert_days: DEFAULT_EXPIRY_ALERT_DAYS,
};

const CHAT_RETENTION_DEFAULTS: ChatRetentionSettings = {
  chat_message_retention_days: DEFAULT_CHAT_MESSAGE_RETENTION_DAYS,
};

const EXPIRY_KEYS = Object.keys(DEFAULTS) as (keyof ExpirySettings)[];
const CHAT_RETENTION_KEYS = Object.keys(CHAT_RETENTION_DEFAULTS) as (keyof ChatRetentionSettings)[];

let cache: { settings: ExpirySettings; expiresAt: number } | null = null;
let chatRetentionCache: { settings: ChatRetentionSettings; expiresAt: number } | null = null;
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

function clampChatRetentionDays(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  const allowed = CHAT_MESSAGE_RETENTION_OPTIONS.filter((d) => d > 0);
  if ((allowed as readonly number[]).includes(raw)) return raw;
  // Nearest allowed preset (30–180)
  return allowed.reduce((best, d) => (Math.abs(d - raw) < Math.abs(best - raw) ? d : best), 90);
}

function parseChatRetentionRow(rows: { key: string; value: string }[]): ChatRetentionSettings {
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const days = parseInt(
    map.get('chat_message_retention_days') ??
      String(CHAT_RETENTION_DEFAULTS.chat_message_retention_days),
    10
  );
  return {
    chat_message_retention_days: clampChatRetentionDays(days),
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

export async function getChatRetentionSettings(): Promise<ChatRetentionSettings> {
  if (chatRetentionCache && Date.now() < chatRetentionCache.expiresAt) {
    return chatRetentionCache.settings;
  }

  try {
    const { rows } = await query<{ key: string; value: string }>(
      `SELECT key, value FROM gym_settings WHERE key = ANY($1::text[])`,
      [CHAT_RETENTION_KEYS]
    );
    const settings = rows.length > 0 ? parseChatRetentionRow(rows) : { ...CHAT_RETENTION_DEFAULTS };
    chatRetentionCache = { settings, expiresAt: Date.now() + CACHE_TTL_MS };
    return settings;
  } catch {
    return { ...CHAT_RETENTION_DEFAULTS };
  }
}

export function invalidateSettingsCache(): void {
  cache = null;
  chatRetentionCache = null;
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

export async function updateChatRetentionSettings(
  partial: Partial<ChatRetentionSettings>
): Promise<ChatRetentionSettings> {
  const current = await getChatRetentionSettings();
  const next: ChatRetentionSettings = {
    chat_message_retention_days:
      partial.chat_message_retention_days != null
        ? clampChatRetentionDays(partial.chat_message_retention_days)
        : current.chat_message_retention_days,
  };

  await Promise.all(
    CHAT_RETENTION_KEYS.map((key) => {
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
