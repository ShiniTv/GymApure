-- Nutrition plans and meal logs (MVP)

CREATE TYPE meal_type AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');

CREATE TABLE nutrition_plans (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  trainer_id BIGINT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL DEFAULT 'Plan nutricional',
  calories_target INTEGER NOT NULL CHECK (calories_target > 0),
  protein_target_g INTEGER NOT NULL CHECK (protein_target_g >= 0),
  carbs_target_g INTEGER NOT NULL CHECK (carbs_target_g >= 0),
  fat_target_g INTEGER NOT NULL CHECK (fat_target_g >= 0),
  calories_margin INTEGER NOT NULL DEFAULT 150 CHECK (calories_margin >= 0),
  protein_margin_g INTEGER NOT NULL DEFAULT 15 CHECK (protein_margin_g >= 0),
  carbs_margin_g INTEGER NOT NULL DEFAULT 15 CHECK (carbs_margin_g >= 0),
  fat_margin_g INTEGER NOT NULL DEFAULT 10 CHECK (fat_margin_g >= 0),
  notes TEXT,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE nutrition_log_entries (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  meal_type meal_type NOT NULL,
  description TEXT NOT NULL,
  calories INTEGER NOT NULL DEFAULT 0 CHECK (calories >= 0),
  protein_g NUMERIC(8, 2) NOT NULL DEFAULT 0 CHECK (protein_g >= 0),
  carbs_g NUMERIC(8, 2) NOT NULL DEFAULT 0 CHECK (carbs_g >= 0),
  fat_g NUMERIC(8, 2) NOT NULL DEFAULT 0 CHECK (fat_g >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_nutrition_logs_user_logged
  ON nutrition_log_entries (user_id, logged_at DESC);

CREATE INDEX idx_nutrition_plans_trainer
  ON nutrition_plans (trainer_id);

ALTER TABLE nutrition_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_plans FORCE ROW LEVEL SECURITY;
ALTER TABLE nutrition_log_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_log_entries FORCE ROW LEVEL SECURITY;

REVOKE ALL ON nutrition_plans FROM anon, authenticated;
REVOKE ALL ON nutrition_log_entries FROM anon, authenticated;
