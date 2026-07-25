-- A block groups consecutive training assignments under one coaching intent.
-- Adjustments remain trainer-approved and auditable.

CREATE TABLE member_training_blocks (
  id BIGSERIAL PRIMARY KEY,
  member_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trainer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  objective TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned',
  intensity_method TEXT NOT NULL DEFAULT 'manual',
  notes TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT member_training_blocks_dates CHECK (end_date >= start_date),
  CONSTRAINT member_training_blocks_status CHECK (status IN ('planned', 'active', 'completed', 'archived')),
  CONSTRAINT member_training_blocks_intensity_method CHECK (
    intensity_method IN ('manual', 'rpe_rir', 'percent_1rm', 'double_progression')
  ),
  CONSTRAINT member_training_blocks_name_len CHECK (char_length(trim(name)) BETWEEN 2 AND 120),
  CONSTRAINT member_training_blocks_objective_len CHECK (char_length(trim(objective)) BETWEEN 2 AND 500),
  CONSTRAINT member_training_blocks_notes_len CHECK (notes IS NULL OR char_length(trim(notes)) <= 4000)
);

CREATE INDEX idx_member_training_blocks_member_dates
  ON member_training_blocks (member_id, start_date DESC);
CREATE INDEX idx_member_training_blocks_trainer_status
  ON member_training_blocks (trainer_id, status);

ALTER TABLE member_training_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_training_blocks FORCE ROW LEVEL SECURITY;
REVOKE ALL ON member_training_blocks FROM anon, authenticated;
CREATE POLICY backend_only ON member_training_blocks
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
