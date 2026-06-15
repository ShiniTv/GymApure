# Caribbean Gym

Sistema de gestión para gimnasio: miembros, pagos, asistencia, rutinas y entrenamientos.

**Stack:** React 19 + Vite + Tailwind · Express · PostgreSQL (Supabase)

## Requisitos

- Node.js 20+
- Base de datos PostgreSQL (recomendado: [Supabase](https://supabase.com))

## Configuración local

1. Instalar dependencias:

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
   - **KIOSK_API_KEY** y **VITE_KIOSK_KEY:** misma clave aleatoria (mín. 16 caracteres).
   - **DEMO_PASSWORD:** contraseña para cuentas demo en desarrollo (mín. 12 caracteres).

4. Aplicar el esquema en Supabase (SQL Editor o CLI):

   - Archivo: `supabase/migrations/20260518000000_init_gym_schema.sql`

5. Restaurar cuentas demo (desarrollo):

   ```bash
   npm run db:restore-demo
   ```

   Usa el valor de `DEMO_PASSWORD` del `.env` para iniciar sesión.

6. Arrancar en desarrollo:

   ```bash
   npm run dev
   ```

   La app queda en `http://localhost:3000` (o el `PORT` definido en `.env`).

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor Express + Vite en modo desarrollo |
| `npm run build` | Build frontend + bundle del servidor |
| `npm start` | Servidor en producción (tras `build`) |
| `npm run lint` | Comprobación TypeScript (`tsc --noEmit`) |
| `npm run test:smoke` | Pruebas smoke de la API (servidor en marcha) |
| `npm run dev:clean` | Libera puerto 3000 y arranca dev sin `DATABASE_URL` del sistema |
| `npm run db:migrate-from-sqlite` | Importación única desde SQLite legacy |
| `npm run db:restore-demo` | Restaura cuentas demo (requiere `DEMO_PASSWORD` en `.env`) |

## Usuarios de prueba (desarrollo)

Cuentas demo (admin, trainer, member):

| Email | Rol |
|-------|-----|
| `admin@gym.com` | admin |
| `trainer@gym.com` | trainer |
| `member@gym.com` | member |

Contraseña: valor de `DEMO_PASSWORD` en tu `.env`. Restáuralas con `npm run db:restore-demo`.

## Roadmap de calidad

Ver auditoría en el historial del proyecto. Fases implementadas:

- **Fase 0–1:** variables validadas, JWT sin fallback débil, cookies endurecidas (`sameSite`, `maxAge`).
- **Fase 2:** helmet, límite de body 1MB, rate limit en `/api/auth`, errores globales sin filtrar SQL en producción.

- **Fase 3:** RBAC en API (usuarios, entrenamientos, rutinas, asistencia, pagos).

- **Fase 4:** check-in en `/check-in` sin login (cabecera `X-Kiosk-Key` + rate limit).

- **Fase 5 (seguridad):** JWT y kiosk con secretos aleatorios, `DEMO_PASSWORD`, validación de registro, sin credenciales en UI de producción.

- **Fase 6 (operaciones):** `/api/health`, smoke tests, CI GitHub Actions, code-splitting, `dev:clean`.

### Monitoreo

- **Health:** `GET /api/health` → `{ status, db, uptime_seconds }`
- **Smoke tests:** con el servidor corriendo, `npm run test:smoke`

### Check-in kiosk

1. En `.env`, define la misma clave en `KIOSK_API_KEY` y `VITE_KIOSK_KEY` (mín. 16 caracteres).
2. Abre `http://localhost:3000/check-in` sin iniciar sesión.
3. Prueba con la cédula del miembro demo: `V-11223344` (requiere membresía activa).
