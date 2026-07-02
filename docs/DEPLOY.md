# Despliegue a producción (Render + Supabase)

Guía paso a paso para llevar GymApure a producción. Requiere un **proyecto Supabase nuevo** (no reutilizar el de desarrollo).

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
# Generar secreto
openssl rand -base64 48

# .env (valores de producción)
JWT_SECRET=<el valor generado>
DATABASE_URL=postgresql://postgres.[REF]:[PASS]@...pooler.supabase.com:6543/postgres
SUPABASE_SERVICE_ROLE_KEY=<service role de prod>
NODE_ENV=production
```

Ejecuta:

```powershell
npm run deploy:preflight
npm run db:migrate
npm run db:health
```

`db:health` debe reportar **RLS OK** y sin problemas críticos.

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

Deben ser **privados** (acceso solo vía backend).

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

Configura en Render Dashboard → Environment:

| Variable | Obligatoria | Notas |
|----------|-------------|-------|
| `JWT_SECRET` | Sí | `openssl rand -base64 48` — único, no reutilizar dev |
| `DATABASE_URL` | Sí | Pooler Supabase prod, puerto 6543 |
| `SUPABASE_SERVICE_ROLE_KEY` | Sí | Service role de prod |
| `NODE_ENV` | Sí | `production` (ya en blueprint) |
| `CRON_SECRET` | Recomendada | `openssl rand -base64 32` |
| `VITE_EXCHANGE_RATE` | Recomendada | Tasa Bs/USD actual — **antes del build** |
| `CORS_ORIGINS` | Opcional | Solo si usas dominio custom aparte del de Render |
| `VITE_SENTRY_DSN` / `SENTRY_DSN` | Opcional | Monitoreo de errores |

> **Importante:** Las variables `VITE_*` se embeben en el build. Si las añades después del primer deploy, haz **Manual Deploy → Clear build cache**.

### 3. Primer deploy

1. Aplica el Blueprint o haz deploy desde `main`
2. Espera que el health check quede verde
3. Prueba: `GET https://<tu-app>.onrender.com/api/health`

Respuesta esperada:

```json
{ "status": "ok", "db": { "status": "up" } }
```

### 4. Smoke tests

Desde tu máquina:

```powershell
$env:SMOKE_BASE_URL="https://<tu-app>.onrender.com"
npm run test:smoke
```

Con datos demo **no** disponibles en prod, las suites E2E completas requieren usuarios reales. Prueba manualmente:

- [ ] Login con cuenta admin
- [ ] Crear un miembro
- [ ] Registrar pago con comprobante (verificar archivo en Supabase Storage)
- [ ] Check-in en recepción
- [ ] PWA: instalar en móvil

### 5. Dominio custom (opcional)

1. Render → Settings → Custom Domains
2. Añade tu dominio y configura DNS (CNAME a Render)
3. Si usas dominio custom, actualiza `CORS_ORIGINS` con `https://tudominio.com`
4. Redeploy con clear build cache si cambiaste `VITE_*`

### 6. Cron de vencimientos (opcional)

El servidor ejecuta cron in-process cada hora. Para redundancia:

1. Render → **New Cron Job**
2. Schedule: `0 * * * *`
3. Command:

```bash
curl -sS -X POST "https://<tu-app>.onrender.com/api/settings/expiry/run" -H "x-cron-secret: $CRON_SECRET"
```

---

## En cada deploy posterior

1. Revisa si hay migraciones nuevas en `supabase/migrations/`
2. Si las hay, **antes o justo después** del deploy:

   ```powershell
   npm run db:migrate
   ```

3. Render redeploya automáticamente al push a `main` (si auto-deploy está activo)
4. Verifica `GET /api/health`

---

## Checklist pre-launch

```
Seguridad (código)
[x] trust proxy habilitado en producción
[x] /uploads estático deshabilitado en producción
[x] /auth/refresh usa verifySessionToken
[x] WebSocket usa verifySessionToken + CORS restringido

Supabase producción
[ ] Proyecto nuevo creado (separado de dev)
[ ] npm run db:migrate ejecutado
[ ] npm run db:health → OK
[ ] npm run db:create-admin → admin creado
[ ] Buckets Storage privados verificados

Render
[ ] JWT_SECRET único
[ ] DATABASE_URL pooler :6543
[ ] SUPABASE_SERVICE_ROLE_KEY configurado
[ ] CRON_SECRET configurado
[ ] VITE_EXCHANGE_RATE configurado antes del build
[ ] Plan Starter
[ ] GET /api/health → 200 + db up
[ ] Login admin funciona
[ ] Upload comprobante → visible en Supabase Storage
```

---

## Solución de problemas

| Síntoma | Causa probable | Solución |
|---------|----------------|----------|
| Build `Exited with status 127` | `NODE_ENV=production` hace que `npm ci` omita devDependencies (vite/esbuild) | Build Command: `npm ci --include=dev && npm run build` |
| Servidor no arranca | Falta `SUPABASE_SERVICE_ROLE_KEY` | Configurar en Render; obligatorio en prod |
| `db: down` en health | `DATABASE_URL` incorrecta o pooler caído | Verificar credenciales y puerto 6543 |
| Uploads fallan | Clave Supabase mal copiada | Sin comillas; reiniciar servicio tras corregir |
| App lenta al primer acceso | Plan Free con sleep | Usar plan Starter |
| Videos no se comprimen | FFmpeg no disponible en Render | Subir MP4 ya optimizados |

---

## Referencias

- [DESARROLLO.md](./DESARROLLO.md) — desarrollo local
- [TESTING.md](./TESTING.md) — pruebas y CI
- [`render.yaml`](../render.yaml) — blueprint de Render
