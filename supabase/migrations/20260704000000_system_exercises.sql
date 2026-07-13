-- System exercise catalog with per-trainer library customization.

ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS owner_trainer_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS forked_from_id BIGINT REFERENCES exercises(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS trainer_exercise_hidden (
  trainer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id BIGINT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  hidden_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (trainer_id, exercise_id)
);

CREATE INDEX IF NOT EXISTS idx_exercises_owner_trainer_id ON exercises (owner_trainer_id);
CREATE INDEX IF NOT EXISTS idx_exercises_forked_from_id ON exercises (forked_from_id);
CREATE INDEX IF NOT EXISTS idx_exercises_is_system ON exercises (is_system) WHERE is_system = true;
CREATE INDEX IF NOT EXISTS idx_trainer_exercise_hidden_exercise_id ON trainer_exercise_hidden (exercise_id);
