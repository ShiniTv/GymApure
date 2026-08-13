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
| `impeccable`               | Diseño: init/document/critique/polish/detect      |

## Diseño / motion (`.agents/skills/` vía `npx skills add`)

Instaladas en el estándar Agent Skills (`.agents/skills/`). Cursor las descubre junto a `.cursor/skills/`.

| Skill                           | Origen               | Uso típico                                       |
| ------------------------------- | -------------------- | ------------------------------------------------ |
| `emil-design-eng`               | emilkowalski/skill   | Principía design-eng + animación                 |
| `animate`                       | emilkowalski/skill   | Construir motion con curvas/duraciones correctas |
| `review-animations`             | emilkowalski/skill   | Revisar animaciones existentes                   |
| `improve-animations`            | emilkowalski/skill   | Auditoría priorizada de motion                   |
| `find-animation-opportunities`  | emilkowalski/skill   | Dónde sí/no animar                               |
| `animation-vocabulary`          | emilkowalski/skill   | Vocabulario preciso para pedir motion            |
| `apple-design`                  | emilkowalski/skill   | Principios Apple adaptados a web                 |
| `prototype`                     | emilkowalski/skill   | Variantes UI con picker                          |
| `pick-ui-library`               | emilkowalski/skill   | Elegir librería UI                               |
| `ask-sonner`                    | emilkowalski/skill   | Toasts Sonner                                    |
| `design-taste-frontend`         | Leonxlnx/taste-skill | Anti-slop frontend (v2, preferida)               |
| `design-taste-frontend-v1`      | Leonxlnx/taste-skill | Taste v1 (solo si v2 rompe el flujo)             |
| `redesign-existing-projects`    | Leonxlnx/taste-skill | Auditoría/rediseño de UI existente               |
| `high-end-visual-design`        | Leonxlnx/taste-skill | Dirección visual high-end                        |
| `minimalist-ui`                 | Leonxlnx/taste-skill | Dirección minimalista                            |
| `brandkit` / `gpt-taste` / etc. | Leonxlnx/taste-skill | Especializadas (imagen, brand, estilos)          |

Contexto de producto/visual: `PRODUCT.md`, `DESIGN.md` en la raíz (Impeccable).
Informe de auditoría: `docs/qa/UX-DESIGN-AUDIT.md`.

## Cómo invocar

Las skills son auto-descubribles por descripción. También puedes pedirlas por nombre:

- «Usa `gymapure-quality-gate` antes del PR»
- «Aplica `gymapure-security-review` a este diff»
- «Sigue `gymapure-db-ops` para migrar en dev»
- «Corre `gymapure-ux-playwright` tras el cambio de nav»
- «`/impeccable critique` el panel member»
- «Usa `design-taste-frontend` + `emil-design-eng` al pulir esta pantalla»

Docs canónicos: `docs/DESARROLLO.md`, `docs/TESTING.md`, `docs/tecnico/`, `docs/qa/UX-QA.md`.
