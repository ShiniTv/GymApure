# Guía de pruebas — GymApure

Este proyecto usa **pruebas de API por HTTP** y **Playwright** (viewport móvil) para UX crítica. El servidor debe estar en marcha salvo que indiques lo contrario.

## Requisitos previos

1. `.env` con `JWT_SECRET`, `DATABASE_URL` y `DEMO_PASSWORD` (mín. 12 caracteres).
2. Base de datos migrada: `npm run db:migrate`
3. Datos demo para la mayoría de suites: `npm run db:restore-demo`
4. Admin de checklist (solo `test:auth-checklist` / `test:e2e`):

   ```powershell
   $env:ADMIN_EMAIL="checklist-admin@test.local"
   $env:ADMIN_PASSWORD="ChecklistAdmin123!"
   $env:ADMIN_FULL_NAME="Checklist Admin"
   npm run db:create-admin
   ```

5. Servidor corriendo en otra terminal:

   ```bash
   npm run dev
   ```

   O deja que `npm run verify:local-e2e` levante el servidor por ti.

---

## Comandos

| Comando                            | Qué valida                                                                   | Servidor   |
| ---------------------------------- | ---------------------------------------------------------------------------- | ---------- |
| `npm run lint`                     | TypeScript strict (`tsc --noEmit`)                                           | No         |
| `npm run build`                    | Build Vite + bundle Express                                                  | No         |
| `npm run test:smoke`               | Health, login, RBAC básico, kiosk eliminado, check-in recepción              | Sí         |
| `npm run test:integration`         | Smoke + sprint 4/5/6 (alertas, pagos, notificaciones)                        | Sí         |
| `npm run test:security-checklist`  | Fases 1–3: sesiones, IDOR trainers, rutinas filtradas                        | Sí         |
| `npm run test:auth-checklist`      | Registro, cambio de contraseña, invalidación JWT                             | Sí         |
| `npm run test:reception-checklist` | Panel recepción, walk-in, lookup                                             | Sí         |
| `npm run test:e2e`                 | **Suite completa CI** (integration + security + auth + reception)            | Sí         |
| `npm run test:ux`                  | UX API: forgot/reset, `workoutsThisWeek`, RBAC admin/member/trainer          | Sí         |
| `npm run test:ux:browser`          | Playwright: 19 specs (mobile iPhone 14 + desktop 1280px + tablet iPad 834px) | Sí         |
| `npm run test:ux:browser:ui`       | Playwright con UI de depuración                                              | Sí         |
| `npm run verify:local-e2e`         | Levanta `dev`, espera `/api/health`, ejecuta `test:e2e`                      | Automático |

### Sprints individuales (debug)

| Comando                         | Enfoque                                |
| ------------------------------- | -------------------------------------- |
| `test:sprint1` … `test:sprint3` | RBAC, trainer, mediciones              |
| `test:sprint4`                  | Alertas de vencimiento                 |
| `test:sprint5`                  | Pagos y membresías                     |
| `test:sprint6`                  | Chat in-app y settings de vencimiento  |
| `test:exchange-rate`            | Tasa BCV: lectura, override, historial |
| `test:trainer-shifts`           | Perfiles entrenador, turnos, filtros   |
| `test:routine-exercises`        | Prescripción por serie en rutinas      |
| `test:alerts`                   | Panel alertas y notificaciones usuario |

Otros checklists opcionales: `test:payments-checklist`, `test:memberships-checkin`, `test:chat-checklist`, `test:classes-checklist`, `test:pagination-contracts`, `test:alerts`, `test:exchange-rate`, `test:trainer-shifts`, `test:routine-exercises`.

`test:security-checklist` incluye **dual login**: segundo login invalida la cookie del primero (`401` en `/api/auth/me`). `test:auth-checklist` verifica que **logout** invalida el token server-side.

### Pruebas UX

| Recurso                       | Descripción                                                                                              |
| ----------------------------- | -------------------------------------------------------------------------------------------------------- |
| [`docs/UX-QA.md`](./UX-QA.md) | Checklist manual por rol/viewport                                                                        |
| `npm run test:ux`             | Automatización API de flujos UX críticos                                                                 |
| `npm run test:ux:browser`     | E2E Playwright (proyectos `mobile`, `desktop`, `tablet`); primera vez: `npx playwright install chromium` |

Verificación UX local recomendada:

```bash
npm run dev   # otra terminal
npm run test:ux
npm run test:ux:browser
```

---

## CI (GitHub Actions)

El workflow [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) ejecuta en cada push/PR:

1. `npm run lint`
2. `npm run build`
3. Lighthouse baseline (no bloqueante)
4. Postgres 16 en servicio → `db:migrate` → `db:restore-demo` → admin checklist
5. `npm start` + `npm run test:e2e` + `npm run test:ux`

Variables de CI relevantes: `DATABASE_URL`, `JWT_SECRET`, `DEMO_PASSWORD`, `ALLOW_PUBLIC_REGISTER=true`.

---

## Verificación local completa (recomendada antes de PR)

```bash
npm run lint
npm run build
npm run db:migrate
npm run db:restore-demo
npm run verify:local-e2e
npm run test:ux
```

Playwright (navegador) no corre en CI por defecto; ejecútalo local antes de release:

```bash
npx playwright install chromium
npm run test:ux:browser
```

En Windows, si `verify:local-e2e` falla al matar procesos, detén `npm run dev` manualmente y ejecuta `npm run test:e2e` con el servidor ya levantado.

---

## Datos demo (`db:restore-demo`)

| Email                  | Rol          | Notas                                             |
| ---------------------- | ------------ | ------------------------------------------------- |
| `admin@gym.com`        | admin        | Stats, settings                                   |
| `receptionist@gym.com` | receptionist | Check-in staff                                    |
| `trainer@gym.com`      | trainer      | Rutinas, IDOR tests                               |
| `member@gym.com`       | member       | Cédula `V-11223344`, rutina demo con 2 ejercicios |

Contraseña de todas: valor de `DEMO_PASSWORD` en `.env`.

---

## Qué cubre `test:security-checklist`

- Endpoints públicos de kiosk (`/api/attendance/check-in|out`) → **401**
- Cabecera `X-Kiosk-Key` ya no autoriza
- Trainer **403** en miembro sin rutina asignada; **200** en miembro con rutina demo
- Trainer solo ve rutinas propias en `GET /api/routines`
- Miembro solo ve rutinas asignadas en `GET /api/routines`
- Cookie invalidada tras cambio de `token_version` (status, contraseña, **login en otro dispositivo**, logout)

---

## Variables útiles

| Variable                                             | Uso                                                |
| ---------------------------------------------------- | -------------------------------------------------- |
| `SMOKE_BASE_URL`                                     | URL del servidor (default `http://localhost:3000`) |
| `DEMO_PASSWORD`                                      | Login cuentas demo                                 |
| `CHECKLIST_ADMIN_EMAIL` / `CHECKLIST_ADMIN_PASSWORD` | Admin para auth checklist                          |

---

## Limitaciones

- Revisión visual completa: [`UX-QA.md`](./UX-QA.md) y [`QA-VISUAL-CHECKLIST.md`](./QA-VISUAL-CHECKLIST.md).
- Playwright cubre flujos móviles críticos, no toda la UI.
- Los tests crean usuarios temporales con emails `@test.local`; no usar en producción.
- Rate limiting en producción puede hacer fallar suites repetidas muy rápido; en CI `NODE_ENV=production` aplica límites reales.
