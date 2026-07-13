# Entornos y seguridad operativa

Reglas para operar GymApure sin dañar datos de producción ni corromper la base de datos.

---

## Separación dev vs producción

Ver mapa completo: [SUPABASE-PROYECTOS.md](./SUPABASE-PROYECTOS.md).

| Aspecto          | Desarrollo                              | Producción                     |
| ---------------- | --------------------------------------- | ------------------------------ |
| Nombre Supabase  | **GymApure – Desarrollo**               | **GymApure – Producción**      |
| Supabase ref     | `sqjyxmbtgmiorckigrrg`                  | `ffjwvlcwhyskddqqojnp`         |
| Archivo env      | `.env.dev`                              | `.env.prod` / Render Dashboard |
| `NODE_ENV`       | `development`                           | `production`                   |
| Registro público | `ALLOW_PUBLIC_REGISTER=true` (opcional) | Desactivado por defecto        |
| Cuentas demo     | `db:restore-demo` permitido             | **Prohibido**                  |

**Antes de migrar o resetear**, ejecuta:

```powershell
npm run env:check
npm run db:verify-isolation
```

Confirma que el `DATABASE_URL` activo corresponde al entorno que intentas modificar.

---

## Reglas de oro — NUNCA en producción

| Acción                                                   | Riesgo                                     | Alternativa segura                                |
| -------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------- |
| `npm run db:restore-demo`                                | Sobrescribe usuarios con cuentas ficticias | `db:create-admin` + crear staff en Miembros       |
| `npm run db:reset-data` sin backup                       | Borra usuarios, pagos, rutinas, asistencia | Exportar reportes; solo en dev con confirmación   |
| Migrar con `.env.dev` apuntando a prod                   | Corrupción cruzada de datos                | `db:verify-isolation` + revisar `DATABASE_URL`    |
| Editar tablas en Supabase SQL Editor sin migración       | Drift entre código y esquema               | Archivo en `supabase/migrations/` + `db:migrate`  |
| Commitear `.env`, `.env.prod`, `.env.dev`, `.env.backup` | Fuga de secretos JWT, DB, SMTP             | Solo `.env.*.example` con placeholders `CHANGEME` |
| `git push --force` a `main`                              | Pérdida de historial compartido            | PR con CI verde                                   |
| Compartir `SUPABASE_SERVICE_ROLE_KEY`                    | Acceso total a Storage y BD                | Solo en servidor/backend                          |

---

## Comandos por nivel de riesgo

### Seguros (uso frecuente)

| Comando                   | Qué hace                                     |
| ------------------------- | -------------------------------------------- |
| `npm run env:check`       | Muestra qué ref usa cada archivo `.env.*`    |
| `npm run env:init`        | Separa `.env.dev` y `.env.prod` en bootstrap |
| `npm run dev`             | Servidor local (carga `.env.dev`)            |
| `npm run lint`            | Verificación TypeScript                      |
| `npm run build`           | Build sin tocar BD                           |
| `npm run db:migrate`      | Aplica migraciones pendientes (idempotente)  |
| `npm run db:health`       | Solo lectura de estado                       |
| `npm run db:create-admin` | Crea/actualiza un admin                      |
| `npm run test:smoke`      | Pruebas HTTP de lectura/escritura controlada |

### Destructivos — solo desarrollo, con confirmación

| Comando                     | Qué borra o sobrescribe                       |
| --------------------------- | --------------------------------------------- |
| `npm run db:reset-data`     | Usuarios y datos operativos (esquema intacto) |
| `npm run db:reset-data:dev` | Igual, contra `.env.dev`                      |
| `npm run db:restore-demo`   | Reemplaza usuarios con cuentas demo de test   |

### Producción — flujo seguro

```powershell
npm run deploy:preflight      # valida .env.prod
npm run db:migrate:prod       # migraciones en prod
npm run db:health:prod        # verificar
npm run db:create-admin:prod  # solo si no hay admin
```

**Nunca** ejecutes `db:restore-demo` ni `db:reset-data` contra producción.

---

## Autenticación y sesiones

- JWT firmado con `JWT_SECRET`; cada usuario tiene `token_version` en BD.
- **Política de sesión única:** cada login o logout incrementa `token_version`, invalidando todas las sesiones anteriores.
- Cambiar contraseña, reset de contraseña o desactivar cuenta también incrementan `token_version`.
- Un usuario **no puede** estar logueado en dos dispositivos a la vez; el nuevo login cierra la sesión anterior.
- El frontend recibe aviso vía WebSocket (`session:revoked`) o HTTP 401 y redirige a `/login`.
- Check-in **solo** con personal autenticado (admin/recepcionista). No existe API pública de kiosk.
- Entrenadores solo ven miembros **asignados** (protección IDOR).
- Contraseñas nuevas: bcrypt cost **12**; rehash automático al login si el hash es legacy (cost 10).
- MFA TOTP para staff (`admin`, `receptionist`, `trainer`) en `/security`.
- CSRF double-submit en todas las rutas protegidas con mutaciones.
- Opcional: `ENABLE_HIBP_CHECK=true` rechaza contraseñas conocidas en filtraciones públicas.

