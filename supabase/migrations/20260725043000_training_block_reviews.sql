ALTER TABLE member_training_blocks
  ADD COLUMN last_reviewed_at TIMESTAMPTZ;

UPDATE member_training_blocks
SET last_reviewed_at = approved_at
WHERE status = 'active'
  AND approved_at IS NOT NULL
  AND last_reviewed_at IS NULL;
