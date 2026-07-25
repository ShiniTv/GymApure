CREATE TABLE trainer_appointments (
  id BIGSERIAL PRIMARY KEY,
  trainer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  training_block_id BIGINT REFERENCES member_training_blocks(id) ON DELETE SET NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT trainer_appointments_dates CHECK (ends_at > starts_at),
  CONSTRAINT trainer_appointments_status CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  CONSTRAINT trainer_appointments_notes_len CHECK (notes IS NULL OR char_length(trim(notes)) <= 2000)
);

CREATE INDEX idx_trainer_appointments_trainer_starts ON trainer_appointments (trainer_id, starts_at);
CREATE INDEX idx_trainer_appointments_member_starts ON trainer_appointments (member_id, starts_at);
ALTER TABLE trainer_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_appointments FORCE ROW LEVEL SECURITY;
REVOKE ALL ON trainer_appointments FROM anon, authenticated;
CREATE POLICY backend_only ON trainer_appointments FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
