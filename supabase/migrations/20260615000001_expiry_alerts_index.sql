-- Speed up expiry alert queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date_active
  ON subscriptions (end_date)
  WHERE status = 'active';
