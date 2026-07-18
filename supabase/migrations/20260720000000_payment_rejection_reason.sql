-- Motivo opcional/requerido en API al rechazar un pago (visible al miembro).
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
