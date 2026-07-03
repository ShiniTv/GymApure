# GymApure

Sistema de gestión para gimnasio: miembros, pagos, asistencia, rutinas y entrenamientos.

**Stack:** React 19 + Vite + Tailwind · Express · PostgreSQL (Supabase)

> **Guía de desarrollo:** **[docs/DESARROLLO.md](docs/DESARROLLO.md)** · **Índice docs:** **[docs/README.md](docs/README.md)**

## Requisitos

- Node.js 20+
- Base de datos PostgreSQL (recomendado: [Supabase](https://supabase.com))

## Configuración local

Instalación paso a paso, comandos y estructura del código: **[docs/DESARROLLO.md](docs/DESARROLLO.md)**

Resumen rápido:

```bash
npm install
```

2. Copiar variables de entorno:

   ```bash
   cp .env.example .env
   ```

3. Editar `.env`:

   - **JWT_SECRET:** genera un secreto aleatorio de al menos 32 caracteres:
     ```bash
     openssl rand -base64 48
     ```
   - **DATABASE_URL:** cadena de conexión de Supabase (modo Transaction / puerto 6543).
   - **DEMO_PASSWORD:** contraseña para cuentas demo en desarrollo y tests (mín. 12 caracteres).

4. Aplicar migraciones de base de datos:

   ```bash
   npm run db:migrate
   ```

   Este comando aplica automáticamente todos los archivos en `supabase/migrations/` que aún no se hayan ejecutado. Solo necesitas correrlo **una vez** después de actualizar el código (o al configurar el proyecto por primera vez).

   > Si prefieres hacerlo manualmente: abre el SQL Editor de Supabase y pega los archivos de `supabase/migrations/` en orden alfabético.

5. Crear la primera cuenta administrador:

   ```bash
   npm run db:create-admin
   ```

   Indica nombre, email y contraseña (mín. 8 caracteres). También puedes definir `ADMIN_FULL_NAME`, `ADMIN_EMAIL` y `ADMIN_PASSWORD` en `.env` para modo no interactivo.

6. Arrancar en desarrollo:

   ```bash
   npm run dev
   ```

   La app queda en `http://localhost:3000` (o el `PORT` definido en `.env`).

## Scripts

| Comando                          | Descripción                                                     |
| -------------------------------- | --------------------------------------------------------------- |
| `npm run dev`                    | Servidor Express + Vite en modo desarrollo                      |
| `npm run build`                  | Build frontend + bundle del servidor                            |
| `npm start`                      | Servidor en producción (tras `build`)                           |
| `npm run lint`                   | Comprobación TypeScript strict (`tsc --noEmit`)                 |
| `npm run test:smoke`             | Pruebas smoke de la API (servidor en marcha)                    |
| `npm run test:e2e`               | Suite completa: integración + seguridad + auth + recepción      |
| `npm run verify:local-e2e`       | Levanta dev, espera healthcheck y ejecuta `test:e2e`            |
| `npm run dev:clean`              | Libera puerto 3000 y arranca dev sin `DATABASE_URL` del sistema |
| `npm run db:migrate`             | Aplica migraciones SQL pendientes en Supabase/Postgres          |
| `npm run db:migrate-from-sqlite` | Importación única desde SQLite legacy                           |
| `npm run db:create-admin`        | Crea o actualiza la cuenta administrador inicial                |
| `npm run db:restore-demo`        | Solo CI/tests automáticos — cuentas demo ficticias              |
| `npm run deploy:preflight`       | Valida `.env` antes de migrar/desplegar a producción            |

> Guía detallada de pruebas: **[docs/TESTING.md](docs/TESTING.md)**  
> **Despliegue a producción (Render + Supabase):** **[docs/DEPLOY.md](docs/DEPLOY.md)**

## Cuentas y acceso

- **Administrador:** créalo con `npm run db:create-admin` e inicia sesión en `/login`.
- **Miembros:** registro público en `/register` (activo en desarrollo; desactivado en producción por defecto).
- **Staff (entrenador/admin):** el administrador los crea en **Miembros → Nuevo Usuario** con contraseña inicial.

> `npm run db:restore-demo` queda reservado para **CI y scripts de prueba** (`test:sprint*`). No lo uses para el flujo normal de la app.

## Alertas de vencimiento

Las alertas **ya funcionan solas** al arrancar el servidor (`npm run dev`). No necesitas configurar email para probarlas.

### Lo que tienes que hacer tú (2 pasos)

1. **Actualizar la base de datos** (solo una vez después de bajar el código nuevo):

   ```bash
   npm run db:migrate
   ```

2. **Arrancar el servidor**:

   ```bash
   npm run dev
   ```

3. Entra con tu cuenta admin → **Configuración** (ajusta días de anticipación, guarda).

Eso es todo para uso básico. El cron envía avisos de vencimiento al **chat in-app** de cada miembro cada hora.

### Chat in-app

Los avisos de vencimiento, pagos y rutinas llegan al chat (**Mensajes** en el menú). Admin y recepción pueden responder a cada miembro en conversaciones 1 a 1. No se requiere SMTP, WhatsApp ni SMS externos.

Prueba con `npm run test:chat-checklist` (servidor en marcha).

## Roadmap de calidad

Fases implementadas:

- **Fase 1 (seguridad crítica):** kiosk público eliminado; check-in solo staff autenticado; JWT revalidado contra BD; invalidación de sesiones (`token_version`).
- **Fase 2 (IDOR y datos):** trainers solo miembros asignados; rutinas filtradas por rol; validación de uploads (magic bytes).
- **Fase 3 (robustez):** `asyncRouter` global, rate limit API/uploads, React Query en páginas clave, TypeScript `strict`.
- **Fase 4 (tests y CI):** `test:security-checklist`, `test:e2e`, CI unificado, documentación de pruebas.

Fases anteriores: helmet, rate limit auth, RBAC, health check, code-splitting, CI GitHub Actions.

### Monitoreo

- **Health:** `GET /api/health` → `{ status, db, uptime_seconds }`
- **Smoke tests:** con el servidor corriendo, `npm run test:smoke`
- **E2E local:** `npm run verify:local-e2e` (ver [docs/TESTING.md](docs/TESTING.md))

### Check-in (solo personal autenticado)

1. Inicia sesión como **admin** o **recepcionista**.
2. Usa **Recepción** (`/reception`) o **Check-in** (`/check-in`) para entrada/salida por cédula.
3. Modo tablet: `/check-in?kiosk=1` (requiere sesión; ya no hay API pública ni claves en el frontend).
4. Tests: `npm run test:reception-checklist` y `npm run test:security-checklist`.

### Panel de recepción (staff autenticado)

1. Tras `npm run db:restore-demo`, inicia sesión como `receptionist@gym.com` (contraseña = `DEMO_PASSWORD`).
2. Abre **Recepción** en el menú o `/reception`.
3. Pestaña **Registro**: wizard walk-in (datos + plan + pago + entrada en un solo paso).
4. Pestaña **Entrada / Salida**: busca por cédula y autoriza acceso.
5. Tests: `npm run test:reception-checklist` (servidor en marcha).

### Crear pull request (sin GitHub CLI)

```bash
npm run pr:open
```

Abre el navegador en la página de compare de GitHub y creá el pull request desde ahí.
