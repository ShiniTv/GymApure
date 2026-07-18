---
name: gymapure-db-ops
description: >-
  Opera la base de datos de GymApure con seguridad: migraciones en supabase/migrations,
  db:migrate:dev/prod, health, audits (FKs, storage, query patterns), restore-demo solo
  en desarrollo, e isolation. Usar al migrar, auditar BD, restaurar demo, o cuando el
  usuario mencione PostgreSQL, Supabase, schema drift o db:*.
---

# GymApure — DB ops

Refs: `docs/tecnico/MIGRACIONES-Y-BD.md`, `docs/tecnico/ENTORNOS-Y-SEGURIDAD.md`, `docs/tecnico/AUDITORIA-BD.md`.

## Política

1. Fuente de verdad: `supabase/migrations/`
2. Naming: `YYYYMMDDHHMMSS_descripcion.sql`
3. Nunca editar migraciones ya aplicadas en prod — crear una nueva
4. Nunca cambiar esquema solo en Supabase Dashboard sin archivo en el repo
5. Antes de migrar: `npm run env:check` + `npm run db:verify-isolation`

## Flujo migración (dev)

```
- [ ] Escribir SQL en supabase/migrations/
- [ ] npm run env:check
- [ ] npm run db:verify-isolation
- [ ] npm run db:migrate:dev
- [ ] npm run db:health:dev
```

## Flujo migración (prod)

```
- [ ] Confirmación explícita del usuario
- [ ] npm run deploy:preflight:prod
- [ ] npm run db:verify-isolation
- [ ] npm run db:migrate:prod
- [ ] npm run db:health:prod
```

## Comandos por riesgo

| Nivel                | Comandos                                                                                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Lectura / seguro     | `db:health`, `db:health:dev`, `db:audit*`, `db:audit-fks`, `db:audit-tables`, `db:audit-storage`, `db:audit-query-patterns`, `db:backup-check` |
| Escritura controlada | `db:migrate`, `db:migrate:dev`, `db:create-admin:dev`                                                                                          |
| Destructivo solo dev | `db:restore-demo`, `db:reset-data:dev`, `db:purge-demo`                                                                                        |
| Prod (flags)         | `db:migrate:prod`, `db:create-admin:prod`, `db:purge-demo:prod` — requieren `--allow-prod` / run-with-env                                      |

## Demo data

```powershell
# SOLO .env.dev
npm run db:restore-demo
```

Cuentas típicas: `admin@gym.com`, `receptionist@gym.com`, `trainer@gym.com`, `member@gym.com` — password en `DEMO_PASSWORD`.

**Prohibido** `db:restore-demo` / `db:reset-data` en producción.

## Audits útiles

```powershell
npm run db:health:dev
npm run db:audit:dev
npm run db:audit-fks:dev
npm run db:audit-query-patterns
npm run db:audit-storage:dev
```

## Rollback

No hay rollback automático. Si falla una migración: leer el error, no parchear a mano en prod; nueva migración o restore Point-in-Time de Supabase.

## Output al usuario

Indicar entorno usado (dev/prod), comandos ejecutados, y resultado de health/isolation.
