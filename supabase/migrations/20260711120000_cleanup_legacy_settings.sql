-- Remove legacy notification settings superseded by chat + user_notifications

DELETE FROM gym_settings
WHERE key IN (
  'email_notifications_enabled',
  'sms_notifications_enabled',
  'notify_members_email',
  'notify_members_sms',
  'notify_admin_email',
  'whatsapp_notifications_enabled',
  'notify_members_whatsapp',
  'notify_payment_events',
  'notify_admin_new_payment',
  'notify_routine_assigned'
);
