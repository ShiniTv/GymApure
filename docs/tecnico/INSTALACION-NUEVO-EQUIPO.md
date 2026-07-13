# Instalación en un equipo nuevo

Guía paso a paso para instalar GymApure en otra computadora sin afectar producción.

**Prerrequisitos:** Node.js 20+, npm 10+, Git, cuenta Supabase (proyecto dev separado de prod).

---

## Windows (PowerShell)

### 1. Clonar e instalar

```powershell
git clone https://github.com/ShiniTv/caribean-gym.git
cd caribean-gym
npm install
```

### 2. Variables de entorno

```powershell
npm run env:init
npm run env:configure-dev -- <password-supabase-dev>
npm run db:setup:dev
npm run env:check
```

Archivos:

| Archivo     | Uso                                     |
| ----------- | --------------------------------------- |
| `.env.dev`  | Desarrollo local (`npm run dev`)        |
| `.env.prod` | Operaciones prod desde PC (`db:*:prod`) |
| `.env`      | **Deprecado** — no usar tras `env:init` |

Variables mínimas en `.env.dev`:

| Variable                    | Cómo obtenerla                            |
| --------------------------- | ----------------------------------------- |
| `JWT_SECRET`                | `openssl rand -base64 48`                 |
| `DATABASE_URL`              | Supabase **dev** → pooler puerto **6543** |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dev → API → service_role         |

### 3. Base de datos

```powershell
npm run db:migrate:dev
npm run db:health:dev
```

Debe mostrar conexión OK y RLS sin errores críticos.

### 4. Administrador inicial

```powershell
npm run db:create-admin:dev
```

O modo no interactivo en `.env`:

```
ADMIN_FULL_NAME=Tu Nombre
ADMIN_EMAIL=admin@tudominio.com
ADMIN_PASSWORD=ContraseñaSegura123!
```

### 5. Arrancar

```powershell
npm run dev
```

Abrir **http://localhost:3000** → `/login` con la cuenta admin.

### 6. Verificación final

```powershell
# En otra terminal, con servidor corriendo:
npm run test:smoke
```

---

## Mac / Linux

```bash
git clone https://github.com/ShiniTv/caribean-gym.git
cd caribean-gym
npm install
npm run env:init
npm run env:configure-dev -- <password>
npm run db:setup:dev
npm run db:health:dev
npm run db:create-admin:dev
npm run dev
```

---

## Copiar configuración desde otro equipo

Si ya tienes un `.env.dev` o `.env.prod` funcionando en otra máquina:

1. Copia el archivo por canal seguro (no por chat público).
2. **Nunca** commitees `.env.dev` ni `.env.prod` al repositorio.
3. Verifica el entorno con `npm run env:check`.

---

## Después de `git pull` (actualizar código)

```powershell
npm install
npm run db:migrate:dev
npm run dev
```

---

## Checklist de primer arranque (10 pasos)

- [ ] `npm install` sin errores
- [ ] `npm run env:init` — `.env.dev` y `.env.prod` separados
- [ ] `.env.dev` con `JWT_SECRET`, `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `npm run env:check` — dev ≠ prod
- [ ] `npm run db:migrate:dev` — migraciones aplicadas
- [ ] `npm run db:health:dev` — conexión OK
- [ ] `npm run db:create-admin:dev` — cuenta admin creada
- [ ] `npm run dev` — servidor en puerto 3000
- [ ] `GET /api/health` → `status: ok`
- [ ] Login admin en `/login` funciona
- [ ] `npm run lint` pasa
- [ ] `npm run db:verify-isolation` (si usas entorno dev separado)

---

## Qué NO hacer en instalación

| Acción                                      | Por qué evitarla                        |
| ------------------------------------------- | --------------------------------------- |
| `npm run db:restore-demo` en uso real       | Crea cuentas ficticias; solo para tests |
| Usar credenciales de producción en local    | Riesgo de modificar datos reales        |
| Editar SQL manual en Supabase sin migración | Desincroniza esquema y código           |
| Commitear `.env`                            | Expone secretos                         |

Ver [ENTORNOS-Y-SEGURIDAD.md](./ENTORNOS-Y-SEGURIDAD.md).

---

## Enlaces

- [Variables de entorno](./VARIABLES-ENTORNO.md)
- [Desarrollo](../DESARROLLO.md)
- [Despliegue producción](../DEPLOY.md)
