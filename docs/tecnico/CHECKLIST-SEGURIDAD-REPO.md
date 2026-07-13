# Checklist de seguridad del repositorio

Lista corta para auditorías (ISO 27001, SOC 2, OWASP) y revisiones internas.

---

## Archivos y secretos

- [ ] `git ls-files` no lista `.env`, `.env.dev`, `.env.prod` ni `.env.backup`
- [ ] Solo están versionados `.env.example`, `.env.dev.example`, `.env.prod.example`
- [ ] Las plantillas `.env.*.example` usan `CHANGEME` — sin JWT, passwords ni service role reales
- [ ] `.gitignore` ignora `.env*` excepto los tres `.example` permitidos

## Controles automáticos

- [ ] CI ejecuta gitleaks en cada push/PR (job `secrets` en `.github/workflows/ci.yml`)
- [ ] `npm run secrets:scan` pasa sin hallazgos (con gitleaks instalado localmente)

## Separación de entornos

- [ ] `npm run env:check` confirma que `.env.dev` apunta a desarrollo (`sqjyxmbtgmiorckigrrg`)
- [ ] `npm run env:check` confirma que `.env.prod` apunta a producción (`ffjwvlcwhyskddqqojnp`)
- [ ] `npm run db:verify-isolation` pasa antes de operaciones destructivas
- [ ] `db:restore-demo` bloqueado en producción (`db-env-guard.ts`)

## Limpieza local

- [ ] No existe `.env.backup` (o se eliminó tras confirmar `.env.dev` / `.env.prod`)
- [ ] `gym.db` y otros artefactos locales no están en git

## Rotación (si hubo exposición)

- [ ] Secretos que estuvieron en plantillas o en git fueron rotados — ver [ROTACION-SECRETOS.md](./ROTACION-SECRETOS.md)

## Enlaces

- [Entornos y seguridad](./ENTORNOS-Y-SEGURIDAD.md)
- [Variables de entorno](./VARIABLES-ENTORNO.md)
- [Rotación de secretos](./ROTACION-SECRETOS.md)
