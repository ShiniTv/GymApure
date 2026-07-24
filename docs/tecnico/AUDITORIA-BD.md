# Auditoría de base de datos — GymApure

Documento de referencia para auditorías periódicas de PostgreSQL (Supabase) y Storage.

---

## Arquitectura

| Capa      | Tecnología                                                                    |
| --------- | ----------------------------------------------------------------------------- |
| Motor     | PostgreSQL en Supabase                                                        |
| Acceso    | `pg.Pool` (max 20) en `src/db/index.ts`                                       |
| Storage   | 4 buckets: `payment-proofs`, `avatars`, `exercise-videos`, `equipment-photos` |
| Seguridad | RLS deny-all; acceso solo vía Express                                         |

---

## Comandos de auditoría

| Comando                                 | Descripción                                    |
| --------------------------------------- | ---------------------------------------------- |
| `npm run db:health`                     | RLS, FK, migraciones, integridad básica        |
| `npm run db:audit-tables`               | Tamaños, filas, índices, datos legacy          |
| `npm run db:audit-storage`              | Huérfanos y referencias rotas en Storage       |
| `npm run db:audit:both`                 | Comparativa dev + prod                         |
| `npm run db:audit-query-patterns`       | Latencia de endpoints (servidor activo)        |
| `npm run db:storage-cleanup`            | Dry-run de objetos huérfanos                   |
| `npm run db:storage-cleanup -- --apply` | Eliminar huérfanos (con backup previo en prod) |

Entornos:

```bash
npm run db:audit:dev
npm run db:audit:prod
```

---

## Checklist mensual

### Infraestructura

- [ ] `npm run db:health:dev` y `db:health:prod` → 0 fallos
- [ ] `npm run db:verify-isolation` → dev ≠ prod
- [ ] `DATABASE_URL` usa pooler `:6543` en prod
- [ ] `SUPABASE_SERVICE_ROLE_KEY` presente en prod

### Integridad

- [ ] 0 migraciones pendientes (`schema_migrations` = archivos en `supabase/migrations/`)
- [ ] 0 FK huérfanas (payments, workout_logs, chat_messages)
- [ ] 0 subscriptions `active` con `end_date` pasada
- [ ] `gym_settings` sin keys legacy (solo ~6 keys activas)

### Storage

- [ ] Huérfanos < 5% por bucket
- [ ] 0 referencias rotas (DB apunta a objeto inexistente)
- [ ] Backup Point-in-Time antes de `db:storage-cleanup --apply` en prod

### Rendimiento

- [ ] `/api/health` → `db_latency_ms` < 100ms
- [ ] `db_pool.waitingCount` = 0 en condiciones normales
- [ ] Sin alertas Sentry de "Slow database query" recurrentes
- [ ] Admin dashboard p95 < 800ms (caché 45s)

### Retención (job diario UTC)

| Tabla                         | Retención default      | Variable                            |
| ----------------------------- | ---------------------- | ----------------------------------- |
| `audit_logs`                  | 90 días                | `AUDIT_LOG_RETENTION_DAYS`          |
| `chat_system_log`             | 180 días               | `EXPIRY_NOTIF_LOG_RETENTION_DAYS`   |
| `user_notifications` (leídas) | 90 días                | `READ_NOTIFICATIONS_RETENTION_DAYS` |
| `password_reset_tokens`       | 7 días                 | `RESET_TOKEN_RETENTION_DAYS`        |
| `push_subscriptions`          | 90 días sin actualizar | `PUSH_SUBSCRIPTION_RETENTION_DAYS`  |

---

## Matriz de uso de tablas

| Tabla                                        | Uso en código                    |
| -------------------------------------------- | -------------------------------- |
| `users`                                      | Auth, perfiles, roles            |
| `memberships` / `subscriptions` / `payments` | Facturación                      |
| `exercises` / `routines` / `workout_*`       | Entrenamiento                    |
| `attendance`                                 | Check-in                         |
| `chat_*`                                     | Mensajería y eventos automáticos |
| `user_notifications`                         | Centro de alertas                |
| `nutrition_*`                                | Planes y logs nutrición          |
| `equipment_*` / `gym_zones`                  | CMMS equipamiento                |
| `exchange_rates` / `gym_settings`            | Config y tasas BCV               |
| `member_health_profiles`                     | Perfil metabólico                |
| `push_subscriptions`                         | Web push                         |
| `password_reset_tokens`                      | Recuperar contraseña             |
| `schema_migrations`                          | Solo scripts de migración        |

