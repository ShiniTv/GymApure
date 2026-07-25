CREATE TABLE workout_feedback (
  workout_session_id BIGINT PRIMARY KEY REFERENCES workout_sessions(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exertion SMALLINT,
  energy SMALLINT,
  discomfort SMALLINT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT workout_feedback_exertion_range CHECK (exertion BETWEEN 1 AND 10),
  CONSTRAINT workout_feedback_energy_range CHECK (energy BETWEEN 1 AND 5),
  CONSTRAINT workout_feedback_discomfort_range CHECK (discomfort BETWEEN 1 AND 5),
  CONSTRAINT workout_feedback_notes_len CHECK (notes IS NULL OR char_length(trim(notes)) <= 1000)
);

CREATE INDEX idx_workout_feedback_user_created ON workout_feedback (user_id, created_at DESC);
ALTER TABLE workout_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_feedback FORCE ROW LEVEL SECURITY;
REVOKE ALL ON workout_feedback FROM anon, authenticated;
CREATE POLICY backend_only ON workout_feedback FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
