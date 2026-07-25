-- Index foreign keys used for author references and DB health checks.

CREATE INDEX idx_member_training_assessments_updated_by
  ON member_training_assessments (updated_by);

CREATE INDEX idx_member_weekly_checkins_recorded_by
  ON member_weekly_checkins (recorded_by);
