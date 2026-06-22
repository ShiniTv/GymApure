-- In-app chat: conversations, messages, and system message deduplication log

CREATE TABLE chat_conversations (
  id BIGSERIAL PRIMARY KEY,
  member_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_conversations_last_message
  ON chat_conversations (last_message_at DESC);

CREATE TYPE chat_message_kind AS ENUM ('text', 'system');

CREATE TYPE chat_event_type AS ENUM (
  'manual',
  'expiring_soon',
  'expired',
  'payment_reported',
  'payment_approved',
  'payment_rejected',
  'routine_assigned'
);

CREATE TABLE chat_messages (
  id BIGSERIAL PRIMARY KEY,
  conversation_id BIGINT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  kind chat_message_kind NOT NULL DEFAULT 'text',
  event_type chat_event_type NOT NULL DEFAULT 'manual',
  metadata JSONB DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_conversation_created
  ON chat_messages (conversation_id, created_at DESC);

CREATE INDEX idx_chat_messages_conversation_id
  ON chat_messages (conversation_id);

-- Migrate expiry_notification_log -> chat_system_log (dedup for automated chat messages)
ALTER TABLE expiry_notification_log RENAME TO chat_system_log;

ALTER TABLE chat_system_log DROP CONSTRAINT IF EXISTS expiry_notification_log_channel_check;
ALTER TABLE chat_system_log DROP COLUMN IF EXISTS channel;

DELETE FROM chat_system_log WHERE alert_type = 'admin_digest';

ALTER TABLE chat_system_log DROP CONSTRAINT IF EXISTS expiry_notification_log_alert_type_check;
ALTER TABLE chat_system_log
  ADD CONSTRAINT chat_system_log_alert_type_check
  CHECK (alert_type IN (
    'expiring_soon',
    'expired',
    'payment_reported',
    'payment_approved',
    'payment_rejected',
    'routine_assigned'
  ));

ALTER TABLE chat_system_log ADD COLUMN IF NOT EXISTS metadata_key TEXT;

DROP INDEX IF EXISTS idx_expiry_notif_daily;
DROP INDEX IF EXISTS idx_expiry_notif_once;

CREATE UNIQUE INDEX idx_chat_system_log_expiring_daily
  ON chat_system_log (subscription_id, alert_type, notification_date)
  WHERE alert_type = 'expiring_soon' AND subscription_id IS NOT NULL;

CREATE UNIQUE INDEX idx_chat_system_log_expired_once
  ON chat_system_log (subscription_id, alert_type)
  WHERE alert_type = 'expired' AND subscription_id IS NOT NULL;

CREATE UNIQUE INDEX idx_chat_system_log_event_once
  ON chat_system_log (user_id, alert_type, metadata_key)
  WHERE metadata_key IS NOT NULL;

-- Remove obsolete notification settings
DELETE FROM gym_settings
WHERE key LIKE 'notify_%'
   OR key LIKE '%_notifications_%';

-- RLS: internal tables (Express only)
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_conversations FORCE ROW LEVEL SECURITY;

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages FORCE ROW LEVEL SECURITY;

ALTER TABLE chat_system_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_system_log FORCE ROW LEVEL SECURITY;

REVOKE ALL ON chat_conversations FROM anon, authenticated;
REVOKE ALL ON chat_messages FROM anon, authenticated;
REVOKE ALL ON chat_system_log FROM anon, authenticated;
