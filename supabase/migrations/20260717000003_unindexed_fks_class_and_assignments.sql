-- Index remaining foreign keys flagged by db-health / audit-unindexed-fks.

CREATE INDEX IF NOT EXISTS idx_class_sessions_class_type_id
  ON class_sessions (class_type_id);

CREATE INDEX IF NOT EXISTS idx_class_sessions_instructor_id
  ON class_sessions (instructor_id);

CREATE INDEX IF NOT EXISTS idx_trainer_member_assignments_assigned_by
  ON trainer_member_assignments (assigned_by);
