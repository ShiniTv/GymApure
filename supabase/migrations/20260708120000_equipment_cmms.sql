-- Gym equipment CMMS: zones, catalog, inventory, vendors, maintenance events

CREATE TYPE equipment_category AS ENUM (
  'cardio',
  'strength',
  'functional',
  'infrastructure',
  'other'
);

CREATE TYPE equipment_status AS ENUM (
  'operational',
  'limited',
  'maintenance',
  'out_of_service'
);

CREATE TYPE equipment_event_type AS ENUM (
  'report',
  'inspection',
  'repair',
  'status_change'
);

CREATE TABLE gym_zones (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE equipment_catalog (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category equipment_category NOT NULL DEFAULT 'other',
  description TEXT,
  typical_brands TEXT,
  image_url TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_equipment_catalog_name_system
  ON equipment_catalog (LOWER(name))
  WHERE is_system = true;

CREATE TABLE equipment_vendors (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE gym_equipment (
  id BIGSERIAL PRIMARY KEY,
  catalog_id BIGINT REFERENCES equipment_catalog(id) ON DELETE SET NULL,
  custom_name TEXT,
  zone_id BIGINT REFERENCES gym_zones(id) ON DELETE SET NULL,
  status equipment_status NOT NULL DEFAULT 'operational',
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  installed_at DATE,
  warranty_until DATE,
  notes TEXT,
  photo_url TEXT,
  next_inspection_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT gym_equipment_name_check CHECK (
    catalog_id IS NOT NULL OR (custom_name IS NOT NULL AND TRIM(custom_name) <> '')
  )
);

CREATE INDEX idx_gym_equipment_status ON gym_equipment (status);
CREATE INDEX idx_gym_equipment_zone ON gym_equipment (zone_id);
CREATE INDEX idx_gym_equipment_catalog ON gym_equipment (catalog_id);
CREATE INDEX idx_gym_equipment_next_inspection ON gym_equipment (next_inspection_at)
  WHERE next_inspection_at IS NOT NULL;

CREATE TABLE equipment_maintenance_events (
  id BIGSERIAL PRIMARY KEY,
  equipment_id BIGINT NOT NULL REFERENCES gym_equipment(id) ON DELETE CASCADE,
  event_type equipment_event_type NOT NULL,
  previous_status equipment_status,
  new_status equipment_status,
  description TEXT NOT NULL,
  vendor_id BIGINT REFERENCES equipment_vendors(id) ON DELETE SET NULL,
  cost_usd DOUBLE PRECISION CHECK (cost_usd IS NULL OR cost_usd >= 0),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_equipment_events_equipment ON equipment_maintenance_events (equipment_id, performed_at DESC);

INSERT INTO gym_zones (name, sort_order) VALUES
  ('Cardio', 1),
  ('Pesas libres', 2),
  ('Zona funcional', 3),
  ('Infraestructura', 4),
  ('Recepción', 5)
ON CONFLICT (name) DO NOTHING;

INSERT INTO gym_settings (key, value, updated_at)
VALUES ('equipment_inspection_alert_days', '7', NOW())
ON CONFLICT (key) DO NOTHING;
