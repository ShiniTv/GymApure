# Documentación — GymApure

Índice de guías del repositorio.

| Documento                                          | Contenido                                                  |
| -------------------------------------------------- | ---------------------------------------------------------- |
| [DESARROLLO.md](./DESARROLLO.md)                   | Instalación, comandos, estructura del repo, flujo dev/prod |
| [DEPLOY.md](./DEPLOY.md)                           | Despliegue en Render y Supabase producción                 |
| [TESTING.md](./TESTING.md)                         | Tests automatizados (API, checklists, CI)                  |
| [UX-QA.md](./UX-QA.md)                             | Flujos UX y pruebas manuales por rol                       |
| [QA-VISUAL-CHECKLIST.md](./QA-VISUAL-CHECKLIST.md) | Checklist visual antes de release                          |

## Estructura del repositorio

| Ruta                   | Propósito                                   |
| ---------------------- | ------------------------------------------- |
| `src/`                 | Frontend React + API Express                |
| `scripts/db/`          | Migraciones, reset, admin, entorno dev/prod |
| `scripts/test/`        | Checklists e integración API                |
| `scripts/deploy/`      | Preflight, Lighthouse, bundle baseline      |
| `scripts/dev/`         | `run-with-env`, utilidades locales          |
| `scripts/lib/`         | Helpers compartidos entre scripts           |
| `scripts/_archive/`    | Scripts legacy (sprints, SQLite)            |
| `supabase/migrations/` | Esquema SQL (fuente de verdad)              |
| `tests/ux/`            | Playwright E2E                              |
| `public/`              | Assets estáticos y PWA                      |
| `docs/`                | Guías operativas                            |

## Entorno dev vs producción

| Entorno             | Supabase ref           | Archivo env                    |
| ------------------- | ---------------------- | ------------------------------ |
| Desarrollo local    | `sqjyxmbtgmiorckigrrg` | `.env.dev`                     |
| Producción (Render) | `ffjwvlcwhyskddqqojnp` | `.env.prod` / variables Render |

Comandos clave:

```powershell
npm run env:configure-dev -- <password>   # tras reset de contraseña en Dashboard dev
npm run db:setup:dev                      # migrar + health + activar .env
npm run db:create-admin:dev               # admin solo en dev
npm run db:verify-isolation               # confirmar que reset local no toca prod
npm run dev                               # servidor local con .env.dev
```
