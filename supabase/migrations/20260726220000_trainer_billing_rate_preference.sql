-- Trainer PT billing: BCV vs "tasa euro" preference (Bs per 1 USD).

ALTER TABLE trainer_payment_destinations
  ADD COLUMN IF NOT EXISTS rate_preference TEXT NOT NULL DEFAULT 'bcv'
    CHECK (rate_preference IN ('bcv', 'euro')),
  ADD COLUMN IF NOT EXISTS euro_rate DOUBLE PRECISION
    CHECK (euro_rate IS NULL OR (euro_rate > 0 AND euro_rate <= 100000)),
  ADD COLUMN IF NOT EXISTS euro_rate_note TEXT NOT NULL DEFAULT '';
