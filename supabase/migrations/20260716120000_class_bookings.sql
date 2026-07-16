-- Group class catalogue, scheduled sessions, and member bookings.

CREATE TABLE class_types (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  default_capacity INTEGER NOT NULL CHECK (default_capacity > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE class_sessions (
  id BIGSERIAL PRIMARY KEY,
  class_type_id BIGINT NOT NULL REFERENCES class_types(id),
  instructor_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at)
);

CREATE TABLE class_bookings (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'booked'
    CHECK (status IN ('booked', 'cancelled', 'attended', 'no_show')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_class_bookings_active_session_user
  ON class_bookings (session_id, user_id)
  WHERE status = 'booked';

CREATE INDEX idx_class_sessions_starts_at ON class_sessions (starts_at);
CREATE INDEX idx_class_sessions_status_starts ON class_sessions (status, starts_at);
CREATE INDEX idx_class_bookings_user_id ON class_bookings (user_id);
CREATE INDEX idx_class_bookings_session_status ON class_bookings (session_id, status);

-- The application backend connects with its database role; Supabase anon/authenticated
-- clients must never access booking records directly.
ALTER TABLE class_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_types FORCE ROW LEVEL SECURITY;
REVOKE ALL ON class_types FROM anon, authenticated;
CREATE POLICY backend_only ON class_types
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

ALTER TABLE class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_sessions FORCE ROW LEVEL SECURITY;
REVOKE ALL ON class_sessions FROM anon, authenticated;
CREATE POLICY backend_only ON class_sessions
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

ALTER TABLE class_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_bookings FORCE ROW LEVEL SECURITY;
REVOKE ALL ON class_bookings FROM anon, authenticated;
CREATE POLICY backend_only ON class_bookings
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
