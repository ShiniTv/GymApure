---
name: gymapure-quality-gate
description: >-
  Ejecuta el quality gate de GymApure antes de merge o PR: lint (tsc), build,
  tests HTTP por alcance (smoke, e2e, security, pagination, dominio), y preflight
  de deploy si aplica. Usar cuando el usuario pida verificar cambios, readiness
  para merge, CI local, o "está listo el PR".
---

# GymApure — Quality gate

Orden fijo. No saltar pasos sin justificación. Ref: `docs/TESTING.md`.

## Prerrequisitos (suites HTTP)

1. BD migrada: `npm run db:migrate` (o `:dev`)
2. Demo: `npm run db:restore-demo` (solo `.env.dev`)
3. Servidor en marcha: `npm run dev` (salvo `verify:local-e2e`)

## Gate mínimo (siempre)

```
- [ ] npm run lint          # tsc --noEmit
- [ ] npm run build         # si tocó frontend o server bundle
```

## Gate por alcance

| Cambio toca…                   | Correr                                                                    |
| ------------------------------ | ------------------------------------------------------------------------- |
| Cualquier API/auth/RBAC        | `test:smoke` o `test:e2e`                                                 |
| Listas / paginación / `?all=1` | `test:pagination-contracts`                                               |
| Auth, trainers, ownership      | `test:security-checklist` (+ `test:auth-checklist` si login/password/JWT) |
| Recepción / check-in           | `test:reception-checklist`                                                |
| Pagos / membresías             | `test:payments-checklist` o `test:sprint5`                                |
| Tipo de cambio BCV             | `test:exchange-rate`                                                      |
| Chat / notificaciones          | `test:chat-checklist` o `test:sprint6`                                    |
| Rutinas / series               | `test:routine-exercises`                                                  |
| Entrenadores / turnos          | `test:trainer-shifts`                                                     |
| Asistencia / check-in          | `test:memberships-checkin`                                                |
| UX API                         | `test:ux`                                                                 |
| UI / nav / viewports           | Skill `gymapure-ux-playwright`                                            |
| Release / prod config          | `deploy:preflight` o `deploy:preflight:prod`                              |

## Suite completa local (antes de PR)

```powershell
npm run lint
npm run build
npm run db:migrate
npm run db:restore-demo
npm run verify:local-e2e
npm run test:ux
```

Windows: si `verify:local-e2e` falla al matar procesos, detén `dev` manualmente y corre `npm run test:e2e` con el servidor ya levantado.

## `test:e2e` incluye

`test:integration` + `test:security-checklist` + `test:auth-checklist` + `test:reception-checklist`.

## Criterio de done

- Lint (y build si aplica) en verde.
- Suites del alcance del diff en verde.
- Si hay riesgo auth/IDOR: security checklist en verde.
- No reportar "listo" con fallos conocidos sin documentarlos.

## Output al usuario

Resumir: comandos corridos, pass/fail, y qué falta si el alcance es parcial.
