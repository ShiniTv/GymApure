---
name: gymapure-security-review
description: >-
  Revisa cambios de GymApure por seguridad: secretos en repo, isolation de entornos,
  IDOR trainer/member, token_version/sesiones, service role fuera del frontend, MFA.
  Usar al revisar PRs, diffs de auth/API/roles, o cuando el usuario mencione
  seguridad, IDOR, JWT, secrets o checklist de repo.
---

# GymApure — Security review

Refs: `docs/tecnico/CHECKLIST-SEGURIDAD-REPO.md`, `docs/tecnico/ENTORNOS-Y-SEGURIDAD.md`, `docs/TESTING.md`.

## Flujo

```
- [ ] 1. Diff: auth, APIs con userId/memberId, cookies JWT, Storage, env
- [ ] 2. Secretos: ningún .env real ni keys en el commit
- [ ] 3. Ownership / IDOR en endpoints tocados
- [ ] 4. Sesiones: invalidación, token_version, dual login si aplica
- [ ] 5. Correr suites relevantes
- [ ] 6. Reportar hallazgos con severidad
```

## Checklist repo (rápido)

- [ ] `git ls-files` no lista `.env`, `.env.dev`, `.env.prod`, `.env.backup`
- [ ] Solo versionados `.env.example`, `.env.dev.example`, `.env.prod.example` con `CHANGEME`
- [ ] `npm run secrets:scan` sin hallazgos (si gitleaks disponible)
- [ ] Service role / JWT / SMTP no aparecen en `src/` de cliente

## Patrones a buscar en código

| Riesgo              | Qué verificar                                                                 |
| ------------------- | ----------------------------------------------------------------------------- |
| IDOR trainer/member | Queries filtran por ownership / asignación; no confiar solo en el id del body |
| Sesiones            | Logout / cambio de password invalida JWT (`token_version`); dual login        |
| RBAC                | Roles admin / receptionist / trainer / member en rutas y UI                   |
| Kiosk               | Flujo kiosk legacy eliminado; no reintroducir endpoints abiertos              |
| Storage             | Buckets privados; URLs firmadas; no exponer service role                      |
| Frontend            | Sin `SUPABASE_SERVICE_ROLE_KEY` ni secretos de servidor                       |

## Comandos

```powershell
npm run secrets:scan
# servidor + demo:
npm run test:security-checklist
npm run test:auth-checklist
```

MFA prod solo con contexto explícito:

```powershell
npm run security:audit-mfa:prod -- --allow-prod
```

## Formato de hallazgos

- **Critical**: debe bloquear merge (IDOR, secretos, bypass auth)
- **Suggestion**: mejorar defensa en profundidad o tests
- **Nice-to-have**: hardening opcional

Por cada hallazgo: archivo/ruta, riesgo, fix concreto.

## No hacer

- No rotar secretos ni tocar prod sin pedirlo el usuario.
- No ejecutar `db:restore-demo` / `db:reset-data` contra prod.
- No inventar vulnerabilidades sin evidencia en el diff o en fallos de test.
