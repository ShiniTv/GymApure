-- Solicitudes de demo desde la landing pública
CREATE TABLE IF NOT EXISTS demo_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  gym_name TEXT NOT NULL,
  city TEXT,
  member_count TEXT,
  current_tools TEXT,
  requirements TEXT NOT NULL,
  preferred_contact TEXT NOT NULL DEFAULT 'email',
  status TEXT NOT NULL DEFAULT 'pending',
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_demo_requests_created_at ON demo_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_demo_requests_email ON demo_requests (lower(email));
CREATE INDEX IF NOT EXISTS idx_demo_requests_status ON demo_requests (status);
