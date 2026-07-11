# Datos personales y privacidad operativa

Guía para el tratamiento de datos personales en GymApure (Caribean Gym): qué se almacena, quién accede y cuánto tiempo se conserva.

---

## Datos que almacena la aplicación

| Categoría        | Campos típicos                                          | Tabla / ubicación                                |
| ---------------- | ------------------------------------------------------- | ------------------------------------------------ |
| Identidad        | Nombre, email, cédula, teléfono                         | `users`                                          |
| Autenticación    | Hash bcrypt de contraseña, `token_version`, MFA (staff) | `users`, `user_mfa`                              |
| Membresía        | Plan, fechas, estado de suscripción                     | `subscriptions`, `memberships`                   |
| Pagos            | Montos, referencia, comprobante (archivo)               | `payments`, bucket `payment-proofs`              |
| Asistencia       | Check-in/out, duración                                  | `attendance`                                     |
| Salud / progreso | Medidas corporales, rutinas, entrenamientos             | `user_measurements`, `user_routines`, `workouts` |
| Chat             | Mensajes in-app entre staff y miembros                  | `chat_messages`, `chat_conversations`            |
| Auditoría        | Acciones administrativas (sin contraseñas)              | `audit_logs`                                     |

Los comprobantes de pago, avatares, videos y fotos de equipamiento viven en **Supabase Storage** (buckets privados); el acceso es solo vía API autenticada.

---

## Perfiles de salud y medidas

- Las **medidas corporales** (`user_measurements`) las registra el miembro o el staff autorizado (admin, entrenador asignado).
- Los **entrenadores** solo ven miembros con rutina asignada (protección IDOR en `/api/users/:id`).
- No se almacenan diagnósticos médicos ni historiales clínicos completos; solo métricas operativas del gym (peso, perímetros, etc.).
- Exportación: reportes CSV de asistencia y miembros vía `/api/reports/*` (solo roles autorizados).

---

## Acceso por rol

| Rol            | Acceso a datos personales                                |
| -------------- | -------------------------------------------------------- |
| `member`       | Solo su perfil, pagos, rutinas, chat y asistencia propia |
| `trainer`      | Miembros asignados + rutinas propias                     |
| `receptionist` | Listados operativos (check-in, pagos, walk-in)           |
| `admin`        | Acceso completo; auditoría de acciones sensibles         |

El endpoint público `GET /api/health` **no** expone configuración interna. `GET /api/health/ops` (solo admin) muestra estado operativo (SMTP, registro público).

---

## Retención y borrado

| Dato                    | Retención por defecto                             | Cómo reducir / purgar                                      |
| ----------------------- | ------------------------------------------------- | ---------------------------------------------------------- |
| Logs de auditoría       | `AUDIT_LOG_RETENTION_DAYS` (90)                   | Cron diario del servidor                                   |
| Logs avisos vencimiento | `EXPIRY_NOTIF_LOG_RETENTION_DAYS` (180)           | Idem                                                       |
| Cuenta de usuario       | Hasta baja manual                                 | `DELETE` admin en Miembros o script controlado             |
| Comprobantes de pago    | Mientras exista el pago                           | Borrado en cascada al eliminar pago (según implementación) |
| Sesiones JWT            | Cookie httpOnly; invalidación por `token_version` | Logout, cambio de contraseña, suspensión                   |

Para solicitudes de **derecho al olvido** en producción: exportar lo necesario, anonimizar o eliminar filas en `users` y archivos en Storage; documentar en `audit_logs` la acción (sin datos sensibles en el detalle).

---

## Medidas de seguridad aplicadas

- Contraseñas: bcrypt cost **12** (rehash automático al iniciar sesión si el hash es legacy).
- Sesión única por `token_version`; cookie `httpOnly` + `sameSite=lax`.
- MFA TOTP obligatorio recomendado para `admin` y `receptionist` (`/security`).
- CSRF double-submit cuando `CORS_ORIGINS` está configurado (despliegues cross-origin).
- Storage con RLS en `storage.objects` (migración `20260711120100_storage_objects_rls.sql`).
- Sentry frontend con `maskAllText` y `blockAllMedia` para reducir PII en errores.

---

## Enlaces

- [Entornos y seguridad](./ENTORNOS-Y-SEGURIDAD.md)
- [Rotación de secretos](./ROTACION-SECRETOS.md)
- [Variables de entorno](./VARIABLES-ENTORNO.md)
- [Despliegue](../DEPLOY.md)
