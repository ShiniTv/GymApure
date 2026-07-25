-- Structured, non-clinical coaching context owned by the assigned trainer.
-- Health data remains in member_health_profiles and is never duplicated here.

CREATE TABLE member_training_assessments (
  member_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  updated_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  primary_goal TEXT,
  experience_level TEXT,
  preferences TEXT,
  equipment_access TEXT,
  mobility_notes TEXT,
  coaching_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT member_training_assessments_goal_len
    CHECK (primary_goal IS NULL OR char_length(trim(primary_goal)) <= 500),
  CONSTRAINT member_training_assessments_experience_level
    CHECK (experience_level IS NULL OR experience_level IN ('beginner', 'intermediate', 'advanced')),
  CONSTRAINT member_training_assessments_preferences_len
    CHECK (preferences IS NULL OR char_length(trim(preferences)) <= 2000),
  CONSTRAINT member_training_assessments_equipment_len
    CHECK (equipment_access IS NULL OR char_length(trim(equipment_access)) <= 1000),
  CONSTRAINT member_training_assessments_mobility_len
    CHECK (mobility_notes IS NULL OR char_length(trim(mobility_notes)) <= 2000),
  CONSTRAINT member_training_assessments_notes_len
    CHECK (coaching_notes IS NULL OR char_length(trim(coaching_notes)) <= 4000)
);

CREATE TABLE member_weekly_checkins (
  id BIGSERIAL PRIMARY KEY,
  member_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recorded_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  week_of DATE NOT NULL,
  energy SMALLINT,
  sleep_quality SMALLINT,
  stress_level SMALLINT,
  soreness_level SMALLINT,
  adherence_score SMALLINT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT member_weekly_checkins_member_week UNIQUE (member_id, week_of),
  CONSTRAINT member_weekly_checkins_energy_range CHECK (energy IS NULL OR energy BETWEEN 1 AND 5),
  CONSTRAINT member_weekly_checkins_sleep_range CHECK (sleep_quality IS NULL OR sleep_quality BETWEEN 1 AND 5),
  CONSTRAINT member_weekly_checkins_stress_range CHECK (stress_level IS NULL OR stress_level BETWEEN 1 AND 5),
  CONSTRAINT member_weekly_checkins_soreness_range CHECK (soreness_level IS NULL OR soreness_level BETWEEN 1 AND 5),
  CONSTRAINT member_weekly_checkins_adherence_range CHECK (adherence_score IS NULL OR adherence_score BETWEEN 1 AND 5),
  CONSTRAINT member_weekly_checkins_notes_len CHECK (notes IS NULL OR char_length(trim(notes)) <= 2000)
);

CREATE INDEX idx_member_weekly_checkins_member_week
  ON member_weekly_checkins (member_id, week_of DESC);

ALTER TABLE member_training_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_training_assessments FORCE ROW LEVEL SECURITY;
REVOKE ALL ON member_training_assessments FROM anon, authenticated;
CREATE POLICY backend_only ON member_training_assessments
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

ALTER TABLE member_weekly_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_weekly_checkins FORCE ROW LEVEL SECURITY;
REVOKE ALL ON member_weekly_checkins FROM anon, authenticated;
CREATE POLICY backend_only ON member_weekly_checkins
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
