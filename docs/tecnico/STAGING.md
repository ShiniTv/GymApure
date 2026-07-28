# Entorno staging

Staging es un **tercer entorno** entre desarrollo y producción. Sirve para validar migraciones, deploy y cambios de seguridad sin tocar datos reales de miembros.

---

## Cuándo usar cada entorno

| Entorno | Nombre / host                                                                           | Ref / DSN                         | Uso                                        |
| ------- | --------------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------ |
| Dev     | GymApure – Desarrollo (Supabase)                                                        | `sqjyxmbtgmiorckigrrg`            | Desarrollo diario, demo, `db:restore-demo` |
| Staging | **Local PG** `gymapure_staging` (actual) o Supabase Staging (cuando el plan lo permita) | `127.0.0.1:5432/gymapure_staging` | QA pre-prod, migraciones, smoke            |
| Prod    | GymApure – Producción (Supabase) + Render                                               | `ffjwvlcwhyskddqqojnp`            | Usuarios reales del gym                    |

### Limitación Free (2026-07-28)

Supabase Free permite **2 proyectos activos**. Dev + Prod ocupan el cupo; `npm run db:create-staging-project` falla con el límite. Staging operativo actual = **PostgreSQL 17 local** (`.env.staging`). Al subir de plan o pausar un proyecto: crear cloud con `db:create-staging-project` y actualizar este doc + [SUPABASE-PROYECTOS.md](./SUPABASE-PROYECTOS.md).

Migraciones Storage (`payment-proofs`, etc.) se **omiten** en staging local (sin Supabase Storage); el resto del esquema aplica (75/75 en `schema_migrations` contando omitidas reconocidas).

---

## Crear staging local (actual)

```powershell
# Requiere PostgreSQL local + .env.staging (gitignored)
npm run db:migrate:staging
npm run db:health:staging
$env:ADMIN_EMAIL='staging-admin@gym.local'
$env:ADMIN_PASSWORD='StagingAdmin123!'
$env:ADMIN_FULL_NAME='Staging Admin'
npm run db:create-admin:staging
```

## Crear staging cloud (cuando el plan lo permita)

1. `npm run db:create-staging-project` **o** Dashboard → New project.
2. Completar `.env.staging` (ref, service role, JWT, CRON).
3. `npm run db:migrate:staging && npm run db:health:staging && npm run db:create-admin:staging`
4. (Opcional) Render `caribean-gym-staging`.

---

## Flujo antes de cada release

```powershell
npm run env:check
npm run deploy:release -- --run
# Si staging OK y listo para prod:
npm run deploy:release -- --run --migrate-prod
```

`--migrate-prod` **exige** `.env.staging` completo (sin `CHANGEME`) salvo `--allow-skip-staging`.

Smoke:

```powershell
# Servidor contra staging en otro terminal:
npx tsx scripts/dev/run-with-env.ts .env.staging server.ts
npm run test:smoke:staging
```

---

## Reglas

- **Nunca** copiar dump de prod con PII a staging sin anonimizar.
- **Nunca** usar `db:restore-demo` en staging cloud con datos realistas.
- MFA opcional (`REQUIRE_MFA_FOR_STAFF=false`).

---

## Enlaces

- [Entornos y seguridad](./ENTORNOS-Y-SEGURIDAD.md)
- [Migraciones](./MIGRACIONES-Y-BD.md)
- [Despliegue](../DEPLOY.md)
