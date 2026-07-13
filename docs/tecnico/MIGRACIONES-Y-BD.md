# Migraciones y base de datos

Política de migraciones SQL y resumen de cambios recientes.

---

## Política

1. **Fuente de verdad:** archivos en `supabase/migrations/`
2. **Naming:** `YYYYMMDDHHMMSS_descripcion.sql`
3. **Aplicar:** `npm run db:migrate` (o `:dev` / `:prod`)
4. **Nunca** editar migraciones ya aplicadas en prod; crear nueva migración
5. **Nunca** modificar esquema solo en Supabase Dashboard sin archivo en repo

---

## Comandos

| Comando                   | Entorno                  |
| ------------------------- | ------------------------ |
| `npm run db:migrate`      | `.env` activo            |
| `npm run db:migrate:dev`  | `.env.dev`               |
| `npm run db:migrate:prod` | `.env.prod`              |
| `npm run db:health`       | Verificar conexión y RLS |

Antes de migrar prod: `npm run deploy:preflight` + `npm run db:verify-isolation`.

---

## Migraciones recientes (julio 2026)

| Migración                                       | Qué introduce                                             |
| ----------------------------------------------- | --------------------------------------------------------- |
| `20260702000000_trainer_profiles_and_shifts`    | Perfiles entrenador, turnos, `training_shift` en miembros |
| `20260704000000_system_exercises`               | Catálogo de ejercicios del sistema                        |
| `20260705000000_user_notifications`             | Centro de notificaciones con dedupe                       |
| `20260706000000_routine_set_prescription`       | Peso/reps por serie en rutinas (JSON)                     |
| `20260707000000_weekly_training_goal`           | Meta semanal de sesiones (1–7)                            |
| `20260707100000_workout_session_integrity`      | Integridad de sesiones de entrenamiento                   |
| `20260707110000_exercise_execution_guides`      | Texto de pasos de ejecución                               |
| `20260708120000_equipment_cmms`                 | Módulo equipamiento: zonas, catálogo, inventario          |
| `20260708120100_equipment_catalog_seed`         | Seed catálogo de máquinas                                 |
| `20260708120200_equipment_photos_bucket`        | Bucket Storage equipment-photos                           |
| `20260708130000_exchange_rates`                 | Tabla tasas BCV + override manual                         |
| `20260709120000_gym_equipment_unique`           | Deduplicación y unique indexes en equipamiento            |
| `20260711000000_cleanup_legacy_settings`        | Elimina gym_settings legacy y columna `image_url` sin uso |
| `20260711100000_ensure_rls_lockdown_all_tables` | Re-aplica RLS deny-all en todas las tablas public         |

---

## Retención de datos (mantenimiento diario)

El job en `src/lib/dbMaintenance.ts` purga automáticamente:

| Tabla                         | Default  | Variable de entorno                 |
| ----------------------------- | -------- | ----------------------------------- |
| `audit_logs`                  | 90 días  | `AUDIT_LOG_RETENTION_DAYS`          |
| `chat_system_log`             | 180 días | `EXPIRY_NOTIF_LOG_RETENTION_DAYS`   |
| `user_notifications` (leídas) | 90 días  | `READ_NOTIFICATIONS_RETENTION_DAYS` |
| `password_reset_tokens`       | 7 días   | `RESET_TOKEN_RETENTION_DAYS`        |
| `push_subscriptions`          | 90 días  | `PUSH_SUBSCRIPTION_RETENTION_DAYS`  |

Ver [AUDITORIA-BD.md](./AUDITORIA-BD.md) para checklist completo.

---

## Rollback manual

No hay rollback automático. Si una migración falla:

1. Leer el error en consola
2. Verificar estado en Supabase SQL Editor
3. Corregir con nueva migración o restaurar backup de Supabase (prod)

**En prod:** preferir backup Point-in-Time de Supabase antes de migraciones grandes.

---

## Datos demo vs producción

| Script            | Uso                               |
| ----------------- | --------------------------------- |
| `db:create-admin` | Admin real                        |
| `db:restore-demo` | Solo tests/CI                     |
| `db:reset-data`   | Vacía datos operativos (solo dev) |

Ver [ENTORNOS-Y-SEGURIDAD.md](./ENTORNOS-Y-SEGURIDAD.md).

---

## Enlaces

- [Entornos y seguridad](./ENTORNOS-Y-SEGURIDAD.md)
- [Equipamiento](../modulos/EQUIPAMIENTO.md)
- [Desarrollo §7](../DESARROLLO.md)
