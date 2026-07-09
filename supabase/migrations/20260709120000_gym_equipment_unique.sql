-- Merge duplicate gym equipment rows and enforce one inventory row per machine type.

BEGIN;

-- Catalog-based duplicates: keep oldest row, sum quantity, reassign events.
DO $$
DECLARE
  rec RECORD;
  keep_id BIGINT;
  dup_ids BIGINT[];
  total_qty INTEGER;
BEGIN
  FOR rec IN
    SELECT catalog_id
    FROM gym_equipment
    WHERE catalog_id IS NOT NULL
    GROUP BY catalog_id
    HAVING COUNT(*) > 1
  LOOP
    SELECT MIN(id) INTO keep_id
    FROM gym_equipment
    WHERE catalog_id = rec.catalog_id;

    SELECT COALESCE(SUM(quantity), 1) INTO total_qty
    FROM gym_equipment
    WHERE catalog_id = rec.catalog_id;

    SELECT ARRAY_AGG(id) INTO dup_ids
    FROM gym_equipment
    WHERE catalog_id = rec.catalog_id
      AND id <> keep_id;

    IF dup_ids IS NOT NULL THEN
      UPDATE equipment_maintenance_events
      SET equipment_id = keep_id
      WHERE equipment_id = ANY(dup_ids);

      UPDATE gym_equipment
      SET quantity = total_qty,
          updated_at = NOW()
      WHERE id = keep_id;

      DELETE FROM gym_equipment
      WHERE id = ANY(dup_ids);
    END IF;
  END LOOP;
END $$;

-- Custom-name duplicates (no catalog): keep oldest row per normalized name.
DO $$
DECLARE
  rec RECORD;
  keep_id BIGINT;
  dup_ids BIGINT[];
  total_qty INTEGER;
BEGIN
  FOR rec IN
    SELECT LOWER(TRIM(custom_name)) AS norm_name
    FROM gym_equipment
    WHERE catalog_id IS NULL
      AND custom_name IS NOT NULL
      AND TRIM(custom_name) <> ''
    GROUP BY LOWER(TRIM(custom_name))
    HAVING COUNT(*) > 1
  LOOP
    SELECT MIN(id) INTO keep_id
    FROM gym_equipment
    WHERE catalog_id IS NULL
      AND LOWER(TRIM(custom_name)) = rec.norm_name;

    SELECT COALESCE(SUM(quantity), 1) INTO total_qty
    FROM gym_equipment
    WHERE catalog_id IS NULL
      AND LOWER(TRIM(custom_name)) = rec.norm_name;

    SELECT ARRAY_AGG(id) INTO dup_ids
    FROM gym_equipment
    WHERE catalog_id IS NULL
      AND LOWER(TRIM(custom_name)) = rec.norm_name
      AND id <> keep_id;

    IF dup_ids IS NOT NULL THEN
      UPDATE equipment_maintenance_events
      SET equipment_id = keep_id
      WHERE equipment_id = ANY(dup_ids);

      UPDATE gym_equipment
      SET quantity = total_qty,
          updated_at = NOW()
      WHERE id = keep_id;

      DELETE FROM gym_equipment
      WHERE id = ANY(dup_ids);
    END IF;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_gym_equipment_catalog_unique
  ON gym_equipment (catalog_id)
  WHERE catalog_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_gym_equipment_custom_name_unique
  ON gym_equipment (LOWER(TRIM(custom_name)))
  WHERE catalog_id IS NULL AND custom_name IS NOT NULL;

COMMIT;
