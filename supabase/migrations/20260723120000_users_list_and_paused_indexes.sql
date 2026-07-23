-- Listados de usuarios: COUNT/filtro por rol+estado y orden por nombre.
CREATE INDEX IF NOT EXISTS idx_users_role_status_full_name
  ON users (role, status, full_name);

-- Conteos de membresías pausadas en panel admin.
CREATE INDEX IF NOT EXISTS idx_subscriptions_paused_user
  ON subscriptions (user_id, paused_at DESC NULLS LAST)
  WHERE status = 'paused';
