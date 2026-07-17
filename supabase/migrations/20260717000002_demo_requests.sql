-- Public demo / lead capture for GymApure landing
CREATE TABLE IF NOT EXISTS demo_requests (
  id BIGSERIAL PRIMARY KEY,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  gym_name TEXT NOT NULL,
  city TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'contacted', 'closed')),
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_demo_requests_created_at ON demo_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_demo_requests_email ON demo_requests (lower(email));

ALTER TABLE demo_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_requests FORCE ROW LEVEL SECURITY;
REVOKE ALL ON demo_requests FROM anon, authenticated;
CREATE POLICY backend_only ON demo_requests
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
