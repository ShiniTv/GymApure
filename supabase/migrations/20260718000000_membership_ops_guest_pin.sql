-- Phase A–C product ops: paused memberships, guest passes, check-in presence PIN

ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'paused';

CREATE TABLE IF NOT EXISTS guest_passes (
  id BIGSERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  cedula TEXT,
  phone TEXT,
  host_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  valid_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guest_passes_valid_date ON guest_passes (valid_date DESC);
CREATE INDEX IF NOT EXISTS idx_guest_passes_cedula ON guest_passes (cedula)
  WHERE cedula IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_guest_passes_host ON guest_passes (host_user_id)
  WHERE host_user_id IS NOT NULL;

ALTER TABLE guest_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_passes FORCE ROW LEVEL SECURITY;
REVOKE ALL ON guest_passes FROM anon, authenticated;
CREATE POLICY backend_only ON guest_passes
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- Daily presence PIN for member self check-in (staff can rotate in settings)
INSERT INTO gym_settings (key, value, updated_at)
VALUES ('check_in_pin', '', NOW())
ON CONFLICT (key) DO NOTHING;

INSERT INTO gym_settings (key, value, updated_at)
VALUES ('require_self_check_in_pin', 'false', NOW())
ON CONFLICT (key) DO NOTHING;

-- Track pause metadata on subscriptions
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pause_days_remaining INTEGER,
  ADD COLUMN IF NOT EXISTS resume_at TIMESTAMPTZ;
