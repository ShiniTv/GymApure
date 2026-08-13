# GymApure — Cursor Agent Skills

Skills de proyecto que el agente puede aplicar al desarrollar, revisar o operar el sistema.

## Dominio GymApure (`.cursor/skills/`)

| Skill                      | Uso típico                                        |
| -------------------------- | ------------------------------------------------- |
| `gymapure-dev-workflow`    | Setup local, `.env.dev`, arrancar sin tocar prod  |
| `gymapure-quality-gate`    | Antes de merge/PR: lint, build, tests por alcance |
| `gymapure-security-review` | Auth, IDOR, secretos, checklist de repo           |
| `gymapure-db-ops`          | Migraciones, health, audits, demo data            |
| `gymapure-feature-change`  | Extender un módulo (API → hooks → UI → test)      |
| `gymapure-ux-playwright`   | UX por rol, mobile/tablet, Playwright             |

> `impeccable` se instala en local (ver sección Diseño); no se versiona para no romper deploys en Render.

## Diseño / motion (local — no van a Render)

Instalar con `npx skills add …` / `npx impeccable install`. Viven en `.agents/skills/` e Impeccable en `.cursor/skills/impeccable/` (**gitignore**; no se despliegan).

Cursor las descubre en local. Ver `PRODUCT.md` / `DESIGN.md` y `docs/qa/UX-DESIGN-AUDIT.md`.

| Skill                      | Origen               | Uso típico                 |
| -------------------------- | -------------------- | -------------------------- |
| `emil-design-eng` + motion | emilkowalski/skill   | Design-eng y animación     |
| `design-taste-frontend`    | Leonxlnx/taste-skill | Anti-slop frontend         |
| `impeccable` (local)       | impeccable install   | critique / polish / detect |

## Cómo invocar

Las skills son auto-descubribles por descripción. También puedes pedirlas por nombre:

- «Usa `gymapure-quality-gate` antes del PR»
- «Aplica `gymapure-security-review` a este diff»
- «Sigue `gymapure-db-ops` para migrar en dev»
- «Corre `gymapure-ux-playwright` tras el cambio de nav»
- «`/impeccable critique` el panel member»
- «Usa `design-taste-frontend` + `emil-design-eng` al pulir esta pantalla»

Docs canónicos: `docs/DESARROLLO.md`, `docs/TESTING.md`, `docs/tecnico/`, `docs/qa/UX-QA.md`.
