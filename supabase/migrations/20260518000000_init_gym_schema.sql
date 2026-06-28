-- GymApure schema (PostgreSQL / Supabase)

CREATE TYPE user_role AS ENUM ('admin', 'trainer', 'member');
CREATE TYPE user_status AS ENUM ('active', 'inactive');
CREATE TYPE subscription_status AS ENUM ('active', 'inactive', 'expired');
CREATE TYPE payment_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role user_role NOT NULL,
  full_name TEXT NOT NULL,
  cedula TEXT UNIQUE,
  phone TEXT,
  dob DATE,
  initial_weight DOUBLE PRECISION,
  height DOUBLE PRECISION,
  goal TEXT,
  profile_image TEXT,
  status user_status DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE memberships (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  duration_days INTEGER NOT NULL,
  price_usd DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  membership_id BIGINT NOT NULL REFERENCES memberships(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status subscription_status DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE payments (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_usd DOUBLE PRECISION NOT NULL,
  amount_bs DOUBLE PRECISION,
  exchange_rate DOUBLE PRECISION,
  method TEXT NOT NULL,
  reference TEXT,
  status payment_status DEFAULT 'pending',
  proof_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE exercises (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  muscle_group TEXT NOT NULL,
  description TEXT,
  execution TEXT,
  video_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE routines (
  id BIGSERIAL PRIMARY KEY,
  trainer_id BIGINT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  difficulty TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE routine_exercises (
  id BIGSERIAL PRIMARY KEY,
  routine_id BIGINT NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  exercise_id BIGINT NOT NULL REFERENCES exercises(id),
  sets INTEGER,
  reps INTEGER,
  rest_seconds INTEGER,
  weight_suggestion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_routines (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  routine_id BIGINT NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  assigned_by BIGINT NOT NULL REFERENCES users(id),
  start_date DATE,
  end_date DATE,
  assigned_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_measurements (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE DEFAULT CURRENT_DATE,
  weight DOUBLE PRECISION,
  body_fat_percentage DOUBLE PRECISION,
  waist DOUBLE PRECISION,
  arm DOUBLE PRECISION,
  leg DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE attendance (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  check_in_time TIMESTAMPTZ DEFAULT NOW(),
  check_out_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE workout_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  routine_id BIGINT NOT NULL REFERENCES routines(id),
  start_time TIMESTAMPTZ DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  success INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE workout_logs (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id BIGINT NOT NULL REFERENCES exercises(id),
  set_number INTEGER NOT NULL,
  weight DOUBLE PRECISION,
  reps INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (session_id, exercise_id, set_number)
);

CREATE INDEX idx_subscriptions_user_status_end ON subscriptions (user_id, status, end_date DESC);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_attendance_check_in ON attendance(check_in_time);
CREATE INDEX idx_workout_sessions_user_id ON workout_sessions(user_id);
CREATE INDEX idx_user_routines_user_id ON user_routines(user_id);
