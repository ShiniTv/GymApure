ALTER TABLE routine_exercises
  ADD COLUMN IF NOT EXISTS set_prescription JSONB DEFAULT NULL;

COMMENT ON COLUMN routine_exercises.set_prescription IS
  'Per-set prescription: [{ set_number, weight_kg, reps }, ...]';
