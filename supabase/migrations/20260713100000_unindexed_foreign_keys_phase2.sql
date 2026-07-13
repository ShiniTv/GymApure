-- Índices en FK añadidas tras CMMS/chat (lint unindexed foreign keys).

CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id
  ON chat_messages (sender_id);

CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_events_created_by
  ON equipment_maintenance_events (created_by);

CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_events_vendor_id
  ON equipment_maintenance_events (vendor_id);
