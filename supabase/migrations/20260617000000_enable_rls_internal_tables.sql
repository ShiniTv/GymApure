-- Tablas internas del backend (acceso vía DATABASE_URL / service_role).
-- Habilitar RLS y revocar acceso de anon/authenticated para cerrar alertas del Security Advisor.

ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE schema_migrations FORCE ROW LEVEL SECURITY;

ALTER TABLE gym_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_settings FORCE ROW LEVEL SECURITY;

ALTER TABLE expiry_notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE expiry_notification_log FORCE ROW LEVEL SECURITY;

REVOKE ALL ON schema_migrations FROM anon, authenticated;
REVOKE ALL ON gym_settings FROM anon, authenticated;
REVOKE ALL ON expiry_notification_log FROM anon, authenticated;
