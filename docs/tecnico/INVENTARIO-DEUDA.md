# Inventario de deuda — ruta ~9.5/10

Snapshot re-eval 2026-07-25. MFA opcional (no es deuda).

## Fase A — GTM / UX

- [x] Pack PWA PNG + screenshots + theme_color
- [x] Landing brand-first (foto + motion)
- [x] Tokens contraste AA + axe staff sin disable color-contrast
- [x] Reservas discovery (Inicio) + chips por día
- [x] Scorecard re-eval

## Fase B — Modular

- [x] Partir MemberRoutine / Messages (composer + measurements)
- [x] Mutations RQ: workout / reception / equipment
- [x] Empezar split `src/api/users/listHelpers.ts`

## Fase C — Calidad

- [x] Vitest dominio (11 archivos)
- [x] Checklists dominio en CI
- [x] CI: pages no importan `lib/server`

## Fase D — Ops

- [x] Script re-encrypt MFA + docs `MFA_ENCRYPTION_KEY`
- [x] Staging / backup / Sentry checklist (`OPS-VERIFY-CHECKLIST.md`)
- [x] QA-DEVICE-10 plantilla de evidencia (cierre en dispositivo físico)

## Pendiente operativo (humano / Render)

- Configurar `MFA_ENCRYPTION_KEY` en Render y correr `security:reencrypt-mfa:prod` si hay secrets legacy
- Completar filas device en `docs/qa/QA-DEVICE-10.md` con evidencia real
- Verificar Sentry DSN + alerta live

## God-files (seguir partiendo en iteraciones)

| Archivo             | Estado                      |
| ------------------- | --------------------------- |
| `Messages.tsx`      | Composer extraído           |
| `MemberRoutine.tsx` | Measurements panel extraído |
| `ActiveWorkout.tsx` | Mutations en hooks          |
| `src/api/users.ts`  | `listHelpers` extraído      |
