-- Event notifications + WhatsApp channel

INSERT INTO gym_settings (key, value) VALUES
  ('whatsapp_notifications_enabled', 'false'),
  ('notify_members_whatsapp', 'false'),
  ('notify_payment_events', 'true'),
  ('notify_admin_new_payment', 'true'),
  ('notify_routine_assigned', 'true')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE expiry_notification_log DROP CONSTRAINT IF EXISTS expiry_notification_log_channel_check;

ALTER TABLE expiry_notification_log
  ADD CONSTRAINT expiry_notification_log_channel_check
  CHECK (channel IN ('email', 'sms', 'whatsapp'));
