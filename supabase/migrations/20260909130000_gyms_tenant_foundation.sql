-- Tenant foundation for future multi-gym SaaS (single gym = id 1).
-- Application queries may filter by gym_id; today all rows default to 1.

CREATE TABLE IF NOT EXISTS gyms (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO gyms (id, name, slug, status)
VALUES (1, 'GymApure', 'default', 'active')
ON CONFLICT (id) DO NOTHING;

SELECT setval(
  pg_get_serial_sequence('gyms', 'id'),
  GREATEST((SELECT COALESCE(MAX(id), 1) FROM gyms), 1)
);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS gym_id BIGINT NOT NULL DEFAULT 1
    REFERENCES gyms(id);

CREATE INDEX IF NOT EXISTS idx_users_gym_id ON users (gym_id);

COMMENT ON TABLE gyms IS 'Tenant registry. Single-gym deployments use id=1.';
COMMENT ON COLUMN users.gym_id IS 'Owning gym/tenant. Default 1 until multi-sede is enabled.';

ALTER TABLE gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE gyms FORCE ROW LEVEL SECURITY;
REVOKE ALL ON gyms FROM anon, authenticated;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gyms' AND policyname = 'backend_only'
  ) THEN
    CREATE POLICY backend_only ON gyms
      FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
  END IF;
END $$;
