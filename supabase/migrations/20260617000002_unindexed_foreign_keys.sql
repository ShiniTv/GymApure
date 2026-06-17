-- Índices en columnas FK sin cubrir (lint 0001: unindexed foreign keys).
-- Acelera JOINs, DELETE en cascada y consultas por relación.

CREATE INDEX IF NOT EXISTS idx_subscriptions_membership_id
  ON subscriptions (membership_id);

CREATE INDEX IF NOT EXISTS idx_routines_trainer_id
  ON routines (trainer_id);

CREATE INDEX IF NOT EXISTS idx_routine_exercises_exercise_id
  ON routine_exercises (exercise_id);

CREATE INDEX IF NOT EXISTS idx_user_routines_routine_id
  ON user_routines (routine_id);

CREATE INDEX IF NOT EXISTS idx_user_routines_assigned_by
  ON user_routines (assigned_by);

CREATE INDEX IF NOT EXISTS idx_user_measurements_user_id
  ON user_measurements (user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
  ON audit_logs (user_id);

CREATE INDEX IF NOT EXISTS idx_workout_sessions_routine_id
  ON workout_sessions (routine_id);

CREATE INDEX IF NOT EXISTS idx_expiry_notif_user_id
  ON expiry_notification_log (user_id);
