# Inventario de deuda — ruta ~9.5/10

Snapshot re-eval 2026-07-25. Auditoría 360° 2026-07-28. MFA opcional (no es deuda).

## Fase A — GTM / UX

- [x] Pack PWA PNG + screenshots + theme_color
- [x] Landing brand-first (foto + motion)
- [x] Tokens contraste AA + axe staff sin disable color-contrast
- [x] Reservas discovery (Inicio) + chips por día — retirado: módulo de clases eliminado
- [x] Scorecard re-eval
- [x] Axe ampliado (payments, check-in kiosk, routines) — 2026-07-28
- [x] Font muerto `@fontsource/plus-jakarta-sans` eliminado

## Fase B — Modular

- [x] Partir MemberRoutine / Messages (composer + measurements)
- [x] Mutations RQ: workout / reception / equipment
- [x] Empezar split `src/api/users/listHelpers.ts`
- [x] **2026-07-28:** MemberRoutine orquestador ~214 líneas; Messages → `pages/messages/*`; `users.ts` ~680
- [x] **2026-07-28 (cont.):** Profile ~154; Equipment ~160; Members ~148; Payments ~114; Settings ~99; ActiveWorkout ~171
- [x] ADRs en `docs/adr/` (001–004)
- [x] `lib/server` re-exports ampliados + middleware auth usa `lib/server`

## Fase C — Calidad

- [x] Vitest dominio (11 archivos)
- [x] Checklists dominio en CI
- [x] CI: pages no importan `lib/server`
- [x] **2026-07-28:** RTL Button/Input (+jsdom); Playwright `workout-deep-flow.spec.ts` + `payments-deep-flow.spec.ts`
- [x] `deploy:release --migrate-prod` exige staging (salvo `--allow-skip-staging`)

## Fase D — Ops

- [x] Script re-encrypt MFA + docs `MFA_ENCRYPTION_KEY`
- [x] Staging / backup / Sentry checklist (`OPS-VERIFY-CHECKLIST.md`)
- [x] QA-DEVICE-10 plantilla de evidencia (cierre en dispositivo físico)
- [x] Staging local PG + migrate/health/smoke (cloud Free limit)
- [x] `MFA_ENCRYPTION_KEY` + `CRON_SECRET` en `.env.prod` local
- [ ] Sentry DSN + alerta live (humano / Render) — ver [SENTRY-Y-ALERTAS.md](./SENTRY-Y-ALERTAS.md)
- [ ] Copiar `MFA_ENCRYPTION_KEY` a Render + re-encrypt si legacy
- [ ] Filas device A4 / I2–I4 con evidencia física — plantilla en [QA-DEVICE-10.md](../qa/QA-DEVICE-10.md)

### Oleada 3 (código, 2026-08-21)

- [x] Índice FK `member_activity_events.routine_id`
- [x] Code-split `sentry` / `virtuoso` + umbral chunk charts/qr
- [x] `EmptyState` sin Card por defecto (`framed={false}`)
- [x] Preflight avisa `VITE_SENTRY_DSN` + `MFA_ENCRYPTION_KEY`
- [ ] Gates humanos Sentry / MFA-on-Render / device A4·I2–I4 (arriba)

## God-files (estado 2026-07-28 cont.)

| Archivo             | Estado                                           |
| ------------------- | ------------------------------------------------ |
| `Messages.tsx`      | Orquestador fino → `pages/messages/*`            |
| `MemberRoutine.tsx` | Orquestador ~214 + paneles/hooks                 |
| `ActiveWorkout.tsx` | ~171 + `useActiveWorkoutPage` + list             |
| `Profile.tsx`       | ~154 → `pages/profile/*`                         |
| `Equipment.tsx`     | ~160 → `pages/equipment/*`                       |
| `Members.tsx`       | ~148 → `pages/members/*`                         |
| `Settings.tsx`      | ~99 → `pages/settings/*`                         |
| `Payments.tsx`      | ~114 → `payments/usePaymentsPage` + toolbar/list |
| `src/api/users.ts`  | ~680 + helpers                                   |
