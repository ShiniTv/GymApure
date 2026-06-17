-- idx_subscriptions_user_id es redundante: idx_subscriptions_user_status_end
-- ya cubre consultas por user_id (prefijo izquierdo del índice compuesto).

DROP INDEX IF EXISTS idx_subscriptions_user_id;
