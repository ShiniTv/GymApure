ALTER TABLE routine_exercises
  ADD COLUMN IF NOT EXISTS sort_order INTEGER;

UPDATE routine_exercises re
SET sort_order = ranked.position
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY routine_id ORDER BY id) AS position
  FROM routine_exercises
) ranked
WHERE re.id = ranked.id
  AND re.sort_order IS NULL;

ALTER TABLE routine_exercises
  ALTER COLUMN sort_order SET DEFAULT 0,
  ALTER COLUMN sort_order SET NOT NULL;

COMMENT ON COLUMN routine_exercises.sort_order IS
  'Orden de ejecución del ejercicio dentro de la rutina (1 = primero).';

CREATE INDEX IF NOT EXISTS idx_routine_exercises_routine_sort
  ON routine_exercises (routine_id, sort_order);
