-- Trainer-private billing (PT): separate from gym membership payments.

CREATE TYPE trainer_invoice_status AS ENUM (
  'pending',
  'confirmed',
  'rejected',
  'cancelled'
);

CREATE TABLE trainer_service_offers (
  id BIGSERIAL PRIMARY KEY,
  trainer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  billing_unit TEXT NOT NULL DEFAULT 'session'
    CHECK (billing_unit IN ('session', 'package', 'month')),
  price_usd DOUBLE PRECISION NOT NULL CHECK (price_usd > 0),
  sessions_included INT CHECK (sessions_included IS NULL OR sessions_included > 0),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trainer_service_offers_trainer
  ON trainer_service_offers (trainer_id) WHERE active;

CREATE TABLE trainer_payment_destinations (
  trainer_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE trainer_invoices (
  id BIGSERIAL PRIMARY KEY,
  trainer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  offer_id BIGINT REFERENCES trainer_service_offers(id) ON DELETE SET NULL,
  appointment_id BIGINT REFERENCES trainer_appointments(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  amount_usd DOUBLE PRECISION NOT NULL CHECK (amount_usd > 0),
  method TEXT,
  reference TEXT,
  proof_url TEXT,
  status trainer_invoice_status NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  created_by BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (trainer_id <> member_id)
);

CREATE INDEX idx_trainer_invoices_trainer_created
  ON trainer_invoices (trainer_id, created_at DESC);

CREATE INDEX idx_trainer_invoices_member_created
  ON trainer_invoices (member_id, created_at DESC);

CREATE INDEX idx_trainer_invoices_status
  ON trainer_invoices (status);

-- Enforce assignment exists when inserting/updating parties
CREATE OR REPLACE FUNCTION enforce_trainer_invoice_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM trainer_member_assignments tma
    WHERE tma.trainer_id = NEW.trainer_id AND tma.member_id = NEW.member_id
  ) THEN
    RAISE EXCEPTION 'trainer_invoice requires active trainer_member_assignment';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_trainer_invoice_assignment
  BEFORE INSERT OR UPDATE OF trainer_id, member_id ON trainer_invoices
  FOR EACH ROW EXECUTE FUNCTION enforce_trainer_invoice_assignment();

ALTER TABLE trainer_service_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_service_offers FORCE ROW LEVEL SECURITY;
REVOKE ALL ON trainer_service_offers FROM anon, authenticated;
CREATE POLICY backend_only ON trainer_service_offers
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

ALTER TABLE trainer_payment_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_payment_destinations FORCE ROW LEVEL SECURITY;
REVOKE ALL ON trainer_payment_destinations FROM anon, authenticated;
CREATE POLICY backend_only ON trainer_payment_destinations
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

ALTER TABLE trainer_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_invoices FORCE ROW LEVEL SECURITY;
REVOKE ALL ON trainer_invoices FROM anon, authenticated;
CREATE POLICY backend_only ON trainer_invoices
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
