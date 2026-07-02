# Guía de desarrollo — GymApure

Referencia rápida para instalar, correr, probar y seguir mejorando el sistema.

**Stack:** React 19 + Vite + Tailwind · Express · PostgreSQL (Supabase) · TypeScript strict

---

## 1. Requisitos

| Herramienta | Versión |
|-------------|---------|
| Node.js | 20+ |
| npm | 10+ (viene con Node) |
| Git | Cualquier versión reciente |
| PostgreSQL | Supabase (recomendado) o Postgres local |

Opcional: [GitHub CLI](https://cli.github.com/) (`gh`) para PRs desde terminal.

---

## 2. Instalación desde cero

### Windows (PowerShell)

```powershell
# 1. Clonar
git clone https://github.com/ShiniTv/caribean-gym.git
cd caribean-gym

# 2. Dependencias
npm install

# 3. Variables de entorno
copy .env.example .env
# Editar .env con un editor (ver sección 3)

# 4. Base de datos
npm run db:migrate

# 5. Admin inicial (flujo normal de la app)
npm run db:create-admin

# 6. Arrancar
npm run dev
```

Abrir: **http://localhost:3000**

### Mac / Linux

```bash
git clone https://github.com/ShiniTv/caribean-gym.git
cd caribean-gym
npm install
cp .env.example .env
# editar .env
npm run db:migrate
npm run db:create-admin
npm run dev
```

> Otra PC: copiá el archivo `.env` completo o usá `.env.example` como plantilla.

---

## 3. Configuración `.env` (mínimo)

| Variable | Obligatorio | Cómo obtenerla |
|----------|-------------|----------------|
| `JWT_SECRET` | Sí | `openssl rand -base64 48` (mín. 32 caracteres) |
| `DATABASE_URL` | Sí | Supabase → Database → Connection string (pooler **6543**) |
| `NODE_ENV` | No | `development` en local |
| `PORT` | No | `3000` por defecto |
| `DEMO_PASSWORD` | Solo tests | Mín. 12 caracteres; usado por `db:restore-demo` y scripts de prueba |
| `SUPABASE_SERVICE_ROLE_KEY` | Recomendado | Supabase → API → `service_role` (uploads a Storage) |
| `ALLOW_PUBLIC_REGISTER` | No | `true` en dev para `/register` |

Plantilla comentada completa: `.env.example`

---

## 4. Flujo diario de desarrollo

```powershell
# Terminal 1 — servidor (frontend + API en un solo proceso)
npm run dev

# Terminal 2 — mientras desarrollás
npm run lint          # TypeScript strict
npm run test:smoke    # API rápida (servidor corriendo)
```

### Después de `git pull` (código nuevo)

```powershell
npm install              # si cambió package.json
npm run db:migrate       # si hay migraciones nuevas en supabase/migrations/
npm run dev
```

### Antes de abrir un PR

```powershell
npm run lint
npm run build
npm run verify:local-e2e   # levanta dev + suite completa (cerrá otro dev en 3000 antes)
```

---

## 5. Lista de comandos

### Desarrollo

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Express + Vite HMR en `http://localhost:3000` |
| `npm run dev:clean` | Libera puerto 3000 y arranca dev |
| `npm run build` | Build frontend (`dist/`) + bundle servidor (`dist/server.cjs`) |
| `npm start` | Servidor producción (requiere `build` previo) |
| `npm run lint` | `tsc --noEmit` (TypeScript **strict**) |
| `npm run clean` | Borra `dist/` |

### Base de datos

| Comando | Qué hace |
|---------|----------|
| `npm run db:migrate` | Aplica migraciones SQL pendientes |
| `npm run db:health` | Comprueba conexión a Postgres |
| `npm run db:create-admin` | Crea/actualiza cuenta admin |
| `npm run db:reset-data` | Vacía usuarios y datos operativos (deja esquema intacto). Luego `db:create-admin` |
| `npm run db:restore-demo` | **Solo tests/CI** — usuarios demo ficticios |
| `npm run db:migrate-from-sqlite` | Migración única desde `gym.db` legacy |

### Pruebas (servidor en marcha salvo `verify:local-e2e`)

| Comando | Qué hace |
|---------|----------|
| `npm run test:smoke` | Health, login, RBAC básico, kiosk eliminado |
| `npm run test:integration` | Smoke + sprint 4/5/6 |
| `npm run test:security-checklist` | Seguridad Fases 1–3 (IDOR, sesiones, kiosk) |
| `npm run test:auth-checklist` | Registro, contraseña, invalidación JWT |
| `npm run test:reception-checklist` | Recepción, walk-in, check-in staff |
| `npm run test:e2e` | **Suite completa** (paridad con CI) |
| `npm run verify:local-e2e` | Levanta dev + `test:e2e` automático |
| `npm run test:sprint1` … `test:sprint6` | Módulos individuales (debug) |
| `npm run test:payments-checklist` | Pagos |
| `npm run test:memberships-checkin` | Membresías y check-in |
| `npm run test:chat-checklist` | Chat in-app (conversaciones, mensajes, unread) |
| `npm run lighthouse:ci` | Baseline Lighthouse (login) |

Detalle: [TESTING.md](./TESTING.md)

### Git / PR

| Comando | Qué hace |
|---------|----------|
| `npm run pr:open` | Abre compare en GitHub (PowerShell) |
| `gh pr create` | Crear PR (requiere `gh auth login`) |
| `gh pr merge <n>` | Mergear PR |

---

## 6. Cuentas y roles

### Flujo normal (producción / uso real)

1. Admin: `npm run db:create-admin`
2. Staff: admin crea usuarios en **Miembros → Nuevo usuario**
3. Miembros: `/register` (activo en dev si `ALLOW_PUBLIC_REGISTER=true`)

### Cuentas demo (solo tests)

Tras `npm run db:restore-demo` (contraseña = `DEMO_PASSWORD` en `.env`):

| Email | Rol | Notas |
|-------|-----|-------|
| `admin@gym.com` | admin | Dashboard, settings |
| `receptionist@gym.com` | receptionist | `/reception`, check-in |
| `trainer@gym.com` | trainer | Rutinas, miembros asignados |
| `member@gym.com` | member | Cédula `V-11223344`, rutina demo |

### Rutas por rol (referencia)

| Ruta | admin | receptionist | trainer | member |
|------|-------|--------------|---------|--------|
| `/dashboard` | ✓ | ✓ (recepción) | ✓ | ✓ |
| `/members` | ✓ | ✓ | ✓ (asignados) | — |
| `/reception` | ✓ | ✓ | — | — |
| `/check-in` | ✓ | ✓ | — | — |
| `/routines` | ✓ | — | ✓ | ✓ (propias) |
| `/payments` | ✓ | ✓ | — | ✓ (propios) |
| `/settings` | ✓ | — | — | — |

---

## 7. Estructura del proyecto (dónde tocar qué)

```
caribean-gym/
├── server.ts              # Entry Express: middleware, Vite dev, cron
├── src/
│   ├── App.tsx            # Rutas React + guards por rol
│   ├── main.tsx           # React Query provider
│   ├── pages/             # Pantallas (una carpeta/vista por módulo)
│   ├── components/        # UI reutilizable (components/ui/)
│   ├── hooks/queries/     # React Query (datos del servidor)
│   ├── context/           # Auth, stats admin/member, toast
│   ├── api/               # Routers Express (/api/*)
│   │   └── middleware/    # auth, access, rateLimit, asyncRouter
│   ├── lib/               # Lógica compartida (sessionAuth, uploads, etc.)
│   ├── config/            # env, jwt, cookies
│   └── db/                # Pool PostgreSQL
├── supabase/migrations/   # SQL versionado (npm run db:migrate)
├── scripts/               # Tests API, seeds, utilidades
└── docs/                  # Documentación
```

### Mapa módulo → archivos clave

| Módulo | Frontend | API | Notas |
|--------|----------|-----|-------|
| Auth / sesiones | `pages/Login.tsx`, `context/AuthContext.tsx` | `api/auth.ts`, `lib/sessionAuth.ts` | JWT + `token_version` |
| Miembros | `pages/Members.tsx` | `api/users.ts`, `middleware/access.ts` | IDOR trainers |
| Pagos | `pages/Payments.tsx`, `hooks/queries/usePaymentsQuery.ts` | `api/payments.ts` | Comprobantes upload |
| Recepción | `pages/Reception.tsx`, `reception/*` | `api/reception.ts` | Walk-in, check-in |
| Rutinas | `pages/Routines.tsx`, `routines/*` | `api/routines.ts`, `lib/routineSchemas.ts` | Filtro por rol |
| Ejercicios | `pages/Exercises.tsx`, `useExercisesQuery.ts` | `api/exercises.ts` | Videos upload |
| Asistencia | `pages/Attendance.tsx`, `CheckIn.tsx` | `api/attendance.ts` | Solo staff autenticado |
| Dashboard | `pages/Dashboard.tsx`, `member/`, `reception/` | `api/stats.ts` | Por rol |
| Settings | `pages/Settings.tsx` | `api/settings.ts` | Alertas, notificaciones |
| Archivos | — | `api/files.ts`, `lib/mediaStorage.ts` | Supabase Storage |

### Convenciones al agregar código

- **API async:** usar `asyncRouter()` en routers; los handlers async van al error handler global.
- **Datos en UI:** preferir hooks en `src/hooks/queries/` (React Query) en lugar de `useEffect` + `fetch`.
- **Acceso trainers:** usar `requireMemberAccess` / `trainerAccess.ts`, no abrir datos por ID sin chequeo.
- **Validación:** Zod en `lib/*Schemas.ts` o inline en routers.
- **Migraciones:** nuevo archivo en `supabase/migrations/` con timestamp `YYYYMMDDHHMMSS_nombre.sql`.
- **TypeScript:** el proyecto usa `"strict": true`; corré `npm run lint` antes de commitear.

---

## 8. Git y ramas

```powershell
# Nueva mejora
git checkout main
git pull
git checkout -b feat/mi-mejora

# ... cambios ...
git add .
git commit -m "Descripción clara del porqué"
git push -u origin feat/mi-mejora

# PR
npm run pr:open
# o: gh pr create --title "..." --body "..."
```

El CI en GitHub ejecuta: `lint` → `build` → migraciones → `test:e2e`.

---

## 9. Problemas frecuentes

### Puerto 3000 ocupado (`EADDRINUSE`)

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen | Select-Object OwningProcess
taskkill /PID <PID> /T /F
npm run dev
```

O: `npm run dev:clean`

### `verify:local-e2e` falla por puerto duplicado

No corras `npm run dev` y `verify:local-e2e` a la vez. El script levanta su propio servidor.

### Login / tests fallan

```powershell
npm run db:restore-demo    # requiere DEMO_PASSWORD en .env
npm run db:create-admin    # admin real para uso manual
```

### Migraciones

```powershell
npm run db:migrate
npm run db:health
```

### TypeScript errors tras pull

```powershell
npm install
npm run lint
```

---

## 10. Despliegue (cuando mergees a main)

Guía completa: **[DEPLOY.md](./DEPLOY.md)** (Supabase prod + Render + checklist).

Resumen:

1. Merge del PR a `main`
2. Crear proyecto Supabase de producción y `npm run db:migrate` + `npm run db:create-admin`
3. Deploy en Render (ver [`render.yaml`](../render.yaml))
4. Variables de entorno: `JWT_SECRET`, `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `VITE_EXCHANGE_RATE`
5. Smoke: `GET /api/health` · Manual: login admin, pago con comprobante

---

## 11. Documentación relacionada

| Documento | Contenido |
|-----------|-----------|
| [DEPLOY.md](./DEPLOY.md) | Producción: Supabase + Render + checklist |
| [TESTING.md](./TESTING.md) | Pruebas, CI, datos demo |
| [QA-VISUAL-CHECKLIST.md](./QA-VISUAL-CHECKLIST.md) | Revisión manual de UI |

Tokens de diseño en código: `src/index.css`, `src/lib/typography.ts`, `src/components/ui/`.

---

## 12. Checklist rápido (copiar al iniciar sesión de dev)

```
[ ] npm install (si hubo cambios)
[ ] .env con JWT_SECRET + DATABASE_URL
[ ] npm run db:migrate
[ ] npm run dev → http://localhost:3000
[ ] Login admin OK
[ ] npm run lint (antes de commit)
```

Para trabajar con datos de prueba además:

```
[ ] DEMO_PASSWORD en .env
[ ] npm run db:restore-demo
```
