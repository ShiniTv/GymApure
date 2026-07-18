# GymApure — Cursor Agent Skills

Skills de proyecto que el agente puede aplicar al desarrollar, revisar o operar el sistema.

| Skill                      | Uso típico                                        |
| -------------------------- | ------------------------------------------------- |
| `gymapure-dev-workflow`    | Setup local, `.env.dev`, arrancar sin tocar prod  |
| `gymapure-quality-gate`    | Antes de merge/PR: lint, build, tests por alcance |
| `gymapure-security-review` | Auth, IDOR, secretos, checklist de repo           |
| `gymapure-db-ops`          | Migraciones, health, audits, demo data            |
| `gymapure-feature-change`  | Extender un módulo (API → hooks → UI → test)      |
| `gymapure-ux-playwright`   | UX por rol, mobile/tablet, Playwright             |

## Cómo invocar

Las skills son auto-descubribles por descripción. También puedes pedirlas por nombre:

- «Usa `gymapure-quality-gate` antes del PR»
- «Aplica `gymapure-security-review` a este diff»
- «Sigue `gymapure-db-ops` para migrar en dev»
- «Corre `gymapure-ux-playwright` tras el cambio de nav»

Docs canónicos: `docs/DESARROLLO.md`, `docs/TESTING.md`, `docs/tecnico/`.
