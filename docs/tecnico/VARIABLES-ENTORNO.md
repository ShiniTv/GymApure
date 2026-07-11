# Variables de entorno

Referencia completa basada en [`.env.example`](../../.env.example). Plantilla comentada en el repositorio.

---

## Obligatorias (mínimo para arrancar)

| Variable                    | Obligatorio                       | Descripción                                                                         | Riesgo si falta                    |
| --------------------------- | --------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------- |
| `JWT_SECRET`                | Sí                                | Secreto para firmar tokens (mín. 32 caracteres). Generar: `openssl rand -base64 48` | Login imposible                    |
| `DATABASE_URL`              | Sí                                | PostgreSQL Supabase, pooler puerto **6543**                                         | Sin base de datos                  |
| `SUPABASE_SERVICE_ROLE_KEY` | Recomendado (obligatorio en prod) | API → service_role. Uploads a Storage                                               | Sin comprobantes, avatares, videos |

---

## Servidor

| Variable    | Default       | Descripción                            |
| ----------- | ------------- | -------------------------------------- |
| `NODE_ENV`  | `development` | `production` en Render                 |
| `PORT`      | `3000`        | Puerto del servidor Express            |
| `LOG_LEVEL` | `warn` (dev)  | `debug` \| `info` \| `warn` \| `error` |

---

## Base de datos y admin

| Variable          | Cuándo usar                                         |
| ----------------- | --------------------------------------------------- |
| `ADMIN_FULL_NAME` | `db:create-admin` no interactivo                    |
| `ADMIN_EMAIL`     | Idem                                                |
| `ADMIN_PASSWORD`  | Idem (mín. 8 caracteres)                            |
| `DEMO_PASSWORD`   | Solo `db:restore-demo` y tests (mín. 12 caracteres) |
| `SQLITE_PATH`     | Migración única legacy `db:migrate-from-sqlite`     |

---

## Supabase Storage

| Variable                    | Descripción                                 |
| --------------------------- | ------------------------------------------- |
| `SUPABASE_URL`              | Se deduce de `DATABASE_URL` si no se define |
| `SUPABASE_SERVICE_ROLE_KEY` | **Nunca** en frontend; solo servidor        |

---

## Registro y CORS

| Variable                | Descripción                                                      |
| ----------------------- | ---------------------------------------------------------------- |
| `ALLOW_PUBLIC_REGISTER` | `true` permite `/register` (dev); desactivado en prod            |
| `CORS_ORIGINS`          | Orígenes separados por coma si API y frontend en hosts distintos |
| `ENABLE_HIBP_CHECK`     | `true` rechaza contraseñas filtradas (Have I Been Pwned, HTTPS)   |
| `REDIS_URL`             | Rate limit y bloqueo de login distribuido (recomendado multi-instancia) |

### CSRF (cross-origin)

Si `CORS_ORIGINS` define orígenes externos, las rutas protegidas exigen cookie `csrf_token` + header `X-CSRF-Token` en `POST`/`PUT`/`PATCH`/`DELETE`. En despliegues **same-origin** en Render (sin `CORS_ORIGINS`), la protección CSRF se omite en producción; el frontend sigue enviando el token cuando la cookie existe.

---

## Tipo de cambio BCV

| Variable                    | Descripción                                    |
| --------------------------- | ---------------------------------------------- |
| `EXCHANGE_RATE_CRON_IN_DEV` | `true` activa cron de tasa en desarrollo local |

La tasa se actualiza automáticamente en el servidor (cron + scraper bcv.org.ve). Override manual en **Configuración → Tasa de cambio USD**.

---

## Alertas de vencimiento

| Variable                          | Descripción                                                    |
| --------------------------------- | -------------------------------------------------------------- |
| `EXPIRY_CRON_IN_DEV`              | `true` activa cron de vencimientos en dev                      |
| `EXPIRY_CRON_INTERVAL_MS`         | Intervalo en ms (default 3600000 = 1 h)                        |
| `CRON_SECRET`                     | Secreto para `POST /api/settings/expiry/run` (Render Cron Job) |
| `AUDIT_LOG_RETENTION_DAYS`        | Retención logs auditoría (default 90)                          |
| `EXPIRY_NOTIF_LOG_RETENTION_DAYS` | Retención logs avisos (default 180)                            |

---

## Correo SMTP (producción recomendado)

| Variable         | Ejemplo                             |
| ---------------- | ----------------------------------- |
| `SMTP_HOST`      | `smtp.gmail.com`                    |
| `SMTP_PORT`      | `587`                               |
| `SMTP_SECURE`    | `false`                             |
| `SMTP_USER`      | cuenta Gmail                        |
| `SMTP_PASS`      | contraseña de aplicación Google     |
| `SMTP_FROM`      | `GymApure <soporte@...>`            |
| `PUBLIC_APP_URL` | `https://caribean-gym.onrender.com` |

Sin SMTP: no hay correos de bienvenida, recuperar contraseña ni pagos. Los avisos de vencimiento van al **chat in-app**, no por correo.

---

## Push notifications (opcional)

| Variable            | Descripción                                 |
| ------------------- | ------------------------------------------- |
| `VAPID_PUBLIC_KEY`  | Generar: `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | Idem                                        |
| `VAPID_SUBJECT`     | `mailto:admin@...`                          |

---

## Sentry (opcional)

| Variable            | Descripción                  |
| ------------------- | ---------------------------- |
| `SENTRY_DSN`        | Backend                      |
| `VITE_SENTRY_DSN`   | Frontend (embebido en build) |
| `SENTRY_AUTH_TOKEN` | Source maps en CI            |

---

## FFmpeg (opcional)

| Variable      | Descripción                                    |
| ------------- | ---------------------------------------------- |
| `FFMPEG_PATH` | Ruta a `ffmpeg` para comprimir videos al subir |

---

## Variables embebidas en build (`VITE_*`)

Se incluyen en el bundle frontend en tiempo de build. Si cambias `VITE_*` en Render, haz **Clear build cache** y redeploy.

---

## Archivos de entorno por entorno

| Archivo        | Uso                                             |
| -------------- | ----------------------------------------------- |
| `.env`         | Activo local (puede ser symlink a `.env.dev`)   |
| `.env.dev`     | Proyecto Supabase desarrollo                    |
| `.env.prod`    | Producción local (migraciones prod desde tu PC) |
| `.env.example` | Plantilla sin secretos (sí en git)              |

**Nunca** commitees `.env`, `.env.dev` ni `.env.prod`.

---

## Enlaces

- [Instalación](./INSTALACION-NUEVO-EQUIPO.md)
- [Entornos y seguridad](./ENTORNOS-Y-SEGURIDAD.md)
- [Despliegue](../DEPLOY.md)
