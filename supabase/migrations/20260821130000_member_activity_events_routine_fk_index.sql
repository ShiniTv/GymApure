-- Index FK member_activity_events.routine_id (db-health / audit-unindexed-fks).

CREATE INDEX IF NOT EXISTS idx_member_activity_events_routine_id
  ON member_activity_events (routine_id);
