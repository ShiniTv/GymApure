-- equipment_catalog.image_url was never used in application code

ALTER TABLE equipment_catalog DROP COLUMN IF EXISTS image_url;
