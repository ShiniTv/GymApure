# Entorno staging

Staging es un **tercer entorno** entre desarrollo y producción. Sirve para validar migraciones, deploy y cambios de seguridad sin tocar datos reales de miembros.

---

## Cuándo usar cada entorno

| Entorno | Supabase ref                         | Uso                                        |
| ------- | ------------------------------------ | ------------------------------------------ |
| Dev     | `sqjyxmbtgmiorckigrrg`               | Desarrollo diario, demo, `db:restore-demo` |
| Staging | Proyecto propio (crear en Dashboard) | QA pre-prod, migraciones, smoke tests      |
| Prod    | `ffjwvlcwhyskddqqojnp`               | Usuarios reales del gym                    |

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

---

## Flujo antes de cada release

```powershell
npm run env:check
npm run db:migrate:staging
npm run test:smoke:staging
npm run security:audit-mfa:staging
```

Si todo pasa → `npm run db:migrate:prod` y deploy a Render prod.

---

## Reglas

- **Nunca** copiar dump de prod con PII a staging sin anonimizar.
- **Nunca** usar `db:restore-demo` en staging si ese entorno se usa para QA realista (usa datos sintéticos).
- `REQUIRE_MFA_FOR_STAFF=true` y `ENABLE_HIBP_CHECK=true` en staging igual que prod.

---

## Enlaces

- [Entornos y seguridad](./ENTORNOS-Y-SEGURIDAD.md)
- [Migraciones](./MIGRACIONES-Y-BD.md)
- [Despliegue](../DEPLOY.md)
