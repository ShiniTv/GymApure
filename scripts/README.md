# Scripts

Tooling operativo de GymApure. No contiene lógica de producto (eso vive en `src/`).

| Carpeta     | Propósito                                     |
| ----------- | --------------------------------------------- |
| `dev/`      | Carga de `.env.*`, arranque local, utilidades |
| `db/`       | Migraciones, health, audits, seeds, isolation |
| `test/`     | Smoke, checklists HTTP y dominios activos     |
| `deploy/`   | Preflight, Lighthouse, bundle, secrets        |
| `lib/`      | Helpers compartidos entre scripts             |
| `fixtures/` | Baselines (p. ej. bundle)                     |

Entrada habitual: comandos `npm run …` en `package.json` (prefieren `run-with-env` + `.env.dev`).
