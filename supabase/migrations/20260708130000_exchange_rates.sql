-- Official BCV exchange rates (USD) + manual override keys in gym_settings

CREATE TABLE exchange_rates (
  id BIGSERIAL PRIMARY KEY,
  currency TEXT NOT NULL DEFAULT 'USD',
  rate DOUBLE PRECISION NOT NULL,
  effective_date DATE NOT NULL,
  source TEXT NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (currency, effective_date, source)
);

CREATE INDEX idx_exchange_rates_currency_date ON exchange_rates (currency, effective_date DESC);

INSERT INTO gym_settings (key, value, updated_at)
VALUES
  ('exchange_rate_usd_override', '', NOW()),
  ('exchange_rate_usd_override_note', '', NOW())
ON CONFLICT (key) DO NOTHING;
