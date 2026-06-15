-- Índice para búsqueda por cédula en check-in kiosk
CREATE INDEX IF NOT EXISTS idx_users_cedula ON users(cedula) WHERE cedula IS NOT NULL;

-- Índice para deduplicación de check-in diario
CREATE INDEX IF NOT EXISTS idx_attendance_user_day ON attendance (user_id, ((check_in_time AT TIME ZONE 'UTC')::date));
