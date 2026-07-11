# Auditoría de base de datos

Guía operativa para auditar PostgreSQL (Supabase) y Storage del sistema GymApure.

---

## Resumen de arquitectura

| Capa          | Tecnología                                   |
| ------------- | -------------------------------------------- |
| Base de datos | PostgreSQL en Supabase                       |
| Acceso SQL    | `pg.Pool` en `src/db/index.ts` (SQL crudo)   |
| Storage       | Supabase Storage (4 buckets)                 |
| Seguridad     | RLS deny-all; acceso solo vía Express API    |
| Migraciones   | `supabase/migrations/` + `schema_migrations` |

### Tablas activas (31)

Todas las tablas de negocio están referenciadas en `src/`. No hay tablas huérfanas en el esquema actual (`demo_requests` fue eliminada).

| Módulo             | Tablas                                                                                                                                                          |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Usuarios y billing | `users`, `memberships`, `subscriptions`, `payments`, `audit_logs`                                                                                               |
| Entrenamiento      | `exercises`, `routines`, `routine_exercises`, `user_routines`, `user_measurements`, `workout_sessions`, `workout_logs`, `trainer_exercise_hidden`, `attendance` |
| Trainers           | `trainer_profiles`                                                                                                                                              |
| Chat               | `chat_conversations`, `chat_messages`, `chat_system_log`                                                                                                        |
| Notificaciones     | `user_notifications`, `push_subscriptions`                                                                                                                      |
| Nutrición / salud  | `nutrition_plans`, `nutrition_log_entries`, `member_health_profiles`                                                                                            |
| Equipamiento       | `gym_zones`, `equipment_catalog`, `equipment_vendors`, `gym_equipment`, `equipment_maintenance_events`                                                          |
| Infra              | `password_reset_tokens`, `exchange_rates`, `gym_settings`, `schema_migrations`                                                                                  |

### Storage buckets

| Bucket             | Columna DB                                | Prefijo              |
| ------------------ | ----------------------------------------- | -------------------- |
| `payment-proofs`   | `payments.proof_url`                      | `sb:`                |
| `avatars`          | `users.profile_image`                     | `sbmedia:avatars:`   |
| `exercise-videos`  | `exercises.video_url`, `video_poster_url` | `sbmedia:videos:`    |
| `equipment-photos` | `gym_equipment.photo_url`                 | `sbmedia:equipment:` |

---

## Comandos de auditoría

| Comando                                 | Descripción                                     |
| --------------------------------------- | ----------------------------------------------- |
| `npm run db:health`                     | RLS, FK, migraciones, integridad, storage       |
| `npm run db:audit`                      | Health + tablas + storage (entorno activo)      |
| `npm run db:audit:compare`              | Dev vs prod (requiere `.env.dev` y `.env.prod`) |
| `npm run db:audit:tables`               | Tamaños, filas, índices, integridad             |
| `npm run db:audit:storage`              | Huérfanos y referencias rotas en Storage        |
| `npm run db:storage:cleanup`            | Dry-run de limpieza de huérfanos                |
| `npm run db:storage:cleanup -- --apply` | Eliminar huérfanos (prod: backup antes)         |

Variantes `:dev` y `:prod` disponibles para tablas, storage y cleanup.

---

## Checklist mensual

### Infraestructura

- [ ] `npm run db:health:dev` y `db:health:prod` — 0 fallos
- [ ] `npm run db:verify-isolation` — refs de proyecto distintos
- [ ] `DATABASE_URL` usa pooler `:6543` en prod
- [ ] Migraciones: count repo = count `schema_migrations`

### Integridad de datos

- [ ] 0 payments sin user
- [ ] 0 workout_logs sin session
- [ ] 0 subscriptions `active` con `end_date` pasada (el cron las corrige diariamente)
- [ ] Tokens reset expirados purgados por mantenimiento diario

### Storage

- [ ] Huérfanos < 5% por bucket
- [ ] 0 referencias rotas en BD
- [ ] Dry-run cleanup antes de `--apply` en prod

### Rendimiento

- [ ] `/api/health` — `db_pool.waitingCount` = 0 en condiciones normales
- [ ] Alertas Sentry por consultas > 2s o presión en pool
- [ ] Dashboard admin p95 < 800ms (caché 45s)

---

## Política de retención

| Tabla / dato                             | Retención | Variable de entorno                |
| ---------------------------------------- | --------- | ---------------------------------- |
| `audit_logs`                             | 90 días   | `AUDIT_LOG_RETENTION_DAYS`         |
| `chat_system_log`                        | 180 días  | `EXPIRY_NOTIF_LOG_RETENTION_DAYS`  |
| `user_notifications` leídas              | 90 días   | `READ_NOTIFICATION_RETENTION_DAYS` |
| `password_reset_tokens` usados/expirados | 7 días    | `RESET_TOKEN_RETENTION_DAYS`       |
| `push_subscriptions` inactivas           | 90 días   | `PUSH_SUBSCRIPTION_RETENTION_DAYS` |

Ejecutado por `runDbMaintenance()` dentro del cron de expiración (1×/día UTC).

---

## gym_settings activas

Solo estas keys son leídas por la aplicación:

- `expiry_alert_days`
- `equipment_inspection_alert_days`
- `exchange_rate_usd_override`
- `exchange_rate_usd_override_note`

Keys legacy de email/SMS/WhatsApp fueron eliminadas en migración `20260711120000_cleanup_legacy_settings.sql`.

---

## Paralelismo de consultas

### Patrones correctos (mantener)

- Dashboards: `Promise.all` en `src/api/stats.ts`
- Listas paginadas: COUNT + SELECT en paralelo
- Notificaciones staff: batch INSERT + `mapWithConcurrency(5)`
- Alertas equipamiento: batch INSERT + notify paralelo

### Anti-patrones evitados

- Bucles `for...await insertNotification` — reemplazados por batch
- Updates de settings secuenciales — `Promise.all`
- Auth register: email + cédula en paralelo

---

## Criterios de éxito

| Métrica                | Objetivo                   |
| ---------------------- | -------------------------- |
| `db:health` dev + prod | 0 fallos                   |
| Migraciones            | 100% aplicadas             |
| FK huérfanas críticas  | 0                          |
| Storage huérfanos      | < 5% o 0 tras cleanup      |
| Job equipment alerts   | < 5s (50 items × N admins) |
| Tablas log/notif       | Crecimiento acotado        |

---

## Enlaces

- [Migraciones y BD](./MIGRACIONES-Y-BD.md)
- [Entornos y seguridad](./ENTORNOS-Y-SEGURIDAD.md)
- [Variables de entorno](./VARIABLES-ENTORNO.md)
