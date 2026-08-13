# Deploy a Railway (alternativa a Render)

Opción de hosting si no usas Render. GymApure es un proceso Node largo (Express + SPA + WebSockets + crons). **Railway** encaja con el mismo `npm run build` / `npm start`.

**Hosting principal del proyecto:** [DEPLOY.md](./DEPLOY.md) (Render).

La base de producción sigue en Supabase **GymApure – Producción** (`ffjwvlcwhyskddqqojnp`). Migrar de hosting **no** migra la BD: reutilizas el mismo `DATABASE_URL` de prod.

Config en repo: [`railway.toml`](../railway.toml) · plantilla env: [`scripts/deploy/railway-prod.env.example`](../scripts/deploy/railway-prod.env.example).

---

## Prerrequisitos

- Cuenta en [railway.app](https://railway.app) (plan Hobby alcanza para empezar)
- Acceso al repo GitHub
- Secretos de prod (los que tenías en Render o en `.env.prod` local):
  - `JWT_SECRET`, `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`
  - SMTP / VAPID / Sentry si ya los usabas
- Redis: plugin Railway **o** [Upstash](https://upstash.com) (`REDIS_URL`)

Verifica localmente que la BD prod responde (CLI, no el servidor de gym):

```powershell
npm run env:check
npm run db:health:prod
```

---

## Parte 1 — Crear el servicio (Dashboard)

1. [Railway Dashboard](https://railway.app/dashboard) → **New Project** → **Deploy from GitHub repo**
2. Elige `caribean-gym` / `GymApure` y la rama `main`
3. Railway detecta [`railway.toml`](../railway.toml):
   - Build: `npm ci --include=dev && npm run build`
   - Start: `npm start`
   - Health: `/api/health`
4. (Recomendado) **Add service** → **Redis** en el mismo proyecto  
   Luego en el servicio web: **Variables** → **Add variable reference** → `REDIS_URL` del Redis

---

## Parte 2 — Variables de entorno

En el servicio web → **Variables**, pega (mínimo):

| Variable                                              | Notas                                                                                     |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `NODE_ENV`                                            | `production` (también en `railway.toml`)                                                  |
| `JWT_SECRET`                                          | El **mismo** de Render si no quieres invalidar sesiones                                   |
| `DATABASE_URL`                                        | Pooler Supabase **prod** puerto **6543**                                                  |
| `SUPABASE_SERVICE_ROLE_KEY`                           | Service role de **GymApure – Producción**                                                 |
| `CRON_SECRET`                                         | Obligatorio; sin esto no arranca                                                          |
| `PUBLIC_APP_URL`                                      | URL HTTPS de Railway (ej. `https://….up.railway.app`) — actualízala tras el primer deploy |
| `REQUIRE_MFA_FOR_STAFF`                               | `false` (o `true` si ya lo exigías)                                                       |
| `ENABLE_HIBP_CHECK`                                   | `true` recomendado                                                                        |
| `REDIS_URL`                                           | Referencia al plugin Redis o Upstash                                                      |
| `SMTP_*` / `VAPID_*` / `SENTRY_*` / `VITE_SENTRY_DSN` | Como en Render                                                                            |

Plantilla: [`scripts/deploy/railway-prod.env.example`](../scripts/deploy/railway-prod.env.example).

**Importante:** `VITE_*` se inyectan en el **build**. Si añades `VITE_SENTRY_DSN` después, haz **Redeploy** (rebuild), no solo restart.

Railway asigna `PORT` solo — no fijes `PORT=3000` en Variables.

---

## Parte 3 — Dominio y smoke

1. **Settings → Networking → Generate domain** (o custom domain)
2. Pon esa URL en `PUBLIC_APP_URL` y redeploy
3. Prueba:

```powershell
curl -sS https://<tu-app>.up.railway.app/api/health
```

Esperado: `{"status":"ok","db":"up",...}`

4. Login admin en el navegador, un check-in / mensaje si puedes
5. Con cookie de admin: `GET /api/health/ops` → `email.configured` si SMTP está bien

---

## Parte 4 — CLI (opcional)

```powershell
npx @railway/cli login
npx @railway/cli link
npx @railway/cli up
npx @railway/cli logs
npx @railway/cli variables
```

No subas `.env.prod` al repo. Usa el Dashboard o `railway variables set KEY=value`.

---

## Checklist de migración desde Render

```
- [ ] db:health:prod OK desde tu PC
- [ ] Proyecto Railway + servicio web + Redis
- [ ] Variables copiadas (mismos secretos prod)
- [ ] PUBLIC_APP_URL = dominio Railway
- [ ] Deploy verde + /api/health ok
- [ ] Login admin + un flujo member
- [ ] SMTP / push / MFA según lo que usabas
- [ ] Actualizar bookmarks / DNS si había dominio custom
- [ ] Apagar o borrar el servicio Render cuando Railway esté estable
```

---

## Qué no hacer

- Apuntar Railway a `.env.dev` / ref `sqjyxmbtgmiorckigrrg`
- Ejecutar `db:restore-demo` contra prod
- Migrar a Vercel el monolit Express (WS + crons se rompen)
- Rotar `JWT_SECRET` “por curiosidad” en el cutover (echa a todos)

---

## Troubleshooting

| Síntoma                       | Qué revisar                                  |
| ----------------------------- | -------------------------------------------- |
| Health `db: down`             | `DATABASE_URL` pooler `:6543`, password, SSL |
| Build falla en `vite`         | Logs; Node 20 (`NIXPACKS_NODE_VERSION`)      |
| Rate limit raro / login flaky | Falta `REDIS_URL`                            |
| Correos no salen              | `SMTP_*` + `/api/health/ops`                 |
| App abre pero API 401 masivo  | `JWT_SECRET` distinto al anterior            |

Guía legacy Render: [DEPLOY.md](./DEPLOY.md). Mapa Supabase: [tecnico/SUPABASE-PROYECTOS.md](./tecnico/SUPABASE-PROYECTOS.md).
