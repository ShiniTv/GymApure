ALTER TABLE users
  ADD COLUMN IF NOT EXISTS weekly_training_goal SMALLINT NOT NULL DEFAULT 5
  CHECK (weekly_training_goal BETWEEN 1 AND 7);
