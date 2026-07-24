# Inventario del repositorio (higiene)

Fecha: **2026-07-24** · Alcance: raíz, docs, scripts, config y artefactos (sin reestructurar `src/`).

## Clasificación

| Etiqueta               | Significado                             |
| ---------------------- | --------------------------------------- |
| `runtime`              | Necesario para arrancar / servir la app |
| `build`                | Necesario para build o types            |
| `desarrollo`           | Scripts, tests, CI, hooks               |
| `documentación-activa` | Fuente de verdad vigente                |
| `histórico`            | Conservado en archivo o `_archive`      |
| `generado-local`       | No versionar; se regenera               |

## Raíz

| Elemento                                                                                           | Clase                      | Notas                                 |
| -------------------------------------------------------------------------------------------------- | -------------------------- | ------------------------------------- |
| `server.ts`, `index.html`, `package.json`, lockfile                                                | `runtime` / `build`        | Entry Express + Vite                  |
| `src/`, `public/`, `supabase/`                                                                     | `runtime`                  | Producto                              |
| `scripts/`, `tests/`, `.github/`, `.husky/`                                                        | `desarrollo`               | Tooling                               |
| `docs/`                                                                                            | `documentación-activa`     | Índice: `docs/README.md`              |
| `archive/`                                                                                         | `histórico`                | Material archivado con trazabilidad   |
| `.env.*.example`                                                                                   | `desarrollo`               | Plantillas versionadas                |
| `.env.dev`, `.env.prod`                                                                            | `generado-local` / secreto | Ignorados; requeridos en máquina      |
| `dist/`, `node_modules/`, `coverage/`, `test-results/`, `playwright-report/`, `uploads/`, `gym.db` | `generado-local`           | Cubiertos por `.gitignore`            |
| `.cursor/skills/`                                                                                  | `desarrollo`               | Skills del proyecto                   |
| Evidencia UX (PNG)                                                                                 | `generado-local`           | `archive/ux-audit-evidence/` ignorada |

## Scripts (`scripts/`)

| Carpeta             | Clase        | Uso                                                       |
| ------------------- | ------------ | --------------------------------------------------------- |
| `dev/`              | `desarrollo` | `run-with-env`, limpieza local                            |
| `db/`               | `desarrollo` | Migraciones, audits, seeds, isolation                     |
| `test/`             | `desarrollo` | Smoke, checklists, dominios activos (incl. ex-sprint 4–6) |
| `deploy/`           | `desarrollo` | Preflight, Lighthouse, secrets                            |
| `lib/`, `fixtures/` | `desarrollo` | Helpers y baselines                                       |
| `_archive/`         | `histórico`  | Sprint 1–3, migrate SQLite, smoke video prod              |

## Documentación (`docs/`)

| Zona                                              | Clase                  |
| ------------------------------------------------- | ---------------------- |
| `manual/`, `modulos/`, `tecnico/`, `qa/`          | `documentación-activa` |
| Guías raíz (`DESARROLLO`, `DEPLOY`, `TESTING`, …) | `documentación-activa` |
| `archive/docs/*`                                  | `histórico`            |

## Comandos de validación post-higiene

```powershell
npm run lint
npm run build
npm run env:check
# Con servidor: npm run test:smoke
```
