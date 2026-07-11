# Rotación de secretos — runbook

Procedimiento para rotar credenciales críticas de GymApure sin tiempo de inactividad prolongado ni pérdida de datos.

---

## Principios

1. **Nunca** commitear secretos en git (solo `.env.example` con placeholders).
2. Rotar en **Render Dashboard** (o `.env.prod` local) y redeploy; no editar secretos en runtime sin reinicio.
3. Tras rotar `JWT_SECRET`, **todos** los usuarios deben volver a iniciar sesión.
4. Documentar la fecha de rotación en el canal interno del equipo (no en el repositorio).

---

## JWT_SECRET

**Impacto:** invalida todas las sesiones activas (cookies `token`).

| Paso | Acción                                            |
| ---- | ------------------------------------------------- |
| 1    | Generar nuevo secreto: `openssl rand -base64 48`  |
| 2    | En Render → Environment → actualizar `JWT_SECRET` |
| 3    | Redeploy del servicio web                         |
| 4    | Comunicar al staff que deben re-login             |
| 5    | Verificar login admin y cron jobs                 |

No es necesario tocar la base de datos: los tokens antiguos fallan la verificación de firma.

---

## CRON_SECRET

**Impacto:** los Cron Jobs de Render (`POST /api/settings/expiry/run`, `POST /api/exchange-rate/refresh`) dejan de autenticarse hasta actualizar el header.

| Paso | Acción                                                                           |
| ---- | -------------------------------------------------------------------------------- |
| 1    | `openssl rand -base64 32`                                                        |
| 2    | Actualizar `CRON_SECRET` en Render (web + cada Cron Job que use `x-cron-secret`) |
| 3    | En cada Cron Job de Render, actualizar el header `x-cron-secret` al mismo valor  |
| 4    | Ejecutar manualmente un cron y confirmar HTTP 200                                |
| 5    | `npm run test:security` o `POST` manual con el nuevo secret                      |

En producción `CRON_SECRET` es **obligatorio** (mín. 16 caracteres); el servidor no arranca sin él.

---

## SMTP (Gmail / proveedor)

**Impacto:** emails de bienvenida, recuperación de contraseña y notificaciones de pago.

| Paso | Acción                                                                            |
| ---- | --------------------------------------------------------------------------------- |
| 1    | Crear nueva contraseña de aplicación en Google (o rotar credencial del proveedor) |
| 2    | Actualizar `SMTP_PASS` en Render                                                  |
| 3    | Redeploy                                                                          |
| 4    | Probar: forgot-password con cuenta de prueba                                      |
| 5    | Revisar `GET /api/health/ops` (admin): `email.configured` debe ser `true`         |

Revocar la contraseña antigua en Google tras confirmar el envío.

---

## SUPABASE_SERVICE_ROLE_KEY

**Impacto:** uploads (comprobantes, avatares, videos), acceso Storage desde el backend.

| Paso | Acción                                                                                                                             |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Supabase Dashboard → Settings → API → rotar **service_role** (si el proyecto lo permite) o crear nuevo proyecto solo en emergencia |
| 2    | Actualizar `SUPABASE_SERVICE_ROLE_KEY` en Render                                                                                   |
| 3    | Redeploy                                                                                                                           |
| 4    | Subir comprobante de prueba y descargar vía API                                                                                    |

**Nunca** exponer esta clave en el frontend ni en logs.

---

## REDIS_URL (rate limit / login lockout)

**Impacto:** contadores de rate limit y bloqueo de login se reinician al cambiar instancia; breve ventana sin estado distribuido.

| Paso | Acción                                                                      |
| ---- | --------------------------------------------------------------------------- |
| 1    | Rotar credencial en el proveedor Redis (Upstash, etc.)                      |
| 2    | Actualizar `REDIS_URL` en Render                                            |
| 3    | Redeploy                                                                    |
| 4    | Verificar que login lockout sigue funcionando tras varios intentos fallidos |

Si Redis no está configurado, el servidor usa memoria local (aceptable en instancia única).

---

## VAPID (push notifications)

Rotar con `npx web-push generate-vapid-keys`; actualizar `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT`. Los clientes deben re-suscribirse tras el cambio.

---

## Checklist post-rotación

- [ ] `npm run db:health` sin errores
- [ ] Login staff + miembro de prueba
- [ ] Cron con nuevo `CRON_SECRET` → 200
- [ ] Email de prueba (forgot-password)
- [ ] Upload comprobante / avatar
- [ ] WebSocket y chat operativos

---

## Enlaces

- [Variables de entorno](./VARIABLES-ENTORNO.md)
- [Despliegue](../DEPLOY.md)
- [Datos personales](./DATOS-PERSONALES.md)
