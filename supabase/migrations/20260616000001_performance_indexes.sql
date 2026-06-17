-- Performance indexes for hot query patterns

CREATE INDEX IF NOT EXISTS idx_payments_status_created
  ON payments (status, created_at);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status_end
  ON subscriptions (user_id, status, end_date DESC);

CREATE INDEX IF NOT EXISTS idx_routine_exercises_routine_id
  ON routine_exercises (routine_id);

CREATE INDEX IF NOT EXISTS idx_workout_logs_session_id
  ON workout_logs (session_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_open_session
  ON attendance (user_id, check_in_time DESC)
  WHERE check_out_time IS NULL;

CREATE INDEX IF NOT EXISTS idx_workout_sessions_start_time
  ON workout_sessions (start_time);

CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_start
  ON workout_sessions (user_id, start_time DESC);
