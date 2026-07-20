# Checklist de seguridad del repositorio

Lista corta para auditorías (ISO 27001, SOC 2, OWASP) y revisiones internas.

---

## Archivos y secretos

- [ ] `git ls-files` no lista `.env`, `.env.dev`, `.env.prod` ni `.env.backup`
- [ ] Solo están versionados `.env.example`, `.env.dev.example`, `.env.prod.example`
- [ ] Las plantillas `.env.*.example` usan `CHANGEME` — sin JWT, passwords ni service role reales
- [ ] `GEMINI_API_KEY` (si se usa análisis de comida) solo en backend / secretos de hosting — nunca `VITE_*` ni frontend
- [ ] `.gitignore` ignora `.env*` excepto los tres `.example` permitidos

## Controles automáticos

- [ ] CI ejecuta gitleaks en cada push/PR (job `secrets` en `.github/workflows/ci.yml`)
- [ ] `npm run secrets:scan` pasa sin hallazgos (con gitleaks instalado localmente)

## Separación de entornos

- [ ] `npm run env:check` confirma `.env.dev` → **GymApure – Desarrollo** (`sqjyxmbtgmiorckigrrg`)
- [ ] `npm run env:check` confirma `.env.prod` → **GymApure – Producción** (`ffjwvlcwhyskddqqojnp`)
- [ ] `npm run db:verify-isolation` pasa antes de operaciones destructivas
- [ ] `db:restore-demo` bloqueado en producción (`db-env-guard.ts`)

## Limpieza local

- [ ] No existe `.env.backup` (o se eliminó tras confirmar `.env.dev` / `.env.prod`)
- [ ] `gym.db` y otros artefactos locales no están en git

## MFA y endurecimiento en producción

- [ ] MFA disponible en `/security` (opcional; no exigir `REQUIRE_MFA_FOR_STAFF` salvo política explícita)
- [ ] `ENABLE_HIBP_CHECK=true` en Render
- [ ] `npm run security:audit-mfa:prod -- --allow-prod` sin hallazgos

## Staging (recomendado)

- [ ] Proyecto Supabase staging creado
- [ ] `.env.staging` configurado (no commitear)
- [ ] `npm run db:migrate:staging` y smoke tests antes de cada release prod

## Rotación (si hubo exposición)

- [ ] Secretos que estuvieron en plantillas o en git fueron rotados — ver [ROTACION-SECRETOS.md](./ROTACION-SECRETOS.md)

## Enlaces

- [Entornos y seguridad](./ENTORNOS-Y-SEGURIDAD.md)
- [Proyectos Supabase](./SUPABASE-PROYECTOS.md)
- [Staging](./STAGING.md)
- [Variables de entorno](./VARIABLES-ENTORNO.md)
- [Rotación de secretos](./ROTACION-SECRETOS.md)
