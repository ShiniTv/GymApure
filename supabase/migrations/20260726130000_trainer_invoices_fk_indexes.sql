-- Index FKs on trainer_invoices (db-health / unindexed FK audit).

CREATE INDEX IF NOT EXISTS idx_trainer_invoices_appointment_id
  ON trainer_invoices (appointment_id);

CREATE INDEX IF NOT EXISTS idx_trainer_invoices_created_by
  ON trainer_invoices (created_by);

CREATE INDEX IF NOT EXISTS idx_trainer_invoices_offer_id
  ON trainer_invoices (offer_id);
