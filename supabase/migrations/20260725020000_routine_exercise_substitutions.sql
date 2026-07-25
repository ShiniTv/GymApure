-- Audit trail for trainer-approved exercise substitutions within a routine.

CREATE TABLE routine_exercise_substitutions (
  id BIGSERIAL PRIMARY KEY,
  routine_exercise_id BIGINT NOT NULL REFERENCES routine_exercises(id) ON DELETE CASCADE,
  previous_exercise_id BIGINT NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
  replacement_exercise_id BIGINT NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
  substituted_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT routine_exercise_substitutions_reason_len
    CHECK (char_length(trim(reason)) BETWEEN 2 AND 500),
  CONSTRAINT routine_exercise_substitutions_distinct_exercises
    CHECK (previous_exercise_id <> replacement_exercise_id)
);

CREATE INDEX idx_routine_exercise_substitutions_exercise
  ON routine_exercise_substitutions (routine_exercise_id, created_at DESC);
CREATE INDEX idx_routine_exercise_substitutions_previous
  ON routine_exercise_substitutions (previous_exercise_id);
CREATE INDEX idx_routine_exercise_substitutions_replacement
  ON routine_exercise_substitutions (replacement_exercise_id);
CREATE INDEX idx_routine_exercise_substitutions_substituted_by
  ON routine_exercise_substitutions (substituted_by);

ALTER TABLE routine_exercise_substitutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_exercise_substitutions FORCE ROW LEVEL SECURITY;
REVOKE ALL ON routine_exercise_substitutions FROM anon, authenticated;
CREATE POLICY backend_only ON routine_exercise_substitutions
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
