-- Guided member agency: selectable templates, daily routine choice, activity feed for trainers.

ALTER TABLE routines
  ADD COLUMN IF NOT EXISTS member_selectable BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN routines.member_selectable IS
  'When true, assigned members may self-assign this template (clone + assign).';

CREATE TABLE IF NOT EXISTS member_daily_routine_choice (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  choice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  routine_id BIGINT NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, choice_date),
  CONSTRAINT member_daily_routine_choice_user_routine
    CHECK (routine_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_member_daily_routine_choice_routine
  ON member_daily_routine_choice (routine_id);

CREATE TABLE IF NOT EXISTS member_activity_events (
  id BIGSERIAL PRIMARY KEY,
  member_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trainer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL,
  routine_id BIGINT REFERENCES routines(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  CONSTRAINT member_activity_events_type CHECK (
    event_type IN ('self_assigned_template', 'exercise_substituted', 'exercise_skipped')
  )
);

CREATE INDEX IF NOT EXISTS idx_member_activity_events_trainer_pending
  ON member_activity_events (trainer_id, created_at DESC)
  WHERE acknowledged_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_member_activity_events_member
  ON member_activity_events (member_id, created_at DESC);

ALTER TABLE member_daily_routine_choice ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_daily_routine_choice FORCE ROW LEVEL SECURITY;
REVOKE ALL ON member_daily_routine_choice FROM anon, authenticated;
CREATE POLICY backend_only ON member_daily_routine_choice
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

ALTER TABLE member_activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_activity_events FORCE ROW LEVEL SECURITY;
REVOKE ALL ON member_activity_events FROM anon, authenticated;
CREATE POLICY backend_only ON member_activity_events
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- Demo/dev: existing trainer templates with exercises become selectable.
UPDATE routines r
SET member_selectable = true
WHERE member_selectable = false
  AND EXISTS (
    SELECT 1 FROM routine_exercises re WHERE re.routine_id = r.id
  )
  AND EXISTS (
    SELECT 1 FROM users u WHERE u.id = r.trainer_id AND u.role = 'trainer'
  );
