-- Trainer profiles, training shifts, and member preferred shift

CREATE TYPE training_shift AS ENUM ('diurno', 'vespertino', 'nocturno');
CREATE TYPE trainer_level AS ENUM ('basico', 'avanzado', 'especialista');

CREATE TABLE trainer_profiles (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  level trainer_level NOT NULL DEFAULT 'basico',
  specialty TEXT,
  shift training_shift NOT NULL,
  bio TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN training_shift training_shift;

CREATE INDEX idx_trainer_profiles_shift ON trainer_profiles(shift);
CREATE INDEX idx_users_training_shift ON users(training_shift) WHERE role = 'member';

-- Backfill existing trainers with default profile
INSERT INTO trainer_profiles (user_id, level, specialty, shift)
SELECT id, 'basico', NULL, 'diurno'::training_shift
FROM users
WHERE role = 'trainer'
ON CONFLICT (user_id) DO NOTHING;
