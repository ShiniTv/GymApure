-- Sesiones de entrenamiento remoto (cliente fuera del gym).
-- Independiente de attendance/check-in con PIN de instalaciones.
CREATE TABLE member_remote_sessions (
  id BIGSERIAL PRIMARY KEY,
  member_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT member_remote_sessions_dates CHECK (ended_at IS NULL OR ended_at >= started_at)
);

-- Solo una sesión abierta por miembro.
CREATE UNIQUE INDEX idx_member_remote_sessions_open
  ON member_remote_sessions (member_id)
  WHERE ended_at IS NULL;

CREATE INDEX idx_member_remote_sessions_started
  ON member_remote_sessions (started_at DESC);

ALTER TABLE member_remote_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_remote_sessions FORCE ROW LEVEL SECURITY;
REVOKE ALL ON member_remote_sessions FROM anon, authenticated;
CREATE POLICY backend_only ON member_remote_sessions
  FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);
