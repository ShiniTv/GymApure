-- Performance indexes for GymApure
-- Based on query pattern analysis of the API layer

-- 1. Attendance queries: filter by user + date range (used in reception lookup, stats, attendanceCore)
CREATE INDEX IF NOT EXISTS idx_attendance_user_date
  ON attendance (user_id, check_in_time DESC);

-- 2. Active session lookup (used in attendanceCore check-in/out validation)
CREATE INDEX IF NOT EXISTS idx_attendance_user_active
  ON attendance (user_id, check_out_time)
  WHERE check_out_time IS NULL;

-- 3. Workout sessions: find active session by user + routine (used in workouts.ts)
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_routine_active
  ON workout_sessions (user_id, routine_id, end_time)
  WHERE end_time IS NULL;

-- 4. Subscriptions: find active subscription by user (used in memberships, reception, stats, etc.)
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_active
  ON subscriptions (user_id, end_date DESC)
  WHERE status = 'active';

-- 5. Subscriptions: expiring subscriptions lookup (used in expiringSubscriptions.ts)
CREATE INDEX IF NOT EXISTS idx_subscriptions_active_end_date
  ON subscriptions (end_date)
  WHERE status = 'active';

-- 6. Payments: filter by user and status (used in payments.ts)
CREATE INDEX IF NOT EXISTS idx_payments_user_status
  ON payments (user_id, status);

-- 7. Users: cédula lookup (used in reception, kiosk, users CRUD)
-- Note: expression index helps the REGEXP_REPLACE pattern in cedulaWhereClause
CREATE INDEX IF NOT EXISTS idx_users_cedula_digits
  ON users (REGEXP_REPLACE(UPPER(COALESCE(cedula, '')), '[^0-9]', '', 'g'));

-- 8. Nutrition log entries: date-range queries (used in nutrition.ts)
CREATE INDEX IF NOT EXISTS idx_nutrition_log_entries_user_date
  ON nutrition_log_entries (user_id, logged_at DESC);

-- 9. Chat conversations: find by member (used in chat subsystem)
CREATE INDEX IF NOT EXISTS idx_chat_conversations_member
  ON chat_conversations (member_id, last_message_at DESC);

-- 10. Workout logs: lookup by session (used in workouts.ts)
CREATE INDEX IF NOT EXISTS idx_workout_logs_session
  ON workout_logs (session_id, exercise_id, set_number);
