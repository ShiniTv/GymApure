-- Member health profile and metabolic estimates (TMB/GET)

CREATE TYPE biological_sex AS ENUM ('male', 'female');

CREATE TYPE activity_level AS ENUM (
  'sedentary',
  'light',
  'moderate',
  'active',
  'very_active'
);

CREATE TABLE member_health_profiles (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  condition_flags TEXT[] NOT NULL DEFAULT '{}',
  conditions_notes TEXT,
  limitations_notes TEXT,
  allergies_notes TEXT,
  medications_notes TEXT,
  sex biological_sex,
  activity_level activity_level,
  bmr_kcal INTEGER CHECK (bmr_kcal IS NULL OR bmr_kcal > 0),
  tdee_kcal INTEGER CHECK (tdee_kcal IS NULL OR tdee_kcal > 0),
  weight_used_kg DOUBLE PRECISION CHECK (weight_used_kg IS NULL OR weight_used_kg > 0),
  health_consent_at TIMESTAMPTZ,
  metabolic_computed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_member_health_profiles_updated
  ON member_health_profiles (updated_at DESC);

ALTER TABLE member_health_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_health_profiles FORCE ROW LEVEL SECURITY;

REVOKE ALL ON member_health_profiles FROM anon, authenticated;
