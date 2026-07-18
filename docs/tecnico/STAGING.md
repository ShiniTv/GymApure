# Entorno staging

Staging es un **tercer entorno** entre desarrollo y producción. Sirve para validar migraciones, deploy y cambios de seguridad sin tocar datos reales de miembros.

---

## Cuándo usar cada entorno

| Entorno | Nombre Supabase          | Supabase ref           | Uso                                        |
| ------- | ------------------------ | ---------------------- | ------------------------------------------ |
| Dev     | GymApure – Desarrollo    | `sqjyxmbtgmiorckigrrg` | Desarrollo diario, demo, `db:restore-demo` |
| Staging | _(crear proyecto nuevo)_ | `CHANGEME`             | QA pre-prod, migraciones, smoke tests      |
| Prod    | GymApure – Producción    | `ffjwvlcwhyskddqqojnp` | Usuarios reales del gym (Render)           |

---

## Crear staging (una vez)

1. Supabase Dashboard → **New project** (región cercana a prod, plan Free/Pro según necesidad).
2. Copiar plantilla:
   ```powershell
   Copy-Item .env.staging.example .env.staging
   ```
3. Completar `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `CRON_SECRET`.
4. Reemplazar `CHANGEME_STAGING_REF` en la URL con el ref del nuevo proyecto.
5. Bootstrap:
   ```powershell
   npm run env:init-staging
   npm run db:migrate:staging
   npm run db:health:staging
   npm run db:create-admin:staging
   ```
6. (Opcional) Servicio Render `caribean-gym-staging` apuntando al mismo `.env` vía Dashboard.
7. Añadir el ref de staging en [SUPABASE-PROYECTOS.md](./SUPABASE-PROYECTOS.md) cuando exista.

---

## Flujo antes de cada release

```powershell
npm run env:check
npm run deploy:release -- --run
# Si staging OK y listo para prod:
npm run deploy:release -- --run --migrate-prod
# O solo: npm run db:migrate:prod
```

Smoke contra staging (servidor con `.env.staging`):

```powershell
npm run test:smoke:staging
npm run security:audit-mfa:staging
```

Si todo pasa → deploy a Render prod.

---

## Reglas

- **Nunca** copiar dump de prod con PII a staging sin anonimizar.
- **Nunca** usar `db:restore-demo` en staging si ese entorno se usa para QA realista (usa datos sintéticos).
- `ENABLE_HIBP_CHECK=true` en staging igual que prod. MFA permanece opcional (`REQUIRE_MFA_FOR_STAFF=false`).

---

## Enlaces

- [Entornos y seguridad](./ENTORNOS-Y-SEGURIDAD.md)
- [Migraciones](./MIGRACIONES-Y-BD.md)
- [Despliegue](../DEPLOY.md)
