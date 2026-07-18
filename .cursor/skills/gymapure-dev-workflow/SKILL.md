---
name: gymapure-dev-workflow
description: >-
  Guía el setup y el día a día de desarrollo seguro en GymApure (React/Express/Supabase):
  .env.dev, env:check, db:verify-isolation, arranque con npm run dev, y prohibiciones
  contra producción. Usar al instalar el proyecto, configurar entornos, arrancar la app,
  o cuando el usuario mencione .env, isolation, demo restore o desarrollo local.
---

# GymApure — Dev workflow

## Reglas de oro

1. Trabajo diario = **`.env.dev`**. No uses `.env` como archivo principal.
2. Antes de tocar BD: `npm run env:check` y `npm run db:verify-isolation`.
3. **Nunca** en producción: `db:restore-demo`, `db:reset-data`, editar esquema solo en SQL Editor.
4. `SUPABASE_SERVICE_ROLE_KEY` solo en servidor/backend — nunca en frontend.

Refs: `docs/DESARROLLO.md`, `docs/tecnico/ENTORNOS-Y-SEGURIDAD.md`.

## Bootstrap (máquina nueva)

```powershell
npm install
npm run env:init
npm run env:configure-dev -- <password>
npm run db:setup:dev
npm run db:create-admin:dev
npm run env:check
npm run db:verify-isolation
npm run dev
```

Abrir: http://localhost:3000

## Día a día

```powershell
npm run env:check
npm run dev
```

Opcional (solo `.env.dev`):

```powershell
npm run db:restore-demo
npm run test:smoke:dev
```

## Checklist antes de operaciones de BD

```
- [ ] env:check muestra .env.dev → GymApure – Desarrollo (sqjyxmbtgmiorckigrrg)
- [ ] db:verify-isolation pasa
- [ ] Comando apunta a :dev o carga .env.dev vía run-with-env
- [ ] Si es prod: deploy:preflight + --allow-prod explícito; nunca restore-demo
```

## Entornos

| Entorno | Archivo              | Supabase ref           |
| ------- | -------------------- | ---------------------- |
| Dev     | `.env.dev`           | `sqjyxmbtgmiorckigrrg` |
| Prod    | `.env.prod` / Render | `ffjwvlcwhyskddqqojnp` |

Solo versionar `.env.*.example` con placeholders `CHANGEME`.

## Comandos seguros vs destructivos

**Seguros:** `env:check`, `dev`, `lint`, `build`, `db:migrate`, `db:health`, `db:create-admin`, `test:smoke`.

**Destructivos (solo dev, confirmado):** `db:reset-data:dev`, `db:restore-demo`.

**Prod (flujo seguro):**

```powershell
npm run deploy:preflight:prod
npm run db:migrate:prod
npm run db:health:prod
```

## Si algo falla

- Isolation falla → no migrar; corregir `DATABASE_URL` en el `.env.*` correcto.
- Puerto/servidor → confirmar `npm run dev` y `/api/health`.
- Falta admin → `npm run db:create-admin:dev`.
