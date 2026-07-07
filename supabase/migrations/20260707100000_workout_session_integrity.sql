-- Close orphan in-progress sessions when a successful session exists the same day
UPDATE workout_sessions ws
SET end_time = NOW(), success = 0
WHERE ws.end_time IS NULL
  AND EXISTS (
    SELECT 1 FROM workout_sessions done
    WHERE done.user_id = ws.user_id
      AND done.routine_id = ws.routine_id
      AND done.end_time IS NOT NULL
      AND done.success = 1
      AND done.start_time::date = ws.start_time::date
  );

-- One active session per user + routine
CREATE UNIQUE INDEX IF NOT EXISTS idx_workout_one_active_per_user_routine
  ON workout_sessions (user_id, routine_id)
  WHERE end_time IS NULL;
