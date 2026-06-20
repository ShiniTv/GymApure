# Configurar Caribean Gym en otro equipo

Guía rápida para clonar desde GitHub y tener la app corriendo en una máquina nueva.

**Repositorio:** https://github.com/ShiniTv/caribean-gym  
**Requisitos:** Node.js 20+, cuenta GitHub (repo privado), proyecto Supabase

---

## Paso 1 — Clonar e instalar

```powershell
git clone https://github.com/ShiniTv/caribean-gym.git
cd caribean-gym
npm install
```

En Mac/Linux, `git clone` es igual; usa `cp .env.example .env` en lugar de `copy`.

---

## Paso 2 — Crear el archivo `.env`

```powershell
copy .env.example .env
```

Abre `.env` con el editor y pega la **plantilla mínima** de abajo. Sustituye cada `[...]` por tus valores reales.

---

## Plantilla `.env` mínima (copiar y completar)

```env
# === OBLIGATORIO ===

# Secreto aleatorio (32+ caracteres). Generar en terminal:
#   openssl rand -base64 48
JWT_SECRET=[PEGA_AQUI_UN_SECRETO_ALEATORIO_LARGO]

# Supabase → Project Settings → Database → Connection string
# Elige "Transaction pooler" / puerto 6543 (NO el 5432 directo)
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres

# === RECOMENDADO (tests automáticos / cuentas demo) ===
# DEMO_PASSWORD=contraseña_larga_para_tests

# === ENTORNO LOCAL ===
NODE_ENV=development
PORT=3000

# === RECOMENDADO (comprobantes de pago en Supabase Storage) ===
# Supabase → Project Settings → API → service_role (NUNCA en el frontend)
# SUPABASE_SERVICE_ROLE_KEY=[TU_SERVICE_ROLE_KEY]

# === OPCIONAL — solo si quieres envío real (sin esto = modo mock en consola) ===
# Email Gmail: docs en README sección Alertas
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=tu@gmail.com
# SMTP_PASS=contraseña_de_aplicacion_google
# SMTP_FROM=Caribean Gym <tu@gmail.com>
# ADMIN_NOTIFY_EMAILS=admin@gym.com

# WhatsApp: ver docs/GUIA-WHATSAPP-META.md
# WHATSAPP_PROVIDER=meta
# WHATSAPP_ACCESS_TOKEN=
# WHATSAPP_PHONE_NUMBER_ID=
# WHATSAPP_API_VERSION=v21.0
```

---

## Dónde sacar cada valor

| Variable | Dónde encontrarla |
|----------|-------------------|
| `JWT_SECRET` | Generar nuevo en **cada equipo** (`openssl rand -base64 48`) o copiar el del PC original si quieres mismas sesiones JWT |
| `DATABASE_URL` | [Supabase Dashboard](https://supabase.com/dashboard) → tu proyecto → **Project Settings** → **Database** → **Connection string** → URI con pooler **6543** |
| `SUPABASE_SERVICE_ROLE_KEY` | Mismo proyecto → **Project Settings** → **API** → `service_role` (secret) |
| `DEMO_PASSWORD` | Solo tests / `db:restore-demo` (mín. 12 caracteres) |

> **Importante:** El archivo `.env` **no está en GitHub**. Cópialo a mano, USB o gestor de contraseñas. No lo subas al repo.

---

## Paso 3 — Base de datos

Elige **una** opción:

### Opción A — Misma Supabase que el PC principal (mismos datos)

Usas la **misma** `DATABASE_URL`. Verás los mismos miembros, pagos y admin.

```powershell
npm run db:migrate
```

Si en Supabase ya aplicaste las 6 migraciones, este comando no cambia nada.  
**No** hace falta `db:create-admin` — usa el admin que ya existe.

### Opción B — Supabase nueva (prueba limpia)

Nuevo proyecto Supabase → nueva `DATABASE_URL` → luego:

```powershell
npm run db:migrate
npm run db:create-admin
```

Sigue las preguntas (nombre, email, contraseña del admin).

---

## Paso 4 — Arrancar

```powershell
npm run dev
```

Abre: **http://localhost:3000**

- Login admin: cuenta creada con `db:create-admin`, o la del PC principal si compartes Supabase
- Registro miembros: `/register` (activo en desarrollo)
- Check-in staff: `/reception` o `/check-in` (requiere login admin/recepcionista)

---

## Paso 5 — Comprobar que todo funciona

Con el servidor corriendo (`npm run dev`), en **otra terminal**:

```powershell
# Health check
curl http://localhost:3000/api/health

# Suite E2E (requiere DEMO_PASSWORD + db:restore-demo)
npm run test:e2e

# Checklists por módulo
npm run test:auth-checklist
npm run test:memberships-checkin
npm run test:payments-checklist
npm run test:notifications-checklist
```

En el navegador (como admin):

1. **Dashboard** → estadísticas y alertas
2. **Miembros** → listado
3. **Pagos** → aprobar/rechazar
4. **Dashboard → Notificaciones** → Probar email / WhatsApp (mock si no hay SMTP/WhatsApp)

---

## Copiar config del PC actual (atajo)

Si ya tienes todo funcionando aquí:

1. Copia tu archivo `.env` al otro PC (WhatsApp, email, Supabase, etc.)
2. `git clone` + `npm install` + `npm run db:migrate` + `npm run dev`
3. Listo — mismos datos si la `DATABASE_URL` es la misma

**Opcional:** genera un `JWT_SECRET` nuevo en el otro equipo si prefieres no compartir ese secreto (las sesiones no se comparten entre máquinas, pero la app funciona igual).

---

## Errores frecuentes

| Error | Solución |
|-------|----------|
| `JWT_SECRET debe tener al menos 32 caracteres` | Genera uno más largo |
| `DATABASE_URL es obligatorio` | Revisa `.env` en la raíz del proyecto |
| Login falla / 401 | Admin no existe → `npm run db:create-admin` |
| Check-in rechaza | Inicia sesión como recepcionista/admin; la cédula debe tener membresía activa |
| Puerto 3000 ocupado | Cierra el otro servidor o cambia `PORT=3001` en `.env` |
| Migraciones fallan | Verifica `DATABASE_URL` (pooler 6543) y que el proyecto Supabase esté activo |
| Email/WhatsApp "Mock" | Normal sin credenciales; ver README y `docs/GUIA-WHATSAPP-META.md` |

---

## Comandos útiles

| Comando | Para qué |
|---------|----------|
| `npm run dev` | Desarrollo (frontend + API) |
| `npm run build` + `npm start` | Modo producción local |
| `npm run db:migrate` | Aplicar migraciones SQL |
| `npm run db:create-admin` | Crear/actualizar admin |
| `npm run lint` | Verificar TypeScript |
| `npm run test:e2e` | Pruebas API completas (ver `docs/TESTING.md`) |

---

## Checklist final

- [ ] `git clone` + `npm install`
- [ ] `.env` creado con `JWT_SECRET`, `DATABASE_URL`
- [ ] `npm run db:migrate`
- [ ] Admin listo (`db:create-admin` o mismo Supabase)
- [ ] `npm run dev` → http://localhost:3000
- [ ] Login admin OK
- [ ] (Opcional) SMTP / WhatsApp cuando quieras envío real
