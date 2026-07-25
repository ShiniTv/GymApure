CREATE TABLE member_coaching_suggestions (
  id BIGSERIAL PRIMARY KEY,
  member_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trainer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  routine_id BIGINT NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  routine_exercise_id BIGINT NOT NULL REFERENCES routine_exercises(id) ON DELETE CASCADE,
  exercise_id BIGINT NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending',
  suggestion_type TEXT NOT NULL,
  current_snapshot JSONB NOT NULL,
  proposed_snapshot JSONB NOT NULL,
  rationale JSONB NOT NULL,
  trainer_note TEXT,
  reviewed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT member_coaching_suggestions_status CHECK (status IN ('pending', 'approved', 'dismissed')),
  CONSTRAINT member_coaching_suggestions_type CHECK (
    suggestion_type IN ('load_increase', 'load_decrease', 'maintain', 'deload')
  ),
  CONSTRAINT member_coaching_suggestions_note_len CHECK (
    trainer_note IS NULL OR char_length(trim(trainer_note)) <= 500
  ),
  CONSTRAINT member_coaching_suggestions_current_snapshot_object CHECK (
    jsonb_typeof(current_snapshot) = 'object'
  ),
  CONSTRAINT member_coaching_suggestions_proposed_snapshot_object CHECK (
    jsonb_typeof(proposed_snapshot) = 'object'
  ),
  CONSTRAINT member_coaching_suggestions_rationale_object CHECK (
    jsonb_typeof(rationale) = 'object'
  )
);

CREATE UNIQUE INDEX uq_member_coaching_suggestions_pending
  ON member_coaching_suggestions (member_id, routine_exercise_id)
  WHERE status = 'pending';
CREATE INDEX idx_member_coaching_suggestions_member_status
  ON member_coaching_suggestions (member_id, status, created_at DESC);
CREATE INDEX idx_member_coaching_suggestions_trainer_status
  ON member_coaching_suggestions (trainer_id, status);
CREATE INDEX idx_member_coaching_suggestions_routine
  ON member_coaching_suggestions (routine_id);
CREATE INDEX idx_member_coaching_suggestions_exercise
  ON member_coaching_suggestions (routine_exercise_id);
CREATE INDEX idx_member_coaching_suggestions_reviewed_by
  ON member_coaching_suggestions (reviewed_by);

ALTER TABLE member_coaching_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_coaching_suggestions FORCE ROW LEVEL SECURITY;
REVOKE ALL ON member_coaching_suggestions FROM anon, authenticated;
CREATE POLICY backend_only ON member_coaching_suggestions
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