**Eliminada:** `demo_requests` (julio 2026).

---

## Patrones de consulta

### Paralelo (correcto)

- `src/api/stats.ts` — `Promise.all` en dashboards
- `src/api/users.ts` / `payments.ts` — COUNT + SELECT en paralelo
- `src/lib/chat/expiryChatJob.ts` — `mapWithConcurrency(5)`
- `src/lib/equipmentInspectionAlerts.ts` — bulk INSERT + notify paralelo
- `src/lib/notifications/service.ts` — bulk INSERT staff + notify paralelo

### Monitoreo

- Consultas > `SLOW_QUERY_MS` (default 2000) → log + Sentry
- `pool.waitingCount > 0` → log + Sentry cada 30s

---

## Criterios de éxito

| Métrica                | Objetivo                   |
| ---------------------- | -------------------------- |
| `db:health`            | 0 fallos                   |
| Migraciones            | 100% aplicadas             |
| FK huérfanas críticas  | 0                          |
| Storage huérfanos      | < 5% o 0 tras cleanup      |
| Job equipment alerts   | < 5s (50 items × N admins) |
| `gym_settings` activas | ≤ 6 keys                   |

---

## Enlaces

- [Migraciones y BD](./MIGRACIONES-Y-BD.md)
- [Variables de entorno](./VARIABLES-ENTORNO.md)
- [Entornos y seguridad](./ENTORNOS-Y-SEGURIDAD.md)

---

## Reporte en vivo (2026-07-11)

Auditoría ejecutada vía Supabase MCP en ambos proyectos.

> **Corrección (2026-07-13):** la tabla original usaba nombres viejos del dashboard invertidos. Mapa actual: [SUPABASE-PROYECTOS.md](./SUPABASE-PROYECTOS.md).

| Proyecto (nombre actual) | Ref                    | Rol       | Usuarios (snapshot) | Pagos | Suscripciones |
| ------------------------ | ---------------------- | --------- | ------------------- | ----- | ------------- |
| GymApure – Desarrollo    | `sqjyxmbtgmiorckigrrg` | Dev local | —                   | —     | —             |
| GymApure – Producción    | `ffjwvlcwhyskddqqojnp` | Render    | 187                 | 128   | 187           |

_Cifras de usuarios/pagos del snapshot del 2026-07-11 en el proyecto de producción; pueden variar._

### Acciones aplicadas

1. Migración `drop_demo_requests` — tabla huérfana eliminada en ambos entornos
2. Migración `cleanup_legacy_settings` — columna `image_url` eliminada; keys legacy purgadas
3. Migración `ensure_rls_lockdown_all_tables` — política `backend_only` en **todas** las tablas public
4. `schema_migrations` actualizado a **39** archivos en ambos entornos
5. Tokens de reset expirados purgados en dev (prod: 0 tokens)

### Estado post-remediación

| Check                           | Dev     | Prod    |
| ------------------------------- | ------- | ------- |
| Migraciones al día              | 42/42   | 42/42   |
| Subscriptions activas expiradas | 0       | 0       |
| Supabase security advisors      | 0 lints | 0 lints |
| `demo_requests` existe          | No      | No      |
| `equipment_catalog.image_url`   | No      | No      |

### Tablas más grandes (prod)

| Tabla         | Filas | Tamaño |
| ------------- | ----- | ------ |
| attendance    | 376   | 200 kB |
| users         | 187   | 184 kB |
| exercises     | 76    | 152 kB |
| subscriptions | 187   | 136 kB |
| payments      | 128   | 112 kB |

### Pendiente manual (ops — no bloquea desarrollo)

Snapshot histórico del 2026-07-11 (entonces ~42 migraciones). Hoy el repo tiene **56** SQL en `supabase/migrations/`.

Antes de cleanup en producción:

1. Confirmar `npm run db:migrate:prod` al día (incluye `storage_objects_rls` si aún no está).
2. `npm run db:audit-storage:prod` y revisar huérfanos antes de `db:storage-cleanup --apply`.
3. Despliegue Render solo tras merge + checklist de release (`scripts/deploy/release-checklist.ts`).

Device QA push/PWA (Android bg / iPhone Add to Home) sigue en [QA-DEVICE-10.md](../qa/QA-DEVICE-10.md). Staging: [STAGING.md](./STAGING.md).