---

## Storage (Supabase)

Buckets privados — acceso solo vía backend con `SUPABASE_SERVICE_ROLE_KEY`:

- `payment-proofs` — comprobantes de pago
- `avatars` — fotos de perfil
- `exercise-videos` — videos de ejercicios
- `equipment-photos` — fotos de equipamiento

No subas archivos directamente al Dashboard sin pasar por la API (permisos y validación de tipo).

---

## Controles de repositorio

### Qué puede estar en Git

| Archivo                                        | En git | Contenido permitido                                                 |
| ---------------------------------------------- | ------ | ------------------------------------------------------------------- |
| `.env.example`                                 | Sí     | Placeholders o vacío                                                |
| `.env.dev.example`                             | Sí     | Solo `CHANGEME_*` — nunca JWT, passwords ni service role reales     |
| `.env.prod.example`                            | Sí     | Solo `CHANGEME_*` y datos semi-públicos (email soporte, URL Render) |
| `.env`, `.env.dev`, `.env.prod`, `.env.backup` | **No** | Secretos reales — ignorados por `.gitignore`                        |

### Detección automática

- **CI:** job `secrets` con [gitleaks](https://github.com/gitleaks/gitleaks) en cada push/PR (`.gitleaks.toml`).
- **Local (opcional):** `npm run secrets:scan` — requiere `gitleaks` en PATH (`choco install gitleaks` en Windows).
- **Pre-commit opcional:** si tienes gitleaks instalado, puedes añadir `gitleaks protect --staged` a `.husky/pre-commit`.

### Verificación manual

```powershell
git ls-files | Select-String env          # solo *.example
npm run env:check                         # dev ≠ prod; alerta .env.backup
npm run secrets:scan                      # 0 hallazgos (con gitleaks local)
```

### Rotación tras exposición en plantillas

Si un valor de `.env.*.example` se copió alguna vez a un entorno real, rota de inmediato siguiendo [ROTACION-SECRETOS.md](./ROTACION-SECRETOS.md):

1. `JWT_SECRET` → `openssl rand -base64 48` → Render Dashboard / `.env.dev`
2. `DEMO_PASSWORD` → nuevo valor ≥12 caracteres en dev
3. `SUPABASE_SERVICE_ROLE_KEY` → regenerar en Supabase Dashboard si se filtró

El historial de git conserva commits antiguos; la rotación invalida secretos aunque sigan en el historial.

### Checklist de auditoría

Ver [CHECKLIST-SEGURIDAD-REPO.md](./CHECKLIST-SEGURIDAD-REPO.md).

### Staging

Ver [STAGING.md](./STAGING.md) — tercer entorno para validar migraciones antes de prod.

### MFA obligatorio (producción)

Con `REQUIRE_MFA_FOR_STAFF=true` (recomendado en Render), el staff sin MFA no puede usar APIs protegidas; el frontend redirige a `/security`.

Antes de activar en prod:

```powershell
npm run security:audit-mfa:prod -- --allow-prod
```

Cada admin, recepcionista y entrenador debe activar MFA en **Seguridad MFA**.

---

## Checklist antes de operar en equipo nuevo

1. Confirmar que `.env` apunta al proyecto Supabase correcto.
2. `npm run db:verify-isolation` (si aplica).
3. `npm run db:health` sin errores críticos.
4. No ejecutar scripts `db:reset-*` ni `db:restore-demo` sin saber el entorno.
5. Tras `git pull`, siempre `npm run db:migrate` antes de usar la app.

---

## Si algo sale mal

| Situación                         | Acción                                                                                         |
| --------------------------------- | ---------------------------------------------------------------------------------------------- |
| Migración falló a medias          | Revisar log; no re-ejecutar SQL manual sin entender el estado; consultar `MIGRACIONES-Y-BD.md` |
| Login de todos los usuarios falla | Verificar `JWT_SECRET` no cambió en prod sin re-login                                          |
| Datos mezclados dev/prod          | Detener servidor; verificar `DATABASE_URL`; restaurar backup Supabase si es prod               |

---

## Enlaces

- [Instalación](./INSTALACION-NUEVO-EQUIPO.md)
- [Variables de entorno](./VARIABLES-ENTORNO.md)
- [Migraciones](./MIGRACIONES-Y-BD.md)
- [Datos personales](./DATOS-PERSONALES.md)
- [Rotación de secretos](./ROTACION-SECRETOS.md)
- [Proyectos Supabase](./SUPABASE-PROYECTOS.md)
- [Despliegue](../DEPLOY.md)
