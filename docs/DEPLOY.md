# Despliegue a producción (Render + Supabase)

Guía para GymApure en producción. El proyecto Supabase de producción actual es **GymApure – Producción** (`ffjwvlcwhyskddqqojnp`), enlazado a Render. Mapa de entornos: [tecnico/SUPABASE-PROYECTOS.md](./tecnico/SUPABASE-PROYECTOS.md).

> **Instalación nueva desde cero:** la Parte 1 describe crear un proyecto Supabase de producción. Si ya tienes **GymApure – Producción**, salta a migraciones y variables en Render.

## Prerrequisitos

- Cuenta en [supabase.com](https://supabase.com)
- Cuenta en [render.com](https://render.com)
- Repositorio en GitHub con los fixes de seguridad mergeados en `main`
- Node.js 20+ en tu máquina

---

## Parte 1 — Supabase producción

### 1. Crear proyecto

1. Supabase Dashboard → **New project**
2. Elige región cercana a tus usuarios (ej. `East US`)
3. Guarda la contraseña de la base de datos en un gestor de contraseñas

### 2. Obtener credenciales

**Database** (Project Settings → Database):

- Copia la connection string **Transaction pooler** (puerto **6543**)
- Será tu `DATABASE_URL`

**API** (Project Settings → API):

- Copia `SUPABASE_SERVICE_ROLE_KEY` (service_role JWT o `sb_secret_…`)
- Opcional: `SUPABASE_URL` (se deduce de `DATABASE_URL` si no la defines)

### 3. Aplicar migraciones

En tu máquina, crea un `.env` temporal **solo para prod** (no lo commitees):

```powershell
# Generar secretos
openssl rand -base64 48   # JWT_SECRET
openssl rand -base64 32   # CRON_SECRET

# .env (valores de producción)
JWT_SECRET=<el valor generado>
CRON_SECRET=<el valor generado>
DATABASE_URL=postgresql://postgres.[REF]:[PASS]@...pooler.supabase.com:6543/postgres
SUPABASE_SERVICE_ROLE_KEY=<service role de prod>
NODE_ENV=production
```

Ejecuta:

```powershell
npm run deploy:preflight
npm run deploy:release -- --run
# Cuando staging OK:
npm run db:migrate:prod
# o: npm run deploy:release -- --run --migrate-prod
npm run db:health
```

`db:health` debe reportar **RLS OK** y sin problemas críticos.

Migraciones de seguridad recientes (aplicar en cada release que las incluya):

| Archivo                                  | Qué hace                                          |
| ---------------------------------------- | ------------------------------------------------- |
| `20260711120000_user_mfa.sql`            | Columnas `mfa_secret`, `mfa_enabled` en `users`   |
| `20260711120100_storage_objects_rls.sql` | Deny-all RLS en `storage.objects` (solo Supabase) |

### 4. Crear administrador inicial

```powershell
npm run db:create-admin
```

O define en `.env`:

```
ADMIN_FULL_NAME=Tu Nombre
ADMIN_EMAIL=admin@tudominio.com
ADMIN_PASSWORD=<contraseña segura>
```

**No ejecutes** `npm run db:restore-demo` en producción.

### 5. Verificar Storage

En Supabase Dashboard → **Storage**, confirma que existen los buckets:

- `payment-proofs`
- `avatars`
- `exercise-videos`
- `equipment-photos`

Deben ser **privados** (acceso solo vía backend). La migración `storage_objects_rls` bloquea además el acceso directo vía API de Supabase (`anon`/`authenticated`).

---

## Parte 2 — Render

### 1. Conectar repositorio

1. Render Dashboard → **New → Blueprint**
2. Conecta el repo `caribean-gym`
3. Render leerá [`render.yaml`](../render.yaml):
   - Plan: **Starter** (recomendado; evita cold starts)
   - Build: `npm ci && npm run build`
   - Start: `npm start`
   - Health: `/api/health`

### 2. Variables de entorno

**Opción A — Blueprint Sync (recomendado):** tras cada cambio en [`render.yaml`](../render.yaml), en Render Dashboard → **Blueprints** → **Sync**. Eso crea el Key Value `caribean-gym-kv`, inyecta `REDIS_URL`, fija `PUBLIC_APP_URL=https://caribean-gym.onrender.com` y `REQUIRE_MFA_FOR_STAFF=false` (MFA opcional).

**Opción B — Manual:** configura en Render Dashboard → Environment (plantilla en [`scripts/deploy/render-prod.env.example`](../scripts/deploy/render-prod.env.example)):

Configura en Render Dashboard → Environment:

| Variable                         | Obligatoria  | Notas                                                                                   |
| -------------------------------- | ------------ | --------------------------------------------------------------------------------------- |
| `JWT_SECRET`                     | Sí           | `openssl rand -base64 48` — único, no reutilizar dev                                    |
| `DATABASE_URL`                   | Sí           | Pooler Supabase prod, puerto 6543                                                       |
| `SUPABASE_SERVICE_ROLE_KEY`      | Sí           | Service role de prod                                                                    |
| `NODE_ENV`                       | Sí           | `production` (ya en blueprint)                                                          |
| `CRON_SECRET`                    | **Sí**       | `openssl rand -base64 32` — obligatorio; el servidor no arranca sin él                  |
| `PUBLIC_APP_URL`                 | **Sí**       | `https://caribean-gym.onrender.com` — HTTPS; enlaces de reset y walk-in                 |
| `REQUIRE_MFA_FOR_STAFF`          | No           | `false` en Blueprint — MFA opcional; staff puede activarlo en `/security`               |
| `REDIS_URL`                      | **Sí (ops)** | Blueprint inyecta Key Value `caribean-gym-kv`; sin Redis el rate limit es por instancia |
| `CORS_ORIGINS`                   | Opcional     | Solo si usas dominio custom aparte del de Render                                        |
| `ENABLE_HIBP_CHECK`              | Opcional     | `true` rechaza contraseñas filtradas (Have I Been Pwned)                                |
| `DATABASE_SSL_CA`                | Recomendada  | Ruta al CA **o PEM inline** de Supabase (verify-full). Sin esto, TLS sin verificar.     |
| `REDIS_URL`                      | **Sí (ops)** | Blueprint Key Value / Upstash                                                           |
| `SENTRY_DSN` / `VITE_SENTRY_DSN` | Recomendada  | Errores en prod                                                                         |
| `SMTP_*`                         | **Sí (ops)** | Correos transaccionales                                                                 |
| `VITE_SENTRY_DSN` / `SENTRY_DSN` | Recomendada  | Monitoreo de errores (configurar en Dashboard; Clear build cache si añades VITE_*)      |
| `SMTP_HOST`                      | **Sí (ops)** | `smtp.gmail.com` — sin esto no se envían correos                                        |
| `SMTP_PORT`                      | Recomendada  | `587`                                                                                   |
| `SMTP_SECURE`                    | Recomendada  | `false`                                                                                 |
| `SMTP_USER`                      | Recomendada  | `soporte.gymapure@gmail.com`                                                            |
| `SMTP_PASS`                      | Recomendada  | Contraseña de aplicación Google (sin espacios)                                          |
| `SMTP_FROM`                      | Recomendada  | `GymApure <soporte.gymapure@gmail.com>`                                                 |
| `ADMIN_NOTIFY_EMAILS`            | Recomendada  | CSV de correos admin para alertas (pago pendiente de revisión)                          |
| `VAPID_PUBLIC_KEY`               | Opcional*    | Clave pública Web Push (`npx web-push generate-vapid-keys`)                             |
| `VAPID_PRIVATE_KEY`              | Opcional*    | Clave privada Web Push (solo servidor; no en `VITE_*`)                                  |
| `VAPID_SUBJECT`                  | Opcional*    | `mailto:soporte.gymapure@gmail.com`                                                     |

\*Sin las tres `VAPID_*`, el push con la app cerrada no envía nada (preflight avisa). Genera un par, pégalo en Render y redeploy. Tras rotar claves, los usuarios deben reactivar notificaciones en Perfil.

**Redis (`REDIS_URL`):** recomendado en producción. Sin Redis, rate limiting y bloqueo de login usan memoria local (se resetean al reiniciar y no se comparten entre instancias). El servidor arranca igual pero registra un aviso en logs.

1. [Upstash](https://upstash.com) → **Create Database** → región cercana a Render
2. Copia la URL `rediss://…` (TLS)
3. En Render → Environment → `REDIS_URL=<url>`
4. Redeploy del Web Service

**`PUBLIC_APP_URL`:** obligatorio en producción. Debe ser la URL HTTPS pública final (Render o dominio custom). Se usa en enlaces de recuperar contraseña y walk-in. Si cambias a dominio custom, actualiza esta variable y redeploy.

**`ENABLE_HIBP_CHECK`:** opcional. Con `true`, el registro y cambio de contraseña consultan Have I Been Pwned. Si la API no responde en producción, la operación se rechaza (fail-closed).

Tras configurar SMTP, verifica con sesión admin:

```powershell
# Tras login (cookie en cookies.txt)
curl -sS https://<tu-app>.onrender.com/api/health/ops -b cookies.txt
```

Debe incluir `"email": { "configured": true }`.

Correos que usa SMTP: bienvenida, walk-in (crear contraseña), recuperar contraseña, pago aprobado/rechazado, avisos de membresía por vencer/vencida (además de chat e in-app). Con `ADMIN_NOTIFY_EMAILS` (CSV), el staff recibe alerta cuando un cliente reporta un pago pendiente.

Prueba manual de plantillas (con SMTP local):

```powershell
npx tsx scripts/test/test-smtp-send.ts tu@correo.com all
```

> **Importante:** Las variables `VITE_*` se embeben en el build. Si las añades después del primer deploy, haz **Manual Deploy → Clear build cache**.

### 3. Primer deploy

1. Aplica el Blueprint o haz deploy desde `main`
2. Espera que el health check quede verde
3. Prueba: `GET https://<tu-app>.onrender.com/api/health`

Respuesta esperada (pública, mínima):

```json
{
  "status": "ok",
  "db": "up",
  "db_latency_ms": 12.34
}
```

El endpoint público **no** expone `allowPublicRegister` ni estado de SMTP. Esa información está en `GET /api/health/ops` (solo admin).

### 4. Smoke tests

Desde tu máquina:

```powershell
$env:SMOKE_BASE_URL="https://<tu-app>.onrender.com"
npm run test:smoke
```

Con datos demo **no** disponibles en prod, las suites E2E completas requieren usuarios reales. Prueba manualmente:

- [ ] Login con cuenta admin
- [ ] **MFA:** activar en **Seguridad MFA** (`/security`) con Google Authenticator / Authy
- [ ] Login admin con código MFA (si está activo)
- [ ] Crear un miembro
- [ ] Walk-in: verificar que si falla el correo se muestra **enlace** (no contraseña en texto plano)
- [ ] Registrar pago con comprobante (verificar archivo en Supabase Storage)
- [ ] Check-in en recepción
- [ ] PWA: instalar en móvil

### 5. Dominio custom (opcional)

1. Render → Settings → Custom Domains
2. Añade tu dominio y configura DNS (CNAME a Render)
3. Si usas dominio custom, actualiza `CORS_ORIGINS` con `https://tudominio.com`
4. Actualiza `PUBLIC_APP_URL` con el dominio final (enlaces de correo y walk-in)
5. Redeploy con clear build cache si cambiaste `VITE_*`

### 6. Cron de vencimientos (opcional)

El servidor ejecuta cron in-process cada hora. Para redundancia:

1. Render → **New Cron Job**
2. Schedule: `0 * * * *`
3. Command:

```bash
curl -sS -X POST "https://<tu-app>.onrender.com/api/settings/expiry/run" -H "x-cron-secret: $CRON_SECRET"
```

> **Nota:** Estas rutas aceptan `x-cron-secret` **sin cookie JWT**. Si el secret es incorrecto, responden 403.

### 7. Cron tasa BCV (opcional)

La tasa USD se actualiza automáticamente al arrancar el servidor y cada hora (cron in-process). Para redundancia en días laborables:

1. Render → **New Cron Job**
2. Schedule: `0 10,14,18 * * 1-5` (6am, 10am, 2pm hora Venezuela aprox.)
3. Command:

```bash
curl -sS -X POST "https://<tu-app>.onrender.com/api/exchange-rate/refresh" -H "x-cron-secret: $CRON_SECRET"
```

Si el BCV no responde, el admin puede ingresar un override manual en **Configuración → Tasa de cambio USD**.

---

## Seguridad post-deploy

### MFA para staff (admin, recepcionista y entrenador)

1. Inicia sesión como admin o recepcionista
2. Ve a **Seguridad MFA** en el menú (ruta `/security`)
3. Pulsa **Configurar MFA** → escanea el QR con Google Authenticator, Authy u otra app TOTP
4. Introduce el código de 6 dígitos y activa
5. A partir de entonces, el login pedirá email + contraseña + código MFA (solo si MFA está activo)

**CSRF:** las rutas protegidas con mutaciones exigen cookie `csrf_token` + header `X-CSRF-Token`. El frontend lo envía automáticamente; no requiere configuración extra en Render same-origin.

API relacionada (referencia):

| Método | Ruta                         | Auth                                           |
| ------ | ---------------------------- | ---------------------------------------------- |
| `GET`  | `/api/auth/mfa/status`       | Sesión staff                                   |
| `POST` | `/api/auth/mfa/setup`        | Sesión staff                                   |
| `POST` | `/api/auth/mfa/enable`       | Sesión staff                                   |
| `POST` | `/api/auth/mfa/disable`      | Sesión staff + contraseña + código             |
| `POST` | `/api/auth/mfa/verify-login` | Público (tras login con `mfa_challenge_token`) |

### Walk-in sin contraseñas en API

Si el correo de bienvenida falla en recepción, la API devuelve `password_setup_url` (enlace de un solo uso, 48 h). **Nunca** devuelve `temporary_password`. El recepcionista copia el enlace y lo entrega al cliente (WhatsApp, QR en pantalla, etc.).

### Endpoints de salud

| Ruta                      | Acceso  | Contenido                           |
| ------------------------- | ------- | ----------------------------------- |
| `GET /api/health`         | Público | `status`, `db`, `db_latency_ms`     |
| `GET /api/health/ops`     | Admin   | Uptime, SMTP, `allowPublicRegister` |
| `GET /api/health/metrics` | Admin   | Métricas de rendimiento             |

---

## En cada deploy posterior

1. Revisa si hay migraciones nuevas en `supabase/migrations/`
2. Si las hay, **antes o justo después** del deploy:

   ```powershell
   npm run db:migrate
   ```

3. Render redeploya automáticamente al push a `main` (si auto-deploy está activo)
4. Verifica `GET /api/health`
5. Si añadiste `REDIS_URL` o `CRON_SECRET`, reinicia el servicio en Render

---

## Checklist pre-launch

```
Seguridad (código)
[x] trust proxy habilitado en producción
[x] /uploads estático deshabilitado en producción
[x] /auth/refresh usa verifySessionToken
[x] WebSocket usa verifySessionToken + CORS restringido
[x] Cron externo funciona con x-cron-secret (sin JWT)
[x] Walk-in no devuelve contraseñas en texto plano
[x] MFA TOTP disponible para admin/recepcionista/entrenador
[x] CSRF en rutas protegidas; bcrypt cost 12 con rehash automático
[x] PUBLIC_APP_URL obligatorio en producción

Supabase producción
[ ] Proyecto nuevo creado (separado de dev)
[ ] npm run db:migrate:prod (o deploy:release -- --migrate-prod)
[ ] npm run db:health → OK
[ ] npm run db:create-admin → admin creado
[ ] Buckets Storage privados verificados

Render
[ ] JWT_SECRET único
[ ] DATABASE_URL pooler :6543
[ ] SUPABASE_SERVICE_ROLE_KEY configurado
[ ] CRON_SECRET configurado (obligatorio)
[ ] PUBLIC_APP_URL = https://<dominio-real> (obligatorio)
[ ] REDIS_URL configurado (ops — Blueprint Key Value)
[ ] SMTP_* configurado (ops)
[ ] SENTRY_DSN / VITE_SENTRY_DSN (recomendado)
[ ] DATABASE_SSL_CA (recomendado — PEM o ruta)
[ ] Plan Starter
[ ] GET /api/health → 200 + db up
[ ] GET /api/health/ops (admin) → email configured
[ ] Login admin funciona
[ ] MFA disponible (opcional; no forzado)
[ ] Upload comprobante → visible en Supabase Storage
[ ] Cron jobs externos responden 200 con x-cron-secret
```

---

## Videos de ejercicios (producción)

En Render **no** se transcodifica video en el servidor (sin FFmpeg, RAM limitada ~512 MB). El flujo en producción es **Opción C+E**:

1. El entrenador selecciona un MP4/WebM **ya comprimido** (≤ 15 MB, ≤ 60 s, 720p recomendado).
2. La app pide `POST /api/exercises/upload-url` y sube **directo a Supabase Storage** (bucket `exercise-videos`).
3. Solo se guarda la referencia `sbmedia:videos:…` en la base de datos.
4. Los miembros reproducen con **URL firmada** de corta duración (sin proxy por Render).

### Comprimir antes de subir (obligatorio en prod)

Usa HandBrake, FFmpeg local o similar:

```powershell
ffmpeg -i entrada.mov -c:v libx264 -crf 26 -preset fast -vf "scale='min(1280,iw)':-2" -movflags +faststart -c:a aac -b:a 96k -t 60 salida.mp4
```

| Límite                 | Valor                                     |
| ---------------------- | ----------------------------------------- |
| Duración máx.          | 60 s                                      |
| Tamaño máx. en prod    | 15 MB (sin transcodificación en servidor) |
| Formatos               | MP4 (H.264) o WebM                        |
| Resolución recomendada | 720p                                      |

### Diagnóstico

```powershell
# Con sesión admin (cookie tras login)
curl -sS https://<tu-app>.onrender.com/api/health/media -b cookies.txt
```

Respuesta esperada en prod:

- `track`: `direct_supabase`
- `directUpload`: `true`
- `ffmpegOnServer`: `false`
- `signedPlayback`: `true`

### Cuota Supabase Storage

El plan Free incluye ~1 GB total. Si tienes muchos ejercicios con video, valora **Supabase Pro** o migrar a R2/S3 (mismo patrón de URL firmada).

### Desarrollo local

Sin `SUPABASE_SERVICE_ROLE_KEY` válida: upload multipart clásico a `uploads/videos/` con FFmpeg opcional en tu máquina.

---

## Solución de problemas

| Síntoma                          | Causa probable                                                               | Solución                                                                  |
| -------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Build `Exited with status 127`   | `NODE_ENV=production` hace que `npm ci` omita devDependencies (vite/esbuild) | Build Command: `npm ci --include=dev && npm run build`                    |
| Servidor no arranca              | Falta `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` o `PUBLIC_APP_URL` (HTTPS)  | Configurar las tres en Render; obligatorias en prod                       |
| `db: down` en health             | `DATABASE_URL` incorrecta o pooler caído                                     | Verificar credenciales y puerto 6543                                      |
| Cron externo responde 403        | `CRON_SECRET` incorrecto o no definido en el Cron Job de Render              | Misma variable en Web Service y Cron Job; header `x-cron-secret`          |
| Login staff pide código extra    | MFA activo para admin/recepcionista/entrenador                               | Usar app TOTP; configurar en `/security`                                  |
| Walk-in sin correo               | SMTP no configurado o Gmail bloqueó                                          | Verificar `GET /api/health/ops`; entregar `password_setup_url` al cliente |
| Uploads fallan                   | Clave Supabase mal copiada                                                   | Sin comillas; reiniciar servicio tras corregir                            |
| App lenta al primer acceso       | Plan Free con sleep                                                          | Usar plan Starter                                                         |
| Brute-force evade lockout        | Varias instancias sin Redis                                                  | Configurar `REDIS_URL` (Upstash)                                          |
| Videos no se comprimen           | FFmpeg no disponible en Render                                               | Comprimir localmente (≤ 15 MB) y usar upload directo en la app            |
| Video falla al guardar en prod   | Archivo > 15 MB o multipart antiguo                                          | Recomprimir; la UI usa upload directo si `directUpload: true`             |
| `memory_rss_mb` alto tras videos | Proxy antiguo por Render                                                     | Desplegar versión con URLs firmadas; verificar `GET /api/health/media`    |

---

## Referencias

- [DESARROLLO.md](./DESARROLLO.md) — desarrollo local
- [TESTING.md](./TESTING.md) — pruebas y CI
- [`render.yaml`](../render.yaml) — blueprint de Render
