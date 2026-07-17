-- Per-exercise RM tests (manual) + index for workout_logs aggregations

CREATE TABLE IF NOT EXISTS exercise_rm_tests (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id BIGINT NOT NULL REFERENCES exercises(id),
  weight DOUBLE PRECISION NOT NULL CHECK (weight >= 0),
  reps INTEGER NOT NULL CHECK (reps > 0),
  test_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  recorded_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exercise_rm_tests_user_exercise
  ON exercise_rm_tests (user_id, exercise_id, test_date DESC);

CREATE INDEX IF NOT EXISTS idx_exercise_rm_tests_recorded_by
  ON exercise_rm_tests (recorded_by)
  WHERE recorded_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workout_logs_exercise_session
  ON workout_logs (exercise_id, session_id);

ALTER TABLE exercise_rm_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_rm_tests FORCE ROW LEVEL SECURITY;
REVOKE ALL ON exercise_rm_tests FROM anon, authenticated;
CREATE POLICY backend_only ON exercise_rm_tests
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
