-- Motivo al pausar una membresía (visible en recepción / auditoría).
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS pause_reason TEXT;
