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

**Opción A — Desarrollo con proyecto Supabase dev existente:**

```powershell
copy .env.dev.example .env.dev
# Editar .env.dev con DATABASE_URL y SUPABASE_SERVICE_ROLE_KEY del proyecto DEV
npm run env:use-dev
```

**Opción B — Configuración manual:**

```powershell
copy .env.example .env
# Editar .env (ver VARIABLES-ENTORNO.md)
```

Variables mínimas obligatorias:

| Variable                    | Cómo obtenerla                                             |
| --------------------------- | ---------------------------------------------------------- |
| `JWT_SECRET`                | `openssl rand -base64 48`                                  |
| `DATABASE_URL`              | Supabase → Database → Transaction pooler (puerto **6543**) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API → service_role                              |

### 3. Base de datos

```powershell
npm run db:migrate
npm run db:health
```

Debe mostrar conexión OK y RLS sin errores críticos.

### 4. Administrador inicial

```powershell
npm run db:create-admin
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
cp .env.example .env
# editar .env
npm run db:migrate
npm run db:health
npm run db:create-admin
npm run dev
```

---

## Copiar configuración desde otro equipo

Si ya tienes un `.env` funcionando en otra máquina:

1. Copia el archivo `.env` o `.env.dev` por canal seguro (no por chat público).
2. **Nunca** commitees `.env` al repositorio.
3. Verifica que apunta al entorno correcto (dev, no prod) con `npm run db:verify-isolation`.

---

## Después de `git pull` (actualizar código)

```powershell
npm install                  # si cambió package.json
npm run db:migrate           # si hay migraciones nuevas
npm run dev
```

---

## Checklist de primer arranque (10 pasos)

- [ ] `npm install` sin errores
- [ ] `.env` con `JWT_SECRET`, `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `npm run db:migrate` — todas las migraciones aplicadas
- [ ] `npm run db:health` — conexión y RLS OK
- [ ] `npm run db:create-admin` — cuenta admin creada
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
