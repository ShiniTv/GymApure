-- Configurable expiry alerts + notification deduplication log

CREATE TABLE gym_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO gym_settings (key, value) VALUES
  ('expiry_alert_days', '7'),
  ('email_notifications_enabled', 'true'),
  ('sms_notifications_enabled', 'false'),
  ('notify_members_email', 'true'),
  ('notify_members_sms', 'false'),
  ('notify_admin_email', 'true')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE expiry_notification_log (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  subscription_id BIGINT REFERENCES subscriptions(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
  alert_type TEXT NOT NULL CHECK (alert_type IN ('expiring_soon', 'expired', 'admin_digest')),
  days_remaining INT,
  notification_date DATE NOT NULL DEFAULT CURRENT_DATE,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_expiry_notif_daily
  ON expiry_notification_log (subscription_id, channel, alert_type, notification_date)
  WHERE alert_type = 'expiring_soon';

CREATE UNIQUE INDEX idx_expiry_notif_once
  ON expiry_notification_log (subscription_id, channel, alert_type)
  WHERE alert_type = 'expired';
